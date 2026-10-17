/* ─────────────────────────────────────────────
   ЄДИНИЙ RAF LOOP
   Курсор, 3D-сцена, спіраль — усі підписуються сюди, а не заводять свої rAF.
   Кожен підписник отримує (t, dt) для FPS-нормалізованого lerp.
   Порядок викликів — за FRAME_ORDER з constants.js.
   ───────────────────────────────────────────── */
export function createLoop() {
  const subscribers = [];
  const startedAt = performance.now();
  let lastTime = 0;
  let running = false;
  let tabHidden = document.hidden;

  document.addEventListener('visibilitychange', () => { tabHidden = document.hidden; });

  const elapsed = () => (performance.now() - startedAt) / 1000;

  function frame() {
    requestAnimationFrame(frame);
    if (tabHidden) return;

    const t  = elapsed();
    const dt = Math.min(t - lastTime, 0.1); // cap dt щоб не було стрибка після blur вкладки
    lastTime = t;

    for (const s of subscribers) s.fn(t, dt);
  }

  return {
    elapsed,
    add(fn, order = 0) {
      const entry = { fn, order };
      subscribers.push(entry);
      subscribers.sort((a, b) => a.order - b.order);
      return () => {
        const i = subscribers.indexOf(entry);
        if (i >= 0) subscribers.splice(i, 1);
      };
    },
    start() {
      if (running) return;
      running = true;
      requestAnimationFrame(frame);
    },
  };
}
