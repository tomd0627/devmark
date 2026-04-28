import { qs, qsa } from './utils.js';

let activeTag = '';

function buildSidebarItem(tag, count, isAll, onClick) {
  const li = document.createElement('li');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'tag-list__btn';
  btn.dataset.tag = tag;

  const nameSpan = document.createElement('span');
  nameSpan.className = 'tag-list__name';
  nameSpan.textContent = isAll ? 'All bookmarks' : tag;
  btn.appendChild(nameSpan);

  const countSpan = document.createElement('span');
  countSpan.className = 'tag-list__count';
  countSpan.textContent = String(count);
  countSpan.setAttribute('aria-label', `${count} bookmarks`);
  if (isAll) countSpan.id = 'tag-count-all';
  btn.appendChild(countSpan);

  btn.addEventListener('click', () => onClick(tag));
  li.appendChild(btn);
  return li;
}

function buildMobileChip(tag, isAll, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'tag-chip';
  btn.dataset.tag = tag;
  btn.textContent = isAll ? 'All' : tag;
  btn.addEventListener('click', () => onClick(tag));
  return btn;
}

export function renderTags(bookmarks, onTagClick) {
  const tagList = qs('#tag-list');
  const mobileCloud = qs('#tag-cloud-mobile');

  const counts = new Map();
  for (const b of bookmarks) {
    for (const t of b.tags) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const sidebarItems = [buildSidebarItem('', bookmarks.length, true, onTagClick)];
  const mobileItems = [buildMobileChip('', true, onTagClick)];

  for (const [tag, count] of sorted) {
    sidebarItems.push(buildSidebarItem(tag, count, false, onTagClick));
    mobileItems.push(buildMobileChip(tag, false, onTagClick));
  }

  tagList.replaceChildren(...sidebarItems);
  mobileCloud.replaceChildren(...mobileItems);
  mobileCloud.hidden = bookmarks.length === 0;

  setActive(activeTag);
}

export function setActive(tag) {
  activeTag = tag;

  for (const btn of qsa('#tag-list .tag-list__btn')) {
    const isActive = btn.dataset.tag === tag;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-current', isActive ? 'true' : 'false');
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  }

  for (const btn of qsa('#tag-cloud-mobile .tag-chip')) {
    btn.classList.toggle('is-active', btn.dataset.tag === tag);
  }
}
