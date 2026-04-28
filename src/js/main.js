import { removeCard, renderAll, setFilter } from './bookmarks.js';
import { initForm } from './form.js';
import { store } from './store.js';
import { renderTags, setActive } from './tags.js';
import { announce, confirmDelete, initDialog, toast } from './ui.js';
import { qs } from './utils.js';

async function injectSprite() {
  try {
    const resp = await fetch('/public/icons/sprite.svg');
    const text = await resp.text();
    const container = document.createElement('div');
    container.setAttribute('aria-hidden', 'true');
    container.style.display = 'none';
    container.innerHTML = text;
    document.body.prepend(container);
  } catch {
    // Icons degrade silently — content still readable without them
  }
}

function handlers() {
  return { onDelete: handleDelete, onTagClick: handleTagClick };
}

async function handleDelete(id, title) {
  const confirmed = await confirmDelete(title);
  if (!confirmed) return;

  store.remove(id);
  removeCard(id);

  const all = store.getAll();
  renderTags(all, handleTagClick);

  announce(`Deleted: ${title}`);
  toast('Bookmark deleted', 'info');
}

function handleTagClick(tag) {
  setFilter(tag);
  setActive(tag);
  renderAll(store.getAll(), handlers());

  announce(tag ? `Showing bookmarks tagged "${tag}"` : 'Showing all bookmarks');
}

function init() {
  injectSprite();
  initDialog();

  const all = store.getAll();
  renderAll(all, handlers());
  renderTags(all, handleTagClick);

  initForm((bookmark) => {
    setFilter('');
    setActive('');
    const updated = store.getAll();
    renderAll(updated, handlers());
    renderTags(updated, handleTagClick);
    // Move focus to the newly added card for accessibility
    qs(`[data-id="${bookmark.id}"] a`)?.focus();
  });
}

document.addEventListener('DOMContentLoaded', init);
