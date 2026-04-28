const STORAGE_KEY = 'devmark_bookmarks';
const MAX_BOOKMARKS = 500;

function readRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRaw(bookmarks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
    return true;
  } catch (e) {
    if (e.name === 'QuotaExceededError') return false;
    throw e;
  }
}

export const store = {
  getAll() {
    return readRaw();
  },

  add(bookmark) {
    const bookmarks = readRaw();
    if (bookmarks.length >= MAX_BOOKMARKS) {
      return { ok: false, reason: 'QUOTA_LIMIT' };
    }
    if (bookmarks.some((b) => b.url === bookmark.url)) {
      return { ok: false, reason: 'DUPLICATE' };
    }
    const ok = writeRaw([bookmark, ...bookmarks]);
    return ok ? { ok: true } : { ok: false, reason: 'STORAGE_FULL' };
  },

  remove(id) {
    const bookmarks = readRaw();
    const next = bookmarks.filter((b) => b.id !== id);
    if (next.length === bookmarks.length) return false;
    writeRaw(next);
    return true;
  },

  hasDuplicate(url) {
    return readRaw().some((b) => b.url === url);
  },
};
