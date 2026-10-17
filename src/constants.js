// Заморожені імена, якими модулі домовляються між собою через DOM.

export const STATES = Object.freeze({
  READY:    'ready',
  FALLBACK: 'fallback',
});

export const FALLBACK = Object.freeze({
  DISABLED: 'disabled',  // вимкнено в site.config.js
  NO_WEBGL: 'no-webgl',
  ERROR:    'error',     // демо впало під час створення
});

export const ATTR = Object.freeze({
  SECTION:         'data-section',
  DEMO_STATE:      'data-demo-state',
  FALLBACK_REASON: 'data-fallback-reason',
  PROJECT:         'data-project',
  ROLE:            'data-role',
  FIELD:           'data-field',
  LOAD:            'data-load',      // "eager" — не чекати на viewport
  SRC:             'data-src',
  SRC_LITE:        'data-src-lite',  // легша версія для IS_LOW_END
});

// Події на document — секції не імпортують одна одну.
export const EVENTS = Object.freeze({
  INTRO_READY:  'intro:ready',   // лоадер зник
  HERO_REVEAL:  'hero:reveal',
  HERO_HIDE:    'hero:hide',
  PROJECT_OPEN: 'project:open',  // detail: { id }
});

// Порядок викликів у спільному rAF (менше — раніше), як у старому єдиному циклі.
export const FRAME_ORDER = Object.freeze({
  SCROLL:       0,   // стан скролу + цілі камери
  CURSOR:       10,
  SCENE:        20,  // оновлення 3D-сцени
  SPIRAL:       30,
  RENDER:       40,
  AFTER_RENDER: 50,  // readPixels для контрасту хедера — після рендеру того ж кадру
});
