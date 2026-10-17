// Вхідна точка: лише оркестрація — спільний loop, фонове демо, монтування секцій.
import { createLoop } from './scene/loop.js';
import { createDemo } from './demos/index.js';
import { hasWebGL } from './core/capabilities.js';
import { ATTR, FALLBACK } from './constants.js';
import { SITE } from './site.config.js';

// Лише секції з поведінкою; решта (about, impressum, footer) — чистий CSS.
const SECTIONS = {
  'loader':    () => import('./sections/loader/loader.js'),
  'cursor':    () => import('./sections/cursor/cursor.js'),
  'nav':       () => import('./sections/nav/nav.js'),
  'home':      () => import('./sections/home/home.js'),
  'work':      () => import('./sections/work/work.js'),
  'more-work': () => import('./sections/more-work/more-work.js'),
  'contact':   () => import('./sections/contact/contact.js'),
  'zoom':      () => import('./sections/zoom/zoom.js'),
};

async function mountBackground(canvas, loop) {
  if (!SITE.background.enabled) return createDemo('static', canvas, { reason: FALLBACK.DISABLED });
  if (!hasWebGL())              return createDemo('static', canvas, { reason: FALLBACK.NO_WEBGL });
  try {
    return await createDemo(SITE.background.kind, canvas, { loop });
  } catch (err) {
    console.error('Background demo failed, showing poster instead:', err);
    return createDemo('static', canvas, { reason: FALLBACK.ERROR });
  }
}

const loop = createLoop();
const background = mountBackground(document.getElementById('bg-canvas'), loop);

for (const el of document.querySelectorAll(`[${ATTR.SECTION}]`)) {
  if (el.hidden) continue;
  const load = SECTIONS[el.getAttribute(ATTR.SECTION)];
  if (load) load().then(({ mount }) => mount(el, { loop, background }));
}

loop.start();
