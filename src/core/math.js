/**
 * FPS-нормалізований lerp.
 * alpha — "відчута" швидкість на 60fps.
 * На 120fps коефіцієнт перераховується автоматично,
 * щоб анімація виглядала однаково на будь-якому refresh rate.
 *
 * Формула: 1 - (1 - alpha)^(dt * 60)
 */
export function lerpDt(current, target, alpha, dt) {
  const k = 1 - Math.pow(1 - Math.min(Math.max(alpha, 0), 1), dt * 60);
  return current + (target - current) * k;
}

/** Стандартний lerp без нормалізації — для разових обчислень */
export const lerp = (a, b, t) => a + (b - a) * t;

export const easeInOutCubic = x => x < .5 ? 4*x*x*x : 1 - Math.pow(-2*x + 2, 3) / 2;

export const easeInOutQuad = x => x < .5 ? 2*x*x : 1 - Math.pow(-2*x + 2, 2) / 2;
