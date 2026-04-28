export class ApiError extends Error {
  constructor(code, message, status) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

export async function summarize(url) {
  let resp;
  try {
    resp = await fetch('/.netlify/functions/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
  } catch {
    throw new ApiError('FETCH_FAILED', 'Network error — check your connection', 0);
  }

  let data;
  try {
    data = await resp.json();
  } catch {
    throw new ApiError('PARSE_ERROR', 'Unexpected server response', resp.status);
  }

  if (!resp.ok) {
    throw new ApiError(
      data.error ?? 'UNKNOWN',
      data.message ?? 'Something went wrong',
      resp.status,
    );
  }

  return data;
}
