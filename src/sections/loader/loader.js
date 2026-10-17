import { ATTR, EVENTS } from '../../constants.js';

// Прогрес рахується з реальних подій завантаження (шрифти, window.load,
// метадані першого відео), а не з випадкових чисел — щоб лоадер зникав
// тоді, коли сторінка справді готова, а не за фіксований час.
const TASK_WEIGHT = { fonts: 0.3, windowLoad: 0.5, firstVideo: 0.2 };

export function mount(el) {
  const bar = el.querySelector('.loader-bar');
  const pct = el.querySelector('.loader-pct');
  const loadTasks = { fonts: false, windowLoad: false, firstVideo: false };
  let lp = 0;

  const targetProgress = () =>
    Object.keys(TASK_WEIGHT).reduce((p, k) => p + (loadTasks[k] ? TASK_WEIGHT[k] : 0), 0) * 100;

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => { loadTasks.fonts = true; });
  } else {
    loadTasks.fonts = true;
  }

  if (document.readyState === 'complete') {
    loadTasks.windowLoad = true;
  } else {
    window.addEventListener('load', () => { loadTasks.windowLoad = true; }, { once: true });
  }

  // Перше відео сторінки позначене data-load="eager" (картка спіралі #cp-0).
  const firstVideo = document.querySelector(`video[${ATTR.LOAD}="eager"]`);
  if (firstVideo && firstVideo.readyState < 1) {
    firstVideo.addEventListener('loadedmetadata', () => { loadTasks.firstVideo = true; }, { once: true });
  } else {
    loadTasks.firstVideo = true;
  }

  // Запобіжник — якщо якийсь ресурс завис (заблокований запит тощо),
  // лоадер все одно не залишиться на екрані назавжди.
  setTimeout(() => {
    loadTasks.fonts = loadTasks.windowLoad = loadTasks.firstVideo = true;
  }, 6000);

  const tick = setInterval(() => {
    const target = targetProgress();
    lp += (target - lp) * 0.15;
    if (target >= 100 && target - lp < 0.5) lp = 100;
    bar.style.width = lp + '%';
    pct.textContent = Math.floor(lp) + '%';
    if (lp >= 100) {
      clearInterval(tick);
      setTimeout(() => {
        el.classList.add('hide');
        document.dispatchEvent(new CustomEvent(EVENTS.INTRO_READY));
      }, 400);
    }
  }, 55);
}
