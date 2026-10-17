import * as THREE from 'three';
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

/** size — { width, height } у CSS-пікселях (див. sceneViewportSize у core/dom.js). */
export function createRenderer(canvas, { antialias, dpr, size }) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias,
    powerPreference: 'high-performance',
  });
  renderer.setSize(size.width, size.height);
  renderer.setClearColor(0x000000);
  renderer.setPixelRatio(dpr);
  return renderer;
}

/**
 * RenderPass + (необов'язковий) bloom.
 * Bloom — багатопрохідне розмиття всього екрана щокадру, найдорожча частина рендеру,
 * тому його роздільність задається часткою екрана (bloom.resolution).
 */
export function createComposer(renderer, scene, camera, bloom, size) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  if (bloom) {
    const res = new THREE.Vector2(size.width * bloom.resolution, size.height * bloom.resolution);
    const bloomPass = new UnrealBloomPass(res, bloom.strength, bloom.radius);
    bloomPass.threshold = bloom.threshold;
    composer.addPass(bloomPass);
  }
  return composer;
}

/**
 * Підганяє камеру, рендерер і composer під getSize(). Ресайз WebGL-буферів (разом
 * із bloom) дорогий — тому лише коли розмір справді змінився, а не на кожен
 * 'resize' від мобільного адресного рядка. Повертає функцію відписки.
 */
export function bindResize(camera, renderer, composer, getSize) {
  let last = getSize();
  const onResize = () => {
    const size = getSize();
    if (size.width === last.width && size.height === last.height) return;
    last = size;
    camera.aspect = size.width / size.height;
    camera.updateProjectionMatrix();
    renderer.setSize(size.width, size.height);
    composer.setSize(size.width, size.height);
  };
  window.addEventListener('resize', onResize, { passive: true });
  return () => window.removeEventListener('resize', onResize);
}
