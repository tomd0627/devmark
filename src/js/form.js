import { ApiError, summarize } from './api.js';
import { store } from './store.js';
import { announce, clearFieldError, showFieldError, toast } from './ui.js';
import { generateId, normaliseUrl } from './utils.js';

const ERROR_MESSAGES = {
  INVALID_URL: 'Please enter a valid http(s) URL.',
  FETCH_FAILED: "Could not reach that URL — check it's publicly accessible.",
  FETCH_TIMEOUT: 'The URL took too long to respond (10 s limit).',
  CONTENT_BLOCKED: "That URL doesn't appear to be an HTML page.",
  NO_CONTENT: 'Not enough readable content on that page to summarize.',
  CLAUDE_ERROR: "Claude couldn't process the page. Try again.",
  PARSE_ERROR: 'Got an unexpected response from the server.',
  METHOD_NOT_ALLOWED: 'Internal configuration error. Please refresh.',
  DUPLICATE: 'That URL is already in your bookmarks.',
  STORAGE_FULL: 'Local storage is full. Delete some bookmarks to make room.',
  QUOTA_LIMIT: "You've reached the 500 bookmark limit.",
  DEFAULT: 'Something went wrong. Please try again.',
};

function userMessage(code) {
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES.DEFAULT;
}

function setLoading(btn, on) {
  btn.disabled = on;
  btn.setAttribute('aria-busy', on ? 'true' : 'false');
}

export function initForm(onBookmarkAdded) {
  const form = document.getElementById('add-form');
  const input = document.getElementById('url-input');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldError();

    const raw = input.value.trim();
    if (!raw) {
      showFieldError('Please enter a URL.');
      input.focus();
      return;
    }

    const url = normaliseUrl(raw);

    if (store.hasDuplicate(url)) {
      showFieldError(ERROR_MESSAGES.DUPLICATE);
      return;
    }

    setLoading(submitBtn, true);

    try {
      const data = await summarize(url);

      const bookmark = {
        id: generateId(),
        url: data.url || url,
        title: data.title || url,
        summary: data.summary || '',
        tags: Array.isArray(data.tags) ? data.tags : [],
        createdAt: new Date().toISOString(),
      };

      const result = store.add(bookmark);
      if (!result.ok) {
        if (result.reason === 'DUPLICATE') {
          showFieldError(ERROR_MESSAGES.DUPLICATE);
        } else {
          toast(userMessage(result.reason), 'error');
        }
        return;
      }

      input.value = '';
      onBookmarkAdded(bookmark);
      toast('Bookmark saved!', 'success');
      announce(`Saved: ${bookmark.title}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'INVALID_URL') {
          showFieldError(userMessage(err.code));
        } else {
          toast(userMessage(err.code), 'error');
        }
      } else {
        toast(ERROR_MESSAGES.DEFAULT, 'error');
      }
    } finally {
      setLoading(submitBtn, false);
    }
  });
}
