import dns from 'node:dns/promises';

const MAX_BYTES = 150 * 1024;
const FETCH_TIMEOUT_MS = 10_000;
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';
const MIN_TEXT_LENGTH = 100;
const MAX_TEXT_LENGTH = 8_000;

function jsonErr(code, message, status) {
  return new Response(JSON.stringify({ error: code, message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function isPrivateIp(ip) {
  if (ip === '::1' || ip === '0:0:0:0:0:0:0:1') return true;

  const lower = ip.toLowerCase();
  if (lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80')) return true;

  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  const ipv4 = mapped ? mapped[1] : /^\d+\.\d+\.\d+\.\d+$/.test(ip) ? ip : null;
  if (!ipv4) return false;

  const [a, b] = ipv4.split('.').map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

async function validateUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  const host = url.hostname.toLowerCase();

  if (host === 'localhost' || host === '0.0.0.0' || host.endsWith('.local')) return null;

  // Raw IP in URL — check directly without DNS
  if (/^[\d.]+$/.test(host)) {
    return isPrivateIp(host) ? null : url.href;
  }
  if (host.startsWith('[')) {
    const plainIp = host.slice(1, -1);
    return isPrivateIp(plainIp) ? null : url.href;
  }

  try {
    const addrs = await dns.lookup(host, { all: true });
    for (const { address } of addrs) {
      if (isPrivateIp(address)) return null;
    }
  } catch {
    return null;
  }

  return url.href;
}

function extractContent(html) {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  const titleMatch = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : '';

  const metaMatch =
    text.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{1,400})["']/i) ||
    text.match(/<meta[^>]+content=["']([^"']{1,400})["'][^>]+name=["']description["']/i);
  const metaDesc = metaMatch ? metaMatch[1].trim() : '';

  text = text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return { title, metaDesc, body: text };
}

export default async (req) => {
  if (req.method !== 'POST') {
    return jsonErr('METHOD_NOT_ALLOWED', 'Only POST is allowed', 405);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: 'CONFIGURATION_ERROR',
        message: 'ANTHROPIC_API_KEY is not configured',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonErr('INVALID_URL', 'Request body must be valid JSON', 400);
  }

  const rawUrl = String(body?.url ?? '').trim();
  if (!rawUrl) return jsonErr('INVALID_URL', 'A URL is required', 400);

  const safeUrl = await validateUrl(rawUrl);
  if (!safeUrl) return jsonErr('INVALID_URL', 'URL must be a valid public http(s) address', 400);

  // Fetch target URL
  let html;
  let canonicalUrl = safeUrl;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const fetchResp = await fetch(safeUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Devmark/1.0)' },
    });
    clearTimeout(timer);

    canonicalUrl = fetchResp.url || safeUrl;

    if (!fetchResp.ok) {
      return jsonErr('FETCH_FAILED', `Remote server returned ${fetchResp.status}`, 502);
    }

    const contentType = fetchResp.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      return jsonErr('CONTENT_BLOCKED', 'URL does not point to an HTML page', 422);
    }

    const reader = fetchResp.body.getReader();
    const chunks = [];
    let total = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.byteLength;
      if (total >= MAX_BYTES) {
        reader.cancel();
        break;
      }
    }

    const actualTotal = chunks.reduce((s, c) => s + c.byteLength, 0);
    const raw = new Uint8Array(actualTotal);
    let offset = 0;
    for (const chunk of chunks) {
      raw.set(chunk, offset);
      offset += chunk.byteLength;
    }
    html = new TextDecoder().decode(raw);
  } catch (e) {
    if (e.name === 'AbortError') {
      return jsonErr('FETCH_TIMEOUT', 'URL fetch timed out after 10 s', 504);
    }
    return jsonErr('FETCH_FAILED', 'Failed to fetch the URL', 502);
  }

  const { title, metaDesc, body: bodyText } = extractContent(html);

  const content = [title, metaDesc, bodyText]
    .filter(Boolean)
    .join('\n\n')
    .slice(0, MAX_TEXT_LENGTH);

  if (content.length < MIN_TEXT_LENGTH) {
    return jsonErr('NO_CONTENT', 'Not enough readable content found on the page', 422);
  }

  // Call Claude
  let claudeResp;
  try {
    claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 512,
        system: `You are a bookmark metadata extractor. Respond with ONLY a valid JSON object — no markdown, no explanation, nothing else.

Output format:
{"title":"concise page title under 80 chars","summary":"one or two sentence plain-English summary under 200 chars","tags":["tag1","tag2","tag3"]}

Rules:
- title: human-readable, not a URL
- summary: plain text, no markdown
- tags: 2–5 lowercase single-word or hyphenated tags (e.g. "javascript", "machine-learning")
- Output ONLY the JSON object`,
        messages: [
          {
            role: 'user',
            content: `URL: ${canonicalUrl}\n\nPage content:\n${content}`,
          },
        ],
      }),
    });
  } catch {
    return jsonErr('CLAUDE_ERROR', 'Failed to reach Claude API', 502);
  }

  if (!claudeResp.ok) {
    return jsonErr('CLAUDE_ERROR', `Claude API returned ${claudeResp.status}`, 502);
  }

  let claudeData;
  try {
    claudeData = await claudeResp.json();
  } catch {
    return jsonErr('CLAUDE_ERROR', 'Invalid response from Claude API', 502);
  }

  const rawOutput = claudeData?.content?.[0]?.text ?? '';
  const jsonText = rawOutput
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return jsonErr('PARSE_ERROR', 'Claude returned malformed JSON', 502);
  }

  if (!parsed.title || !parsed.summary || !Array.isArray(parsed.tags)) {
    return jsonErr('PARSE_ERROR', 'Claude response missing required fields', 502);
  }

  return new Response(
    JSON.stringify({
      url: canonicalUrl,
      title: String(parsed.title).slice(0, 120),
      summary: String(parsed.summary).slice(0, 300),
      tags: parsed.tags
        .filter((t) => typeof t === 'string')
        .map((t) => t.toLowerCase().trim())
        .filter((t) => t.length > 0 && t.length <= 30)
        .slice(0, 8),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
};
