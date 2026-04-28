import { formatDate, qs, qsa } from './utils.js';

let currentFilter = '';

function makeSvgUse(iconId, width = 16, height = 16) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#icon-${iconId}`);
  svg.appendChild(use);
  return svg;
}

function buildFavicon(url) {
  const img = document.createElement('img');
  img.className = 'bookmark-card__favicon';
  img.width = 18;
  img.height = 18;
  img.alt = '';
  img.setAttribute('aria-hidden', 'true');
  try {
    img.src = `${new URL(url).origin}/favicon.ico`;
  } catch {
    img.src = '/public/favicon.svg';
  }
  img.addEventListener(
    'error',
    () => {
      img.src = '/public/favicon.svg';
    },
    { once: true },
  );
  return img;
}

function buildActionBtn(iconId, label, extraClass, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = extraClass ? `btn-icon-only ${extraClass}` : 'btn-icon-only';
  btn.setAttribute('aria-label', label);
  btn.appendChild(makeSvgUse(iconId));
  btn.addEventListener('click', onClick);
  return btn;
}

export function buildCard(bookmark, { onDelete, onTagClick }) {
  const article = document.createElement('article');
  article.className = 'bookmark-card';
  article.dataset.id = bookmark.id;

  // Header: favicon + title + actions
  const header = document.createElement('div');
  header.className = 'bookmark-card__header';

  header.appendChild(buildFavicon(bookmark.url));

  const titleLink = document.createElement('a');
  titleLink.className = 'bookmark-card__title-link';
  titleLink.href = bookmark.url;
  titleLink.target = '_blank';
  titleLink.rel = 'noopener noreferrer';
  titleLink.textContent = bookmark.title;
  header.appendChild(titleLink);

  const actions = document.createElement('div');
  actions.className = 'bookmark-card__actions';
  actions.appendChild(
    buildActionBtn('copy', 'Copy URL', '', () => {
      navigator.clipboard.writeText(bookmark.url).catch(() => {});
    }),
  );
  actions.appendChild(
    buildActionBtn('trash', 'Delete bookmark', 'btn-icon-only--danger', () => {
      onDelete(bookmark.id, bookmark.title);
    }),
  );
  header.appendChild(actions);
  article.appendChild(header);

  // Hostname in mono
  const urlEl = document.createElement('p');
  urlEl.className = 'bookmark-card__url';
  try {
    urlEl.textContent = new URL(bookmark.url).hostname;
  } catch {
    urlEl.textContent = bookmark.url;
  }
  article.appendChild(urlEl);

  // Summary
  const summaryEl = document.createElement('p');
  summaryEl.className = 'bookmark-card__summary';
  summaryEl.textContent = bookmark.summary;
  article.appendChild(summaryEl);

  // Footer: tags + date
  const footer = document.createElement('div');
  footer.className = 'bookmark-card__footer';

  const tagsEl = document.createElement('div');
  tagsEl.className = 'bookmark-card__tags';
  for (const tag of bookmark.tags) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'tag-chip';
    chip.textContent = tag;
    chip.setAttribute('aria-label', `Filter by tag: ${tag}`);
    chip.addEventListener('click', () => onTagClick(tag));
    tagsEl.appendChild(chip);
  }
  footer.appendChild(tagsEl);

  const dateEl = document.createElement('time');
  dateEl.className = 'bookmark-card__date';
  dateEl.dateTime = bookmark.createdAt;
  dateEl.textContent = formatDate(bookmark.createdAt);
  footer.appendChild(dateEl);

  article.appendChild(footer);
  return article;
}

export function renderAll(bookmarks, handlers) {
  const list = qs('#bookmark-list');
  const emptyState = qs('#empty-state');

  for (const el of qsa('.bookmark-card', list)) el.remove();

  const visible = currentFilter
    ? bookmarks.filter((b) => b.tags.includes(currentFilter))
    : bookmarks;

  emptyState.hidden = visible.length > 0;

  for (const bookmark of visible) {
    list.appendChild(buildCard(bookmark, handlers));
  }
}

export function prependCard(bookmark, handlers) {
  const list = qs('#bookmark-list');
  qs('#empty-state').hidden = true;
  list.prepend(buildCard(bookmark, handlers));
}

export function removeCard(id) {
  qs(`[data-id="${id}"]`)?.remove();
  const list = qs('#bookmark-list');
  qs('#empty-state').hidden = list.querySelector('.bookmark-card') !== null;
}

export function setFilter(tag) {
  currentFilter = tag;
}
