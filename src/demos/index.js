// kind → модуль демо. Кожен експортує create(element, options) і вантажиться лише коли потрібен.
const KINDS = {
  'particle-sphere': () => import('./particle-sphere/particle-sphere.js'),
  'video-demo':      () => import('./video-demo/video-demo.js'),
  'static':          () => import('./static/static.js'),
};

export async function createDemo(kind, element, options = {}) {
  const load = KINDS[kind];
  if (!load) throw new Error(`Unknown demo kind: ${kind}`);
  const { create } = await load();
  return create(element, options);
}
