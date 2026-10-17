import { IS_LOW_END } from '../../core/capabilities.js';
import { whenNearViewport } from '../../core/lazy.js';
import { ATTR } from '../../constants.js';

// Мовчазне фонове відео: без звуку, по колу, inline, без контролів.
function configureAutoplayVideo(video) {
  video.muted = true;
  video.defaultMuted = true;
  video.autoplay = true;
  video.loop = true;
  video.playsInline = true;
  video.controls = false;
  video.disablePictureInPicture = true;
  video.setAttribute('muted', '');
  video.setAttribute('autoplay', '');
  video.setAttribute('loop', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.setAttribute('controlsList', 'nodownload nofullscreen noplaybackrate');
}

function playIfPossible(video) {
  const p = video.play();
  if (p && typeof p.catch === 'function') p.catch(() => {});
}

/**
 * <video data-src="…mp4" data-src-lite="…-720.mp4" poster="…">
 * src виставляємо самі, щоб браузер не тягнув важку версію під час парсингу:
 * на слабких/мобільних пристроях — легшу (-720), і лише коли відео біля viewport
 * (або одразу, якщо data-load="eager" чи options.eager).
 */
export function create(video, { eager = video.getAttribute(ATTR.LOAD) === 'eager' } = {}) {
  configureAutoplayVideo(video);

  const src = (IS_LOW_END && video.getAttribute(ATTR.SRC_LITE)) || video.getAttribute(ATTR.SRC);
  const start = () => {
    if (!src) return;
    video.addEventListener('loadedmetadata', () => playIfPossible(video), { once: true });
    video.src = src;
    playIfPossible(video);
  };

  const cancel = eager ? (start(), () => {}) : whenNearViewport(video, start);

  return {
    element: video,
    destroy() {
      cancel();
      video.pause();
      video.removeAttribute('src');
      video.load();
    },
  };
}
