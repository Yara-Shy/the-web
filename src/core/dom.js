/* ─────────────────────────────────────────────
   DOM RECT CACHE
   Замість виклику getBoundingClientRect() кожен кадр —
   кешуємо через scroll + resize і оновлюємо тільки тоді,
   коли DOM дійсно змінився.
   ───────────────────────────────────────────── */
const rectCache = new Map();

export function cacheRect(el) {
  if (!el) return;
  rectCache.set(el, el.getBoundingClientRect());
}

export function getCachedRect(el) {
  return rectCache.get(el) || el.getBoundingClientRect();
}

function refreshRects() {
  for (const el of rectCache.keys()) {
    rectCache.set(el, el.getBoundingClientRect());
  }
}

// 'scroll' може стріляти набагато частіше за кадри (особливо інерційний
// скрол на мобільних) — синхронний getBoundingClientRect на кожній такій
// події форсує layout частіше, ніж потрібно, і це сам по собі глючить скрол.
// RAF-троттлимо: максимум одне реальне оновлення за кадр.
let rectsRefreshPending = false;
function scheduleRefreshRects() {
  if (rectsRefreshPending) return;
  rectsRefreshPending = true;
  requestAnimationFrame(() => {
    rectsRefreshPending = false;
    refreshRects();
  });
}
window.addEventListener('scroll',  scheduleRefreshRects, { passive: true });
window.addEventListener('resize',  scheduleRefreshRects, { passive: true });


/** Замінює вміст контейнера на теги <span class="meta-tag">. */
export function setTags(container, labels) {
  container.replaceChildren(...labels.map(text => {
    const tag = document.createElement('span');
    tag.className = 'meta-tag';
    tag.textContent = text;
    return tag;
  }));
}


/* ─────────────────────────────────────────────
   POINTER — реальні координати миші, одне джерело для курсора й спіралі
   ───────────────────────────────────────────── */
export const pointer = { x: 0, y: 0 };

document.addEventListener('mousemove', e => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
}, { passive: true });


/* ─────────────────────────────────────────────
   STABLE VIEWPORT HEIGHT (для розрахунків прогресу скролу в JS)
   Мобільні браузери реально змінюють innerHeight, коли ховається/показується
   адресний рядок. CSS від цього захищений одиницями svh (home.css), а JS
   рахує прогрес через stableVh, яка оновлюється лише за порогом нижче.
   ───────────────────────────────────────────── */
let stableVh = window.innerHeight;

export const stableViewportHeight = () => stableVh;

/**
 * Розмір під фонову сцену: висота — найбільша з можливих (lvh, адресний рядок
 * схований), щоб згортання/розгортання рядка не вимагало ресайзу WebGL-буферів.
 */
const lvhProbe = document.createElement('div');
lvhProbe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100vh;height:100lvh;visibility:hidden;pointer-events:none';
document.documentElement.appendChild(lvhProbe);

export const sceneViewportSize = () => ({
  width:  window.innerWidth,
  height: Math.max(window.innerHeight, lvhProbe.offsetHeight),
});

function updateStableViewportHeight(force = false) {
  const next = window.innerHeight;
  // Mobile browser chrome (адресний рядок) ховається/показується залежно
  // від напрямку скролу — це не одноразова подія, а може повторюватись щоразу,
  // як юзер скролить вгору-вниз біля hero. Реальна зміна innerHeight від
  // цього зазвичай ~50-100px. Поріг мав бути 120px "щоб не було зайвого
  // тремтіння", але через це майже НІКОЛИ не спрацьовував на реальні зміни
  // chrome — а короткий мобільний #s-home-wrapper (112vh) має лише ~12vh
  // (85-95px) запасу скролу, тож stableVh, застрягла на 50-100px, перекручує
  // wrapP майже повністю. Поріг знижено, щоб реальні зміни ловились щоразу.
  if (force || Math.abs(next - stableVh) > 24) {
    stableVh = next;
  }
}

window.addEventListener('resize', () => updateStableViewportHeight(false), { passive: true });
window.addEventListener('orientationchange', () => updateStableViewportHeight(true), { passive: true });
// Також перевіряємо на scroll — chrome ховається/показується залежно від
// напрямку скролу, тож це має перевірятись на кожному скролі, не лише раз.
window.addEventListener('scroll', () => updateStableViewportHeight(false), { passive: true });


/* ─────────────────────────────────────────────
   SCROLL LOCK  —  коротке "заморожування" скролу
   ───────────────────────────────────────────── */
let scrollLockActive = false;

export function lockScrollBriefly(durationMs) {
  if (scrollLockActive) return;
  scrollLockActive = true;

  // overflow:hidden робить сторінку взагалі нескролюваною — на відміну від
  // preventDefault на wheel/touchmove, це зупиняє й інерційний доскрол
  // (момент, коли трекпад/миша вже "відпущені", але браузер/ОС самі
  // доскролюють far за фізикою фліку — тут немає нових wheel-подій,
  // тож preventDefault нічого не перехоплює).
  const htmlEl = document.documentElement;
  const prevOverflow = htmlEl.style.overflow;

  htmlEl.style.overflow = 'hidden';

  setTimeout(() => {
    htmlEl.style.overflow = prevOverflow;
    scrollLockActive = false;
  }, durationMs);
}
