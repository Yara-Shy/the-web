import { IS_MOBILE_DEVICE } from '../../core/capabilities.js';
import { pointer } from '../../core/dom.js';
import { lerpDt } from '../../core/math.js';
import { FRAME_ORDER } from '../../constants.js';

// Крапка йде точно за мишею, кільце — плавно наздоганяє. Рендеримо в спільному rAF.
export function mount(dot, { loop }) {
  if (IS_MOBILE_DEVICE) return;
  const ringEl = document.getElementById('cur-ring');
  const ring = { x: 0, y: 0 };

  loop.add((t, dt) => {
    ring.x = lerpDt(ring.x, pointer.x, 0.14, dt);
    ring.y = lerpDt(ring.y, pointer.y, 0.14, dt);
    dot.style.left    = pointer.x + 'px';
    dot.style.top     = pointer.y + 'px';
    ringEl.style.left = ring.x + 'px';
    ringEl.style.top  = ring.y + 'px';
  }, FRAME_ORDER.CURSOR);
}
