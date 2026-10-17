import { IS_MOBILE_DEVICE } from '../../core/capabilities.js';
import { cacheRect, getCachedRect, stableViewportHeight, lockScrollBriefly } from '../../core/dom.js';
import { lerp, easeInOutQuad } from '../../core/math.js';
import { EVENTS, FRAME_ORDER } from '../../constants.js';
import { SITE } from '../../site.config.js';

const CAM = SITE.particleSphere.camera;
const HERO_SHOW_AT = 0.62;
const HERO_HIDE_AT = 0.48;

/* ─────────────────────────────────────────────
   Хореографія першого екрана: скрол через #s-home-wrapper наближає камеру
   до сфери, на HERO_SHOW_AT з'являється hero і вибухають кільця, далі
   камера пірнає в спіраль (#spiral). Стан скролу читається раз за кадр
   і передається фоновому демо (ріст/зникнення сфери).
   ───────────────────────────────────────────── */
export function mount(wrapper, { loop, background }) {
  const isMobile = IS_MOBILE_DEVICE;
  const heroEl = document.getElementById('s-home');
  const spiralEl = document.getElementById('spiral');
  const scrollCue = document.getElementById('scroll-cue');
  const reveals = wrapper.querySelectorAll('.hero-reveal');

  const scrollState = {
    wrapP:      0,  // progress всередині s-home-wrapper
    spiralP:    0,  // progress всередині spiral section
    spiralIn:   false,
    spiralDone: false,
    scrollY:    0,
  };

  let bg = null;
  background.then(demo => {
    bg = demo;
    bg.setScrollState(scrollState);
  });

  // На мобільних hero показується одразу (без наближення сфери й вибуху),
  // і камера стартує вже в позиції "перед спіраллю" (SPIRAL_Z).
  let camTargetZ = isMobile ? CAM.SPIRAL_Z : CAM.FAR_Z;
  let camTargetX = isMobile ? CAM.X_MOBILE : 0;
  let introReady = false;
  // heroRevealed реактивний — відображає поточний стан, а не "чи спрацював колись"
  let scrollCueGone = false, heroRevealed = isMobile, explosionFired = isMobile;
  let lastExplosionAt = -10;

  function setHeroVisible(show) {
    reveals.forEach(el => el.classList.toggle('show', show));
    document.dispatchEvent(new CustomEvent(show ? EVENTS.HERO_REVEAL : EVENTS.HERO_HIDE));
  }

  document.addEventListener(EVENTS.INTRO_READY, () => {
    setTimeout(() => scrollCue.classList.add('show'), 600);
    introReady = true;
    // Кешуємо rect'и після того як loader зник
    cacheRect(wrapper);
    cacheRect(heroEl);
    cacheRect(spiralEl);
    // На мобільних одразу показуємо hero — пропускаємо наближення
    // сфери й вибух на самому початку скролу.
    if (isMobile) setHeroVisible(true);
  }, { once: true });

  function updateScrollState() {
    const vh = stableViewportHeight();
    scrollState.scrollY = window.scrollY;

    // Хід sticky-hero = висота wrapper мінус висота самого hero (100svh), а не
    // мінус innerHeight: той стрибає з адресним рядком, і на короткому мобільному
    // wrapper (112svh) wrapP біля верху сторінки скакав майже вдвічі — сфера смикалась.
    const wrapRect   = getCachedRect(wrapper);
    const wrapScroll = wrapRect.height - getCachedRect(heroEl).height;
    scrollState.wrapP = wrapScroll > 0
      ? Math.max(0, Math.min(1, -wrapRect.top / wrapScroll))
      : 0;

    const spiralRect   = getCachedRect(spiralEl);
    const spiralScroll = spiralRect.height - vh;
    scrollState.spiralP = spiralScroll > 0
      ? Math.max(0, Math.min(1, -spiralRect.top / spiralScroll))
      : 0;

    scrollState.spiralIn = spiralRect.top < vh
      && spiralRect.bottom > 0
      && scrollState.spiralP > .01
      && scrollState.spiralP < .99;
    scrollState.spiralDone = spiralRect.bottom <= 0 || scrollState.spiralP >= .99;
  }

  function computeCameraTarget(t) {
    if (!introReady) return;
    const { wrapP, spiralP, spiralIn, spiralDone, scrollY } = scrollState;

    if (scrollY > 10 && !scrollCueGone) {
      scrollCueGone = true;
      scrollCue.classList.add('gone');
    }

    // Показ hero перевіряємо ПЕРШИМ, ще до spiralDone/spiralIn — інакше
    // швидкий проскрол (флік колесом/трекпадом) міг би за один рух пролетіти
    // повз #s-home-wrapper одразу в spiral, і hero ніколи б не показався.
    if (!isMobile && !heroRevealed && wrapP >= HERO_SHOW_AT) {
      const rect = wrapper.getBoundingClientRect();
      const wrapScrollTotal = rect.height - heroEl.offsetHeight;
      if (wrapScrollTotal > 0) {
        // Якщо скрол проскочив далі за момент появи hero (швидкий флік) —
        // повертаємо користувача рівно на цю позицію.
        const wrapperAbsoluteTop = window.scrollY + rect.top;
        window.scrollTo({ top: wrapperAbsoluteTop + HERO_SHOW_AT * wrapScrollTotal, behavior: 'instant' });
        cacheRect(wrapper);
      }

      heroRevealed = true;
      setHeroVisible(true);

      if (!explosionFired && (t - lastExplosionAt > 1.2)) {
        explosionFired  = true;
        lastExplosionAt = t;
        bg?.explode(t);
        // Коротка пауза скролу — щоб цей момент не можна було проскролити,
        // не помітивши (тільки десктоп, бо тут єдине місце, де ще є вибух).
        lockScrollBriefly(1200);
      }
      return; // цей кадр — лише корекція позиції, решту порахуємо наступного разу
    }

    if (spiralDone) {
      camTargetZ = CAM.FAR_Z;
      camTargetX = 0;
      return;
    }

    if (spiralIn) {
      camTargetZ = CAM.SPIRAL_Z;
      const centerE = easeInOutQuad(Math.min(spiralP / 0.25, 1));
      // isMobile: узгоджено з початковим зсувом X_MOBILE, щоб не було стрибка
      // camTargetX на межі входу в спіраль.
      camTargetX = (isMobile ? CAM.X_MOBILE : CAM.X_HERO) * (1 - centerE);
      return;
    }

    if (isMobile) {
      // Мобільна версія: hero вже розкритий і камера вже в позиції "перед
      // спіраллю" з першого кадру — жодної анімації наближення чи preZoom,
      // #s-home-wrapper слугує лише коротким статичним буфером скролу.
      camTargetZ = CAM.SPIRAL_Z;
      camTargetX = CAM.X_MOBILE;
      return;
    }

    // ФАЗА 1
    const e = easeInOutQuad(Math.min(wrapP / 0.35, 1));
    camTargetZ = CAM.FAR_Z + (CAM.NEAR_Z - CAM.FAR_Z) * e;
    camTargetX = CAM.X_HERO * e;

    // Ховаємо hero лише при поверненні вгору нижче hideAt (показ обробляється вище)
    if (heroRevealed && wrapP < HERO_HIDE_AT) {
      heroRevealed = false;
      setHeroVisible(false);
      // Скидаємо explosionFired, щоб при наступному скролі вниз вибух спрацював знову
      explosionFired = false;
    }

    // preZoom — між hero і spiral
    if (wrapP > 0.75) {
      const preZoomE = easeInOutQuad(Math.min((wrapP - 0.75) / 0.25, 1));
      camTargetZ = lerp(CAM.NEAR_Z, CAM.SPIRAL_Z, preZoomE);
    }
  }

  // Стан виводимо в rAF, а не в scroll-listener — так переходи камери/hero стабільні.
  loop.add(t => {
    updateScrollState();
    computeCameraTarget(t);
    bg?.setCameraTarget(camTargetZ, camTargetX);
  }, FRAME_ORDER.SCROLL);
}
