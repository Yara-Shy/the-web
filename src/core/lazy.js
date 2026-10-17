/**
 * Викликає onNear один раз, коли елемент наближається до viewport.
 * Повертає функцію скасування.
 */
export function whenNearViewport(el, onNear, { rootMargin = '50% 0px' } = {}) {
  if (!('IntersectionObserver' in window)) {
    onNear();
    return () => {};
  }
  const io = new IntersectionObserver(entries => {
    if (!entries.some(e => e.isIntersecting)) return;
    io.disconnect();
    onNear();
  }, { rootMargin });
  io.observe(el);
  return () => io.disconnect();
}
