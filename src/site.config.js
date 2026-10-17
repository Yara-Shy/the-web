// Прапорці й налаштування варіантів демо. Тут лише дані — без логіки.

export const SITE = Object.freeze({
  // Фон: 'particle-sphere' або вимкнути (тоді показується постер).
  background: { enabled: true, kind: 'particle-sphere' },

  // Колір логотипу/навігації за кольором сцени позаду (readPixels).
  // На мобільних і слабких десктопах вимкнено завжди: readPixels форсує GPU sync.
  headerContrast: { enabled: true, everyNthFrame: 6 },

  // 3D-спіраль карток; на мобільних — завжди лінійний список.
  spiral: {
    R: 640, pitch: 320, zOffset: -640, faceStrength: 48, tiltX: 0,
    backBlurMax: 12, backOpacityMin: 0.22, frontOpacityMin: 0.98,
    backThreshold: 0, cameraLerp: 0.1, focusSharpness: 12.0, scrollLerp: 0.08,
  },

  particleSphere: {
    // X_HERO — зсув сфери вбік під hero; X_MOBILE (-7.5 замість -6) — трохи правіше на мобільних.
    camera: { FAR_Z: 28, NEAR_Z: 15, SPIRAL_Z: 3.5, Y: 5, X_HERO: -6, X_MOBILE: -7.5 },
    explodeMs: 2_000,
    // Візуал десктопа — оригінальний; на мобільних і слабких десктопах — полегшений.
    tiers: {
      desktop: {
        sphere: { count: 18_000, radius: 5, glowSpread: 1, sizeScale: 1 },
        rings:  { count: 5, pointsPerRing: 2_000, radius: 7.5, thickness: 0.6 },
        stars:  { count: 6_000, spread: 50_000 },
        bloom:  { strength: 1.2, threshold: 0, radius: 0.5, resolution: 1 },
        maxDpr: 2,
      },
      lowEnd: {
        sphere: { count: 10_000, radius: 5, glowSpread: 1, sizeScale: 1 },
        rings:  { count: 4, pointsPerRing: 1_200, radius: 7.5, thickness: 0.6 },
        stars:  { count: 3_000, spread: 50_000 },
        bloom:  { strength: 0.8, threshold: 0, radius: 0.5, resolution: 0.5 },
        maxDpr: 2,
      },
      // Bloom на мобільних на дуже низькій роздільності (~0.16 екрана) — у рази
      // дешевше, майже не впливає на плавність скролу, але дає справжнє "розтікання" світла.
      // glowSpread — невеликий додатковий буст світіння прямо в шейдері.
      mobile: {
        sphere: { count: 10_000, radius: 5, glowSpread: 1.4, sizeScale: 0.4 },
        rings:  { count: 5, pointsPerRing: 700, radius: 7.5, thickness: 0.6 },
        stars:  { count: 1_200, spread: 50_000 },
        bloom:  { strength: 0.55, threshold: 0, radius: 0.35, resolution: 0.16 },
        maxDpr: 1.25,
      },
    },
  },
});
