import EmblaCarousel from 'embla-carousel';
import { IS_MOBILE_DEVICE } from '../../core/capabilities.js';
import { setTags } from '../../core/dom.js';
import { createDemo } from '../../demos/index.js';
import { ATTR, EVENTS } from '../../constants.js';

export function mount(wrap) {
  const container = wrap.querySelector('.more-carousel');
  const slides = Array.from(container.querySelectorAll('.embla__slide'));

  container.querySelectorAll('video').forEach(video => createDemo('video-demo', video));

  // На мобільній замість тегів — роль, у тому ж тег-стилі й на тому ж місці.
  if (IS_MOBILE_DEVICE) {
    slides.forEach(slide => {
      const role = slide.getAttribute(ATTR.ROLE);
      setTags(slide.querySelector('.meta-tags'), role ? [role] : []);
    });
  }

  const embla = EmblaCarousel(
    wrap.querySelector('.embla__viewport'),
    { loop: true, align: 'center', skipSnaps: false, containScroll: 'trimSnaps' }
  );

  const dotsWrap = wrap.querySelector('.embla__dots');

  function buildDots() {
    dotsWrap.innerHTML = '';
    embla.scrollSnapList().forEach((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'embla__dot';
      b.addEventListener('click', () => embla.scrollTo(i));
      dotsWrap.appendChild(b);
    });
  }

  function updateDots() {
    const idx = embla.selectedScrollSnap();
    dotsWrap.querySelectorAll('.embla__dot').forEach((d, i) => {
      d.setAttribute('aria-selected', i === idx ? 'true' : 'false');
    });
  }

  function setSelected() {
    slides.forEach(s => s.classList.remove('is-selected'));
    const idx = embla.selectedScrollSnap();
    embla.slideNodes()[idx]?.classList.add('is-selected');
    updateDots();
  }

  buildDots();
  setSelected();
  embla.on('select', setSelected);
  embla.on('reInit', () => { buildDots(); setSelected(); });

  setTimeout(() => embla.reInit(), 0);

  // Мобільний адресний рядок ховається/показується залежно від напрямку
  // скролу і генерує 'resize' лише через зміну innerHeight — карусель
  // горизонтальна, її layout залежить від ширини, а не висоти, тож reInit
  // на кожен такий resize викликав видимий стрибок під час скролу повз
  // карусель. Реагуємо лише коли реально змінилась ширина.
  let resizeTimer = null;
  let lastWidth = window.innerWidth;
  window.addEventListener('resize', () => {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => embla.reInit(), 120);
  });

  wrap.querySelector('.mc-prev').addEventListener('click', () => embla.scrollPrev());
  wrap.querySelector('.mc-next').addEventListener('click', () => embla.scrollNext());

  container.addEventListener('click', e => {
    const id = e.target.closest('.embla__slide')?.getAttribute(ATTR.PROJECT);
    if (id) document.dispatchEvent(new CustomEvent(EVENTS.PROJECT_OPEN, { detail: { id } }));
  });
}
