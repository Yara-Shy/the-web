import { ATTR, STATES } from '../../constants.js';

/**
 * Фолбек: ховає елемент демо, і під ним лишається постер з index.html (.bg-poster).
 * Повертає той самий API, що й живе демо, але без дії — секціям не треба перевіряти тип.
 */
export function create(element, { reason }) {
  element.setAttribute(ATTR.DEMO_STATE, STATES.FALLBACK);
  element.setAttribute(ATTR.FALLBACK_REASON, reason);

  return {
    setCameraTarget() {},
    setScrollState() {},
    explode() {},
    sampleColor: () => null,
    destroy() {
      element.removeAttribute(ATTR.DEMO_STATE);
      element.removeAttribute(ATTR.FALLBACK_REASON);
    },
  };
}
