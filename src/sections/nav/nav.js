import { IS_MOBILE_DEVICE, DESKTOP_IS_LOW_END } from '../../core/capabilities.js';
import { EVENTS, FRAME_ORDER } from '../../constants.js';
import { SITE } from '../../site.config.js';

/* ─────────────────────────────────────────────
   HEADER CONTRAST COLOR
   Замість mix-blend-mode:difference — реально семплимо колір сцени
   позаду .logo/.nav-links (gl.readPixels) і перемикаємо колір тексту
   між --c2 (за замовчуванням над "кольоровим" фоном) і --c1 (коли той
   фон сам синьо-блакитний, щоб не зливався). readPixels форсує GPU sync,
   тож не робимо цього щокадру — лише раз на кілька кадрів.
   Мобільний скрол стрибав навіть після зниження частоти семплів —
   пріоритет плавний скрол, тож на мобільних і слабких десктопах ефект вимкнено.
   ───────────────────────────────────────────── */
function applyHeaderContrast(el, background) {
  const c = background.sampleColor(el);
  if (!c) return;
  const [r, g, b] = c;
  const brightness = (r + g + b) / 3;
  if (brightness < 40) {
    el.style.color = '';
    return;
  }
  // Білий/нейтральний фон (r≈g≈b) мав раніше хибно потрапляти в "синій"
  // через незначну перевагу b (згладжування/bloom) — тепер рожевий лише коли
  // синій справді помітно домінує, а не ледь-ледь. Білий і решта → блакитний.
  const isStronglyBlue = b > r + 25 && b > g + 10;
  el.style.color = isStronglyBlue ? 'var(--c1)' : 'var(--c2)';
}

export function mount(nav, { loop, background }) {
  document.addEventListener(EVENTS.HERO_REVEAL, () => nav.classList.add('show'));
  document.addEventListener(EVENTS.HERO_HIDE,   () => nav.classList.remove('show'));

  const { enabled, everyNthFrame } = SITE.headerContrast;
  if (!enabled || DESKTOP_IS_LOW_END || IS_MOBILE_DEVICE) return;

  const targets = [nav.querySelector('.logo'), nav.querySelector('.nav-links')].filter(Boolean);
  background.then(bg => {
    let frame = 0;
    loop.add(() => {
      if (++frame % everyNthFrame !== 0) return;
      targets.forEach(el => applyHeaderContrast(el, bg));
    }, FRAME_ORDER.AFTER_RENDER);
  });
}
