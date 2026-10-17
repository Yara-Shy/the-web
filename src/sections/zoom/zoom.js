import { IS_MOBILE_DEVICE } from '../../core/capabilities.js';
import { setTags } from '../../core/dom.js';
import { createDemo } from '../../demos/index.js';
import { ATTR, EVENTS } from '../../constants.js';

/**
 * Деталі проєкту живуть в index.html як <template data-project="id"> з полями
 * [data-field="title|subtitle|tags|desc|meta|media"]. Оверлей відкривається
 * подією EVENTS.PROJECT_OPEN з будь-якої секції.
 */
export function mount(overlay) {
  const el = {
    title:    overlay.querySelector('#zoom-title'),
    subtitle: overlay.querySelector('#zoom-subtitle'),
    desc:     overlay.querySelector('#zoom-desc'),
    meta:     overlay.querySelector('#zoom-meta'),
    tags:     overlay.querySelector('#zoom-tags'),
    grid:     overlay.querySelector('#zoom-grid'),
  };
  let videos = [];

  const field = (root, name) => root.querySelector(`[${ATTR.FIELD}="${name}"]`);

  // <dl> → "Role: …\nTools: …\nYear: …" (white-space: pre-line).
  // На мобільній рік уже показано в описі картки — тут він зайвий.
  function metaText(dl) {
    const lines = [];
    dl.querySelectorAll('dt').forEach(dt => {
      const label = dt.textContent.trim();
      if (IS_MOBILE_DEVICE && label === 'Year') return;
      lines.push(`${label}: ${dt.nextElementSibling.textContent.trim()}`);
    });
    return lines.join('\n');
  }

  function open(id) {
    const tpl = document.querySelector(`template[${ATTR.PROJECT}="${id}"]`);
    if (!tpl) return;
    const p = tpl.content;
    const title = field(p, 'title').textContent;

    el.title.textContent    = title;
    el.subtitle.textContent = field(p, 'subtitle').textContent;
    el.desc.textContent     = field(p, 'desc').textContent.trim();
    el.meta.textContent     = metaText(field(p, 'meta'));
    setTags(el.tags, Array.from(field(p, 'tags').children, li => li.textContent));

    videos.forEach(v => v.then(d => d.destroy()));
    const media = Array.from(field(p, 'media').children, node => node.cloneNode(true));
    el.grid.replaceChildren(...media);
    videos = media
      .filter(node => node.tagName === 'VIDEO')
      .map(video => createDemo('video-demo', video, { eager: true }));
    media.filter(node => node.tagName === 'IMG').forEach(img => { img.alt = title; });

    el.grid.classList.toggle('single-image', media.length === 1);
    overlay.classList.add('open');
    overlay.scrollTop = 0;
    document.body.style.overflow = 'hidden';
  }

  function close() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    overlay.scrollTop = 0;
  }

  document.addEventListener(EVENTS.PROJECT_OPEN, e => open(e.detail.id));

  // Клік по маленькому фото/відео — міняємо його місцями з великим.
  el.grid.addEventListener('click', e => {
    const target = e.target.closest('img, video');
    const grid = e.currentTarget;
    if (!target || target === grid.children[0] || grid.classList.contains('single-image')) return;
    grid.insertBefore(target, grid.children[0]);
  });

  overlay.querySelector('#zoom-close').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', e => {
    if (!overlay.classList.contains('open')) return;
    if (e.key === 'Escape') close();
  });
}
