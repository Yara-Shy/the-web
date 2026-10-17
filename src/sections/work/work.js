import { IS_MOBILE_DEVICE } from '../../core/capabilities.js';
import { cacheRect, pointer, setTags } from '../../core/dom.js';
import { lerp, lerpDt } from '../../core/math.js';
import { createDemo } from '../../demos/index.js';
import { ATTR, EVENTS, FRAME_ORDER } from '../../constants.js';
import { SITE } from '../../site.config.js';

const S = SITE.spiral;
const openProject = id => document.dispatchEvent(new CustomEvent(EVENTS.PROJECT_OPEN, { detail: { id } }));

export function mount(work, { loop }) {
  const section = work.querySelector('#spiral');
  const track   = section.querySelector('#spiralTrack');
  const cards   = Array.from(section.querySelectorAll('.card'));
  const photos  = Array.from(section.querySelectorAll('.card-photo'));

  section.querySelectorAll('.card-photo video').forEach(video => createDemo('video-demo', video));

  // На мобільній замість тегів на картках показуємо роль (у тому ж
  // тег-стилі, на тому ж місці).
  if (IS_MOBILE_DEVICE) {
    cards.forEach(card => {
      const tagsEl = card.querySelector('.meta-tags');
      const role = card.getAttribute(ATTR.ROLE);
      if (tagsEl) setTags(tagsEl, role ? [role] : []);
    });
  }

  if (IS_MOBILE_DEVICE) {
    // Лінійний список: медіа переїжджає всередину своєї картки, без 3D.
    track.classList.add('linear-list');
    cards.forEach((card, i) => {
      const media = photos[i];
      if (media && media.parentElement !== card) card.prepend(media);
    });
  } else {
    loop.add(createSpiral(section, cards, photos), FRAME_ORDER.SPIRAL);
  }

  bindOpenHandlers(section, track, cards);
}

/* ─────────────────────────────────────────────
   3D-спіраль карток (лише десктоп).
   Значення S фіксовані, щоб resize вікна без перезавантаження не міг
   наполовину перемкнути геометрію спіралі (клас .linear-list все одно
   не додається без reload).
   zOffset = -R, щоб максимальний z фронтальної картки був 0 — інакше
   CSS-перспектива магнітить картку понад її задекларований розмір,
   і вона обрізається зверху/знизу на низьких вьюпортах.
   ───────────────────────────────────────────── */
function createSpiral(section, cards, photos) {
  const N = cards.length;
  let camX = 0, camY = 0, scrollT = 0;
  const hoverScale  = new Array(N).fill(1);
  const smoothHover = new Array(N).fill(1);
  cards.forEach((card, i) => {
    card.addEventListener('mouseenter', () => { hoverScale[i] = 1.06; card.classList.add('is-hovered'); });
    card.addEventListener('mouseleave', () => { hoverScale[i] = 1; card.classList.remove('is-hovered'); });
  });
  // Пишемо в DOM лише при реальній зміні — постійний перезапис transform
  // на елементі з will-change:transform зайве навантажує compositor.
  const last = {
    tf: new Array(N).fill(''), filt: new Array(N).fill(''), opacity: new Array(N).fill(''), zIdx: new Array(N).fill(null),
    photoTf: new Array(N).fill(''), photoFilt: new Array(N).fill(''), photoOpacity: new Array(N).fill(''), photoZIdx: new Array(N).fill(null),
  };

  function getRawProgress() {
    const rect       = section.getBoundingClientRect();
    const scrollable = rect.height - window.innerHeight;
    return scrollable <= 0 ? 0 : Math.max(0, Math.min(1, -rect.top / scrollable));
  }

  cacheRect(section);
  let rawT = getRawProgress();
  window.addEventListener('scroll', () => { rawT = getRawProgress(); }, { passive: true });
  window.addEventListener('resize', () => { rawT = getRawProgress(); }, { passive: true });

  function computePoses(progress) {
    const step = (Math.PI*2) / N;
    const phase = Math.PI/2 + progress * (N-1) * step;
    return cards.map((_, i) => {
      const a = phase - i * step;
      return { a, x: Math.cos(a)*S.R, y: -a*S.pitch, z: Math.sin(a)*S.R + S.zOffset, facing: (Math.sin(a)+1)/2 };
    });
  }

  return function tick(t, dt) {
    // FPS-нормалізований lerp для плавного scroll
    scrollT = lerpDt(scrollT, rawT, S.scrollLerp, dt);
    const poses = computePoses(scrollT);

    let sumW = 0, tX = 0, tY = 0;
    poses.forEach(p => {
      const w = Math.pow(Math.max(0, p.facing), S.focusSharpness);
      sumW += w; tX += p.x * w; tY += p.y * w;
    });
    if (sumW > 0) { tX /= sumW; tY /= sumW; }

    // FPS-нормалізований lerp для камери spiral
    camX = lerpDt(camX, -tX, S.cameraLerp, dt);
    camY = lerpDt(camY, -tY, S.cameraLerp, dt);

    poses.forEach(({ a, x, y, z, facing }, i) => {
      const x2   = x + camX, y2 = y + camY;
      const yaw  = Math.cos(a) * -S.faceStrength;
      const isBack = facing < S.backThreshold;
      const blur = isBack
        ? lerp(2, S.backBlurMax, (S.backThreshold - facing) / S.backThreshold)
        : 0;
      const opacity = isBack
        ? lerp(S.backOpacityMin, .55, facing / S.backThreshold)
        : lerp(S.frontOpacityMin, 1, (facing - S.backThreshold) / (1 - S.backThreshold));

      const baseScale = lerp(.84, 1.03, Math.pow(facing, 1.9));
      smoothHover[i] = lerpDt(smoothHover[i], hoverScale[i], 0.12, dt);
      const scale = baseScale * smoothHover[i];
      const zIdx  = Math.round((z - S.zOffset + S.R) * 10);
      const tf    = `translate3d(-50%,-50%,0) translate3d(${x2.toFixed(1)}px,${y2.toFixed(1)}px,${z.toFixed(1)}px) rotateY(${yaw.toFixed(2)}deg) rotateX(${S.tiltX}deg) scale(${scale.toFixed(3)})`;
      const filt  = blur > .1 ? `blur(${blur.toFixed(2)}px)` : '';
      const opacityStr = opacity.toFixed(3);

      if (tf !== last.tf[i]) { cards[i].style.transform = tf; last.tf[i] = tf; }
      if (filt !== last.filt[i]) { cards[i].style.filter = filt; last.filt[i] = filt; }
      if (opacityStr !== last.opacity[i]) { cards[i].style.opacity = opacityStr; last.opacity[i] = opacityStr; }
      if (zIdx !== last.zIdx[i]) { cards[i].style.zIndex = zIdx; last.zIdx[i] = zIdx; }

      if (photos[i]) {
        const photoOpacity = (opacity * .97).toFixed(3);
        if (tf !== last.photoTf[i]) { photos[i].style.transform = tf; last.photoTf[i] = tf; }
        if (filt !== last.photoFilt[i]) { photos[i].style.filter = filt; last.photoFilt[i] = filt; }
        if (photoOpacity !== last.photoOpacity[i]) { photos[i].style.opacity = photoOpacity; last.photoOpacity[i] = photoOpacity; }
        if (zIdx - 1 !== last.photoZIdx[i]) { photos[i].style.zIndex = zIdx - 1; last.photoZIdx[i] = zIdx - 1; }
      }
    });

    // Нативний :hover погано працює на розвернутих під кутом (rotateY)
    // картках — реальна форма спотворена перспективою, тому наведення
    // "губиться", щойно картка не строго по центру. Тому щокадру самі
    // рахуємо наведення для карток, які й так помітні (facing > поріг) —
    // зазвичай це 1-2 картки, не всі 6, тож дешево.
    const HOVER_FACING_MIN = 0.5;
    const HOVER_PAD = 40; // запас навколо реальних меж картки для "чутливості"
    poses.forEach((p, i) => {
      if (p.facing <= HOVER_FACING_MIN) {
        if (hoverScale[i] !== 1) {
          hoverScale[i] = 1;
          cards[i].classList.remove('is-hovered');
        }
        return;
      }
      const rect = cards[i].getBoundingClientRect();
      const isHovered = pointer.x >= rect.left - HOVER_PAD && pointer.x <= rect.right + HOVER_PAD
        && pointer.y >= rect.top  - HOVER_PAD && pointer.y <= rect.bottom + HOVER_PAD;
      hoverScale[i] = isHovered ? 1.06 : 1;
      cards[i].classList.toggle('is-hovered', isHovered);
    });
  };
}

function bindOpenHandlers(section, track, cards) {
  const open = card => {
    const id = card?.getAttribute(ATTR.PROJECT);
    if (id) openProject(id);
  };

  // Делегований клік на контейнері спіралі замість окремих listener'ів на
  // кожній картці. У 3D-стеку (transform-style:preserve-3d) браузер не завжди
  // коректно визначає, яка картка "зверху" для нативного click-routing —
  // тож самі шукаємо картку за координатами кліку серед усіх, що реально
  // перекривають цю точку, і беремо найближчу до камери (найвищий z-index).
  section.addEventListener('click', e => {
    e.preventDefault();
    let best = null, bestZ = -Infinity;
    for (const card of cards) {
      const rect = card.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right
        && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        const z = parseInt(card.style.zIndex, 10) || 0;
        if (z > bestZ) { bestZ = z; best = card; }
      }
    }
    open(best || e.target.closest('.card'));
  });

  let tapStartX = 0, tapStartY = 0, tapStartAt = 0, tapCard = null;

  track.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch') return;
    tapStartX = e.clientX;
    tapStartY = e.clientY;
    tapStartAt = performance.now();
    tapCard = e.target.closest('.card');
  }, { passive: true });

  track.addEventListener('pointerup', e => {
    if (e.pointerType !== 'touch') return;
    if (!tapCard) return;
    const dx = Math.abs(e.clientX - tapStartX);
    const dy = Math.abs(e.clientY - tapStartY);
    const dtMs = performance.now() - tapStartAt;
    const isTap = dx <= 28 && dy <= 28 && dtMs <= 450;
    if (isTap) {
      e.preventDefault();
      open(tapCard);
    }
    tapCard = null;
  }, { passive: false });
}
