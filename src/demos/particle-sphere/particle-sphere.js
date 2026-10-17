import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createRenderer, createComposer, bindResize } from '../../scene/renderer.js';
import { disposeScene } from '../../scene/dispose.js';
import * as sphereShader from '../../scene/shaders/sphere.glsl.js';
import * as ringsShader from '../../scene/shaders/rings.glsl.js';
import * as starsShader from '../../scene/shaders/stars.glsl.js';
import { IS_MOBILE_DEVICE, IS_LOW_END, DEVICE_TIER } from '../../core/capabilities.js';
import { sceneViewportSize } from '../../core/dom.js';
import { lerpDt, easeInOutCubic } from '../../core/math.js';
import { ATTR, STATES, FRAME_ORDER } from '../../constants.js';
import { SITE } from '../../site.config.js';

const CFG = SITE.particleSphere;
const CAM = CFG.camera;

/* ─────────────────────────────────────────────
   GEOMETRY
   ───────────────────────────────────────────── */
function makeSphere({ radius, count, glowSpread = 1, sizeScale = 1 }) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3), col = new Float32Array(count * 3), sz = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const phi = Math.acos(-1 + (2 * i) / count), theta = Math.sqrt(count * Math.PI) * phi;
    pos[i*3]   = radius * Math.cos(theta) * Math.sin(phi);
    pos[i*3+1] = radius * Math.sin(theta) * Math.sin(phi);
    pos[i*3+2] = radius * Math.cos(phi);
    sz[i] = (Math.random() * 0.2 + 0.1) * sizeScale;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
  geo.setAttribute('size',     new THREE.BufferAttribute(sz,  1));
  return new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, uMouse: { value: new THREE.Vector2(-10, -10) }, uGlowSpread: { value: glowSpread } },
    vertexShader: sphereShader.vertexShader, fragmentShader: sphereShader.fragmentShader,
    vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
}

function makeRings({ count, pointsPerRing, radius, thickness }) {
  const group = new THREE.Group(), v = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(pointsPerRing * 3), col = new Float32Array(pointsPerRing * 3);
    const sz  = new Float32Array(pointsPerRing), rd = new Float32Array(pointsPerRing * 3);
    for (let j = 0; j < pointsPerRing; j++) {
      const angle = (j / pointsPerRing) * Math.PI * 2;
      const r = radius + (Math.random() - 0.5) * thickness;
      pos[j*3]   = Math.cos(angle) * r;
      pos[j*3+1] = (Math.random() - 0.5) * (thickness * 0.5);
      pos[j*3+2] = Math.sin(angle) * r;
      sz[j] = Math.random() * 0.15 + 0.08;
      v.set(Math.random()*2-1, Math.random()*2-1, Math.random()*2-1).normalize();
      rd[j*3] = v.x; rd[j*3+1] = v.y; rd[j*3+2] = v.z;
    }
    geo.setAttribute('position',  new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color',     new THREE.BufferAttribute(col, 3));
    geo.setAttribute('size',      new THREE.BufferAttribute(sz,  1));
    geo.setAttribute('randomDir', new THREE.BufferAttribute(rd,  3));
    const ring = new THREE.Points(geo, new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, uMouse: { value: new THREE.Vector2(-10, -10) }, uExplode: { value: 0 } },
      vertexShader: ringsShader.vertexShader, fragmentShader: ringsShader.fragmentShader,
      vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    ring.rotation.x = Math.random() * Math.PI;
    ring.rotation.y = Math.random() * Math.PI;
    group.add(ring);
  }
  return group;
}

function makeStars({ count, spread }) {
  const geo = new THREE.BufferGeometry(), pos = [], col = [], sz = [];
  for (let i = 0; i < count; i++) {
    pos.push((Math.random()-.5)*spread, (Math.random()-.5)*spread, (Math.random()-.5)*spread);
    const c = new THREE.Color().setHSL(Math.random()*.1-.05, .2, .5+Math.random()*.5);
    col.push(c.r, c.g, c.b);
    sz.push(0.5 + Math.random());
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color',    new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute('size',     new THREE.Float32BufferAttribute(sz,  1));
  return new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: starsShader.vertexShader, fragmentShader: starsShader.fragmentShader,
    vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
}


/* ─────────────────────────────────────────────
   THEMES
   ───────────────────────────────────────────── */
const THEMES = {
  nebula: { sphere: [0x00ffff,0xff1493,0x4169e1,0xff69b4,0x00bfff].map(h=>new THREE.Color(h)), rings:(i,tc,j,pc)=>new THREE.Color().setHSL((i/tc)*.6+(j/pc)*.2+.5,.8,.6) },
};

function applyTheme(name, sphere, rings) {
  const t = THEMES[name]; if (!t) return;
  const sAttr = sphere.geometry.attributes.color;
  for (let i = 0; i < sAttr.count; i++) {
    const p = (i/sAttr.count)*(t.sphere.length-1);
    const c = new THREE.Color()
      .copy(t.sphere[Math.floor(p)])
      .lerp(t.sphere[Math.min(Math.ceil(p), t.sphere.length-1)], p%1);
    sAttr.setXYZ(i, c.r, c.g, c.b);
  }
  sAttr.needsUpdate = true;
  rings.children.forEach((ring, i) => {
    const rAttr = ring.geometry.attributes.color;
    for (let j = 0; j < rAttr.count; j++) {
      const c = t.rings(i, rings.children.length, j, rAttr.count);
      rAttr.setXYZ(j, c.r, c.g, c.b);
    }
    rAttr.needsUpdate = true;
  });
}


/* ─────────────────────────────────────────────
   DEMO
   Камерою й вибухом керує home.js (хореографія скролу) через повернений API;
   тут — лише сцена, її анімація та рендер у спільному loop.
   ───────────────────────────────────────────── */
export function create(canvas, { loop }) {
  const tier = CFG.tiers[DEVICE_TIER];
  const dpr  = Math.min(devicePixelRatio, tier.maxDpr);
  const isMobile = IS_MOBILE_DEVICE;
  const size = sceneViewportSize();

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.008);

  const camera = new THREE.PerspectiveCamera(75, size.width/size.height, 0.1, 50_000);
  camera.position.set(0, CAM.Y, CAM.FAR_Z);

  const renderer = createRenderer(canvas, { antialias: !IS_LOW_END, dpr, size });

  const controls = new OrbitControls(camera, renderer.domElement);
  Object.assign(controls, {
    enableDamping: true, dampingFactor: .04, rotateSpeed: .6,
    minDistance: 2, maxDistance: 60, enableZoom: false,
  });
  if (isMobile) controls.enabled = false;

  const composer = createComposer(renderer, scene, camera, tier.bloom, size);

  const sphere    = makeSphere(tier.sphere);
  const rings     = makeRings(tier.rings);
  const stars     = makeStars(tier.stars);
  const mainGroup = new THREE.Group();
  // На мобільних сферу ховаємо (не додаємо до сцени — нуль витрат на рендер),
  // кільця й зірки лишаються.
  if (!isMobile) mainGroup.add(sphere);
  scene.add(mainGroup, rings, stars, new THREE.PointLight(0xffffff, 2, 0));
  applyTheme('nebula', sphere, rings);

  const unbindResize = bindResize(camera, renderer, composer, sceneViewportSize);

  const mouse3D = new THREE.Vector2(-10, -10);
  const onMouseMove = e => {
    mouse3D.x =  (e.clientX / innerWidth)  * 2 - 1;
    mouse3D.y = -((e.clientY / innerHeight) * 2 - 1);
  };
  if (!isMobile) window.addEventListener('mousemove', onMouseMove, { passive: true });

  // На мобільних камера стартує вже в позиції "перед спіраллю" (SPIRAL_Z).
  let camTargetZ  = isMobile ? CAM.SPIRAL_Z : CAM.FAR_Z;
  let camCurrentZ = camTargetZ;
  let camTargetX  = isMobile ? CAM.X_MOBILE : 0;
  let camCurrentX = camTargetX;

  let isExploding = false, explodeStart = 0;
  let sphereAlphaSmooth = 1;
  let sphereSpiralProgressSmooth = 0;
  let scroll = { wrapP: 0, spiralP: 0, spiralIn: false, spiralDone: false };

  function update(t, dt) {
    /* ── Camera Z  ── */
    // FPS-нормалізований lerp — камера однаково плавна на 60 і 120fps
    camCurrentZ = lerpDt(camCurrentZ, camTargetZ, 0.05, dt);
    camCurrentX = lerpDt(camCurrentX, camTargetX, 0.05, dt);
    camera.position.z = camCurrentZ;
    camera.position.y = CAM.Y;
    controls.target.x = lerpDt(controls.target.x, camCurrentX, 0.05, dt);

    /* ── Explode  ── */
    if (isExploding) {
      const p = Math.min((t - explodeStart) * 1_000 / CFG.explodeMs, 1);
      const e = easeInOutCubic(p);
      rings.children.forEach(r => r.material.uniforms.uExplode.value = e);
      if (p >= 1) isExploding = false;
    } else {
      rings.children.forEach(r => {
        const cur = r.material.uniforms.uExplode.value;
        r.material.uniforms.uExplode.value = cur > .002 ? cur * .94 : 0;
      });
    }

    /* ── Sphere scale + alpha  ── */
    const { wrapP, spiralP, spiralIn, spiralDone } = scroll;
    const breathe = 1 + Math.sin(t * 1.5) * 0.05;
    let sphereTargetScale = breathe;
    let sphereTargetAlpha = 1;

    // Ріст стартує трохи раніше — на середині руху камери (preZoom триває
    // wrapP: 0.75 → 1, середина = 0.875), а не лише коли рух повністю завершено.
    // preRamp росте тільки до 0.15, тож коли spiralIn-формула (spiralP - 0.05)
    // теж досягає 0.15 (на spiralP=0.2 — фокус другої картки), обидві гілки
    // збігаються без стрибка.
    const preRamp = wrapP > 0.875 ? Math.min(1, (wrapP - 0.875) / 0.125) * 0.15 : 0;
    const spiralRamp = spiralIn ? Math.max(0, spiralP - 0.05) : 0;
    const rawSpiralProgress = Math.max(preRamp, spiralRamp);
    const growthActive = spiralIn || wrapP > 0.875;
    sphereSpiralProgressSmooth = lerpDt(sphereSpiralProgressSmooth, rawSpiralProgress, 0.022, dt);

    if (spiralDone) {
      sphereTargetAlpha = 0;
      sphereTargetScale = breathe * (isMobile ? 9 : 15);
    } else if (growthActive) {
      sphereTargetScale = breathe * (1 + sphereSpiralProgressSmooth * (isMobile ? 10 : 25));
      sphereTargetAlpha = Math.max(0, 1 - sphereSpiralProgressSmooth * 5);
    } else {
      sphereSpiralProgressSmooth = lerpDt(sphereSpiralProgressSmooth, 0, 0.08, dt);
    }

    const currentScale = sphere.scale.x;
    // FPS-нормалізований lerp для scale і alpha
    sphere.scale.setScalar(lerpDt(currentScale, sphereTargetScale, 0.05, dt));
    sphereAlphaSmooth   = lerpDt(sphereAlphaSmooth, sphereTargetAlpha, 0.05, dt);
    sphere.material.opacity = sphereAlphaSmooth;

    /* ── Uniforms  ── */
    sphere.material.uniforms.time.value   = t;
    sphere.material.uniforms.uMouse.value.copy(mouse3D);
    rings.children.forEach(r => {
      r.material.uniforms.time.value   = t;
      r.material.uniforms.uMouse.value.copy(mouse3D);
    });
    stars.material.uniforms.time.value = t;
    stars.rotation.y += 0.0003;

    /* ── Rings rotation  ── */
    rings.children.forEach((r, i) => {
      const s = 0.0005 * (i + 1);
      r.rotation.z += s;
      r.rotation.x += s * .3;
      r.rotation.y += s * .2;

      if (spiralDone) {
        const targetScale = 14.0;
        r.scale.x = lerpDt(r.scale.x, targetScale, 0.02, dt);
        r.scale.y = lerpDt(r.scale.y, targetScale, 0.02, dt);
        r.scale.z = lerpDt(r.scale.z, targetScale, 0.02, dt);
      } else {
        r.scale.x = lerpDt(r.scale.x, 1, 0.04, dt);
        r.scale.y = lerpDt(r.scale.y, 1 + Math.sin(t * 3 + i * .5) * .2, 0.04, dt);
        r.scale.z = lerpDt(r.scale.z, 1, 0.04, dt);
      }
      r.material.opacity = 1;
    });

    mainGroup.rotation.y += 0.0005;
    rings.rotation.y     += 0.0005;
  }

  function render() {
    controls.update();
    composer.render();
  }

  const unsubscribe = [
    loop.add(update, FRAME_ORDER.SCENE),
    loop.add(render, FRAME_ORDER.RENDER),
  ];

  /* ─────────────────────────────────────────────
     Колір сцени під елементом (для контрасту хедера, nav.js).
     gl.readPixels форсує GPU sync — викликати рідко і лише після render
     того ж кадру (FRAME_ORDER.AFTER_RENDER), поки буфер ще не очищено.
     ───────────────────────────────────────────── */
  const glCtx    = renderer.getContext();
  const pixelBuf = new Uint8Array(4);

  function sampleColor(el) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return null;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const bx = Math.round(cx * dpr);
    const by = Math.round((canvas.clientHeight - cy) * dpr); // WebGL: 0,0 знизу зліва
    if (bx < 0 || by < 0 || bx >= glCtx.drawingBufferWidth || by >= glCtx.drawingBufferHeight) return null;
    glCtx.readPixels(bx, by, 1, 1, glCtx.RGBA, glCtx.UNSIGNED_BYTE, pixelBuf);
    return pixelBuf;
  }

  canvas.setAttribute(ATTR.DEMO_STATE, STATES.READY);

  return {
    setCameraTarget(z, x) { camTargetZ = z; camTargetX = x; },
    setScrollState(state) { scroll = state; },
    explode(t) { isExploding = true; explodeStart = t; },
    sampleColor,
    destroy() {
      unsubscribe.forEach(off => off());
      unbindResize();
      window.removeEventListener('mousemove', onMouseMove);
      disposeScene({ scene, composer, renderer, controls });
      canvas.removeAttribute(ATTR.DEMO_STATE);
    },
  };
}
