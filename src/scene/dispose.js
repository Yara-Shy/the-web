/** Звільняє GPU-ресурси всіх geometry/material у дереві об'єкта. */
export function disposeObject(root) {
  root.traverse(obj => {
    obj.geometry?.dispose();
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of materials) m?.dispose();
  });
}

/** Повне звільнення: сцена, composer (render targets), рендерер і його контекст. */
export function disposeScene({ scene, composer, renderer, controls }) {
  if (scene) disposeObject(scene);
  controls?.dispose();
  composer?.dispose();
  renderer?.dispose();
}
