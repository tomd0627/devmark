import { qs } from './utils.js';

const TOAST_DURATION = 4000;

function makeSvgUse(iconId) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.className = 'toast__icon';
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#icon-${iconId}`);
  svg.appendChild(use);
  return svg;
}

const TOAST_ICONS = { success: 'check', error: 'alert', info: 'bookmark' };

export function toast(message, type = 'info') {
  const region = qs('#toast-region');
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.setAttribute('role', 'status');
  el.appendChild(makeSvgUse(TOAST_ICONS[type] ?? 'bookmark'));

  const msg = document.createElement('p');
  msg.className = 'toast__message';
  msg.textContent = message;
  el.appendChild(msg);

  region.appendChild(el);

  setTimeout(() => {
    el.classList.add('is-leaving');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, TOAST_DURATION);
}

export function announce(message) {
  const announcer = qs('#announcer');
  announcer.textContent = '';
  requestAnimationFrame(() => {
    announcer.textContent = message;
  });
}

export function showFieldError(message) {
  qs('#url-input').classList.add('has-error');
  qs('#url-error').textContent = message;
}

export function clearFieldError() {
  qs('#url-input').classList.remove('has-error');
  qs('#url-error').textContent = '';
}

let _resolveDialog = null;

export function initDialog() {
  const dialog = qs('#confirm-dialog');

  qs('#dialog-cancel').addEventListener('click', () => {
    dialog.close();
    _resolveDialog?.(false);
    _resolveDialog = null;
  });

  qs('#dialog-confirm').addEventListener('click', () => {
    dialog.close();
    _resolveDialog?.(true);
    _resolveDialog = null;
  });

  dialog.addEventListener('cancel', () => {
    _resolveDialog?.(false);
    _resolveDialog = null;
  });

  // Focus trap
  dialog.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusable = [
      ...dialog.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])'),
    ];
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
}

export function confirmDelete(title) {
  const dialog = qs('#confirm-dialog');
  qs('#dialog-desc').textContent =
    `"${title}" will be permanently removed. This action cannot be undone.`;
  dialog.showModal();
  qs('#dialog-cancel').focus();
  return new Promise((resolve) => {
    _resolveDialog = resolve;
  });
}
