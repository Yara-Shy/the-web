export const IS_MOBILE_DEVICE =
  /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ||
  window.innerWidth <= 768;
export const DESKTOP_IS_LOW_END = !IS_MOBILE_DEVICE && navigator.hardwareConcurrency <= 2;
export const IS_LOW_END = IS_MOBILE_DEVICE || DESKTOP_IS_LOW_END;

/** 'mobile' | 'lowEnd' | 'desktop' — ключ для варіантів у site.config.js */
export const DEVICE_TIER = IS_MOBILE_DEVICE ? 'mobile' : DESKTOP_IS_LOW_END ? 'lowEnd' : 'desktop';

export function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
