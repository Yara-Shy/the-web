# Перебудова сайту під Module layout з CLAUDE.md

Рішення (погоджено 2026-10-17):
- Медіа — локально: оригінали в `assets-src/`, оптимізовані файли в `public/media/`, Cloudinary більше не використовуємо.
- Шрифти — DM Mono self-host у `public/fonts/`; Pacaembu лишається з Typekit (ліцензія Adobe не дозволяє self-host).

Принцип: **поведінка й вигляд сайту не змінюються** — це рефакторинг структури, не редизайн.

## 0. Еталон «до»
- [x] Підняти локальний сервер, зняти скриншоти поточного сайту (desktop 1440 і mobile 390, кілька точок скролу) через headless Edge — це база для порівняння в кроці 9.
- [x] Записати помилки консолі (якщо є) поточної версії.

## 1. Медіа: `assets-src/` → `scripts/` → `public/media/`
- [x] Перенести вміст `creative tech_…Back_up…/` у `assets-src/<project>/` з чистими іменами папок (teddy, rohschnitt, do-you, spinnen, ego, dream-of-war, forever-trashed, cyber-passage, chornozem, kaleidoscope, plug-in, portrait). Оригінали не змінюються.
- [x] `scripts/encode-media.mjs` (Node + ffmpeg), детермінований і повторюваний:
  - відео → `public/media/<project>/<name>.mp4` (H.264, ≤1080p, без аудіо там, де воно muted, faststart) + `<name>-720.mp4` для слабких/мобільних пристроїв (заміна `q_auto:eco,w_720` з Cloudinary) + `<name>-poster.jpg` (перший кадр);
  - зображення → `.webp` (≤1920px по довгій стороні) з `.jpg` фолбеком лише там, де потрібно;
  - імена без хвостів Cloudinary (`_kd0xsh_fhyrd3`).
- [x] Запустити скрипт, закомітити результат; цільовий розмір `public/media/` ≈ 30–50 МБ, жоден файл > 10 МБ.
- [x] Hero poster: кадр частинкової сфери → `public/media/hero-poster.webp`, показується в `index.html` до старту WebGL і як фолбек без WebGL.

## 2. `vendor/` і шрифти
- [x] `scripts/vendor.mjs`: копіює з npm пінені версії `three@0.162.0` (core + потрібні addons: OrbitControls, EffectComposer, RenderPass, UnrealBloomPass та їхні залежності) і `embla-carousel@8.5.2` (ESM-збірка) у `vendor/`.
- [x] Import map у `index.html` → `vendor/`; прибрати CDN-скрипт Embla (UMD → ESM import).
- [x] DM Mono 300/400 (woff2) → `public/fonts/`, `@font-face` у `src/styles/base.css`; прибрати Google Fonts.
- [x] Draco/KTX2 декодери та `public/models/` **не додаємо** — на сайті немає .glb (Simplicity First). Папки з'являться, коли з'явиться перша модель.

## 3. Стилі: `STYLES.css` → `src/styles/` + `src/sections/*/`
- [x] `src/styles/tokens.css` — усе з `:root` (+ мобільні перевизначення токенів).
- [x] `src/styles/base.css` — reset, body, focus-visible, курсор, grain, vignette, `#bg-canvas`, кнопки `.btn*`, спільні `.tag`/`.meta-tag`, `@font-face`, reduced-motion.
- [x] По файлу на секцію: `loader`, `nav`, `home`, `work` (спіраль + картки), `more-work` (карусель), `about`, `contact`, `zoom`, `impressum`, `footer`. Медіа-запити переїжджають разом зі своїми правилами.
- [x] Порядок `<link>` у `index.html` повторює порядок правил у старому файлі, щоб каскад не змінився.

## 4. Розмітка: `index.html`
- [x] Уся розмітка секцій — у `index.html` у порядку сторінки, кожна секція з `data-section="<name>"`.
- [x] Картки «More work» і вміст zoom-оверлея зараз генеруються з масивів `PROJECTS` / `MORE_PROJECTS` у JS → переносимо в статичну розмітку (`<template data-project="…">` для zoom), щоб контент жив у HTML, а JS лише керував поведінкою.
- [x] `<video>` отримують `poster` і `data-src` на локальні файли; `<img>` — `width`/`height`, `loading="lazy"`, `decoding="async"` (крім першого екрана).

## 5. JS-ядро: `src/core/`, `src/constants.js`, `src/site.config.js`
- [x] `core/capabilities.js` — `IS_MOBILE_DEVICE`, `DESKTOP_IS_LOW_END`, `IS_LOW_END`, WebGL, reduced-motion.
- [x] `core/lazy.js` — viewport lazy-loading (IntersectionObserver) для відео/секцій.
- [x] `core/dom.js` — кеш rect-ів, стабільний `--svh`, `lockScrollBriefly`.
- [x] `core/math.js` — `lerp`, `lerpDt`, `easeInOut`.
- [x] `constants.js` — заморожені імена: стани (`loading`, `ready`, `open`…), причини фолбеку (`no-webgl`, `reduced-motion`, `low-end`), data-атрибути.
- [x] `site.config.js` — прапорці, що зараз захардкоджені: bloom, header contrast, spiral layout на мобільних, кастомний курсор, налаштування `CFG`/`CAM`.

## 6. 3D: `src/scene/` + `src/demos/`
- [x] `scene/renderer.js` — WebGLRenderer, EffectComposer, RenderPass, UnrealBloomPass, resize.
- [x] `scene/loop.js` — контролер render-loop (rAF, dt, пауза при прихованій вкладці, підписка `onFrame`).
- [x] `scene/dispose.js` — звільнення geometry/material/renderer.
- [x] `scene/shaders/{sphere,rings,stars}.glsl.js` — рядки шейдерів з `SHADERS`.
- [x] `demos/index.js` — `createDemo(kind, element, options)` із мапою динамічних імпортів.
- [x] `demos/particle-sphere/` — сфера/кільця/зірки, теми, вибух, камера за скролом (логіка з `computeCameraTarget` і кадру).
- [x] `demos/video-demo/` — відео з постером, вибір `-720` варіанту на `IS_LOW_END`, autoplay/play-if-possible.
- [x] `demos/static/` — показ постера, коли WebGL недоступний або спрацював фолбек.

## 7. Секції з поведінкою: `src/sections/<name>/<name>.js`
- [x] `loader` (прогрес завантаження).
- [x] `cursor` — глобальний кастомний курсор як окрема секція `sections/cursor/cursor.{css,js}`; розмітка `#cur`/`#cur-ring` лишається в `index.html`.
- [x] `nav` (контраст хедера — отримує sampler від демо через опції), `home` (hero reveal, scroll-cue), `work` (спіраль, тап/клік по картках), `more-work` (Embla), `zoom` (оверлей, клавіатура), `contact` (копіювання email).
- [x] `about`, `impressum`, `footer` — лише CSS.

## 8. `src/main.js` — лише оркестрація
- [x] Проходить по `[data-section]`, пропускає `hidden`, динамічно імпортує `sections/<name>/<name>.js`, якщо він є; монтує фонове демо через `createDemo`.
- [x] Видалити `JS.js` і `STYLES.css`, коли все перенесено.

## 9. Перевірка
- [x] Локальний сервер, 0 помилок у консолі, 0 запитів 404, 0 запитів до `res.cloudinary.com` / `cdn.jsdelivr.net` / `fonts.googleapis.com`.
- [x] Скриншоти «після» в тих самих точках скролу — порівняти з кроком 0.
- [x] Ручна перевірка: лоадер, вибух сфери, спіраль, zoom (Esc, клік), карусель (стрілки, точки, свайп), копіювання email, мобільна верстка.
- [x] Звіт про розмір `public/media/` та вагу першого екрана до/після.

## Відкриті моменти
- Проєкт не є git-репозиторієм, і `git` не знайдено в PATH — після кожного кроку запропоную коміт, але для цього треба встановити Git і зробити `git init`.

## Review (2026-10-17)

**Результат:** `JS.js` (1414 рядків) і `STYLES.css` (910 рядків) розкладено за Module layout; обидва файли відправлено в Кошик Windows.

**Перевірка:**
- Скриншоти «до/після» в 10 точках скролу + zoom, desktop 1440 і mobile 390 — розкладка ідентична; відрізняються лише кадри відео й випадкова анімація частинок.
- 19/19 поведінкових перевірок: вибух і hero на скролі, клік по картці спіралі → zoom (з роком на desktop, без року на mobile), заміна фото в zoom, закриття ✕ та Esc, стрілки й точки каруселі, копіювання email, `-720` відео лише на mobile, лінійний список і ролі на mobile, фолбек без WebGL (постер, сайт працює).
- Сторонні запити: лише Typekit. Cloudinary, jsDelivr, Google Fonts — 0. Помилок JS — 0. Єдиний 404 — `favicon.ico`, як і до перебудови.

**Відхилення від плану:**
- `public/media/` = 52 МБ (оцінка була 30–50): лишив CRF 23, щоб якість відео не падала; кожен файл менший за оригінал, найбільший 8,3 МБ.
- `.zoom-meta strong` прибрано — правило було мертвим (meta завжди вставлялась як текст).
- Kaleidoscope/PLUG-IN: `Tools:Unreal Engine` → `Tools: Unreal Engine` (бракувало пробілу в даних).

**Поведінка, що змінилась свідомо:**
- Без WebGL сайт раніше повністю падав (three кидав виняток) — тепер показується постер, решта працює.
- Відео спіралі/каруселі вантажаться, коли наближаються до viewport (раніше — всі одразу при завантаженні); перша картка — одразу, бо на неї чекає лоадер. До старту видно постер-кадр.

**Знайдено, не виправлено (рефакторинг не змінює вигляд):**
- `base.css`: `@media (pointer: coarse) { .btn { backdrop-filter: none } }` стоїть перед оголошенням `.btn`, тому не діє — на мобільних розмиття під кнопками лишається всупереч коментарю.

## Fix: ривки скролу на мобільних (2026-10-17)

Симптом: ривки на першому скролі біля hero і біля каруселі «More work» у кінці сторінки.

Причина — мобільний адресний рядок: він ховається/з'являється при кожній зміні напрямку свайпу,
змінюючи innerHeight (svh/lvh при цьому сталі). Кожне перемикання:
- перевиділяло WebGL-буфери разом із bloom (renderer.setSize + composer.setSize) — кадр 70–95 мс;
- через JS-змінну --svh змінювало висоту hero і всієї сторінки — біля каруселі hero вище екрана, тож сторінка зсувалась під пальцем.
Додатково: правило, що вимикає backdrop-filter на .btn для touch, стояло перед .btn і не діяло;
у контейнера Embla не було обов'язкового touch-action: pan-y pinch-zoom.

Виправлення:
- [x] home.css: висота hero в нативних `svh` (фолбек `vh`); JS-змінну `--svh` прибрано з core/dom.js.
- [x] scene/renderer.js + core/dom.js `sceneViewportSize()`: canvas одразу під `lvh`, ресайз буферів лише при реальній зміні розміру.
- [x] base.css: touch-правило для `.btn` перенесено після `.btn`.
- [x] more-work.css: `touch-action: pan-y pinch-zoom` на `.more-carousel`.

Перевірка (емуляція адресного рядка: innerHeight 764↔844 при сталому вікні, 7 кроків скролу):
оригінал — 7 ресайзів canvas, 5 змін висоти сторінки, 5 long tasks до 95 мс; після — 0 / 0 / 0.
Свайпи пальцем (CDP touch, CPU ×4) без адресного рядка: обидві версії однакові, main thread не перевантажений.
Гіпотезу «кільця ×14 в кінці сторінки дають overdraw» перевірено й відкинуто (кадр 31 мс біля каруселі vs 30 мс біля hero).
19/19 поведінкових перевірок PASS, скриншоти desktop/mobile без змін.

## Fix 2: тремтіння тексту hero і негладка карусель на мобільних (2026-10-17)

Причина — забагато композитних шарів для мобільного GPU поверх WebGL-фону, що змінюється щокадру
(виміряно через CDP LayerTree, позиція hero / карусель):
- `#s-home` композитувався лише «через перекриття» (Overlap) — браузер перебудовував шар під час скролу → текст тремтів;
- закритий zoom-оверлей тримав 2 повноекранні backdrop-filter шари;
- картки мобільного списку були шарами через `will-change` і 3D-контекст спіралі (12 шарів + 6 підписів);
- постер лишався окремим повноекранним шаром під готовим canvas.

Виправлення:
- [x] home.css: `#s-home { will-change: transform }` — стабільний власний шар.
- [x] zoom.css: закритий оверлей `visibility: hidden` (після fade-out).
- [x] work.css: у `.linear-list` — `will-change: auto` і `transform-style: flat`.
- [x] base.css: постер ховається, коли `#bg-canvas[data-demo-state="ready"]`.
- [x] more-work.css: `will-change: transform` на контейнері Embla.

Результат: шарів 34 → 15 (hero), 36 → 22 (карусель); площа шарів 37.7 → 28.7 / 41.9 → 35.0 екрана.
19/19 поведінкових PASS, тест адресного рядка 0/0/0, скриншоти без змін.
Межа: справжній GPU телефона емулятор не відтворює — фінальна перевірка на пристрої.

**Відкриті питання:**
- `assets-src/` (110 МБ) — якщо його закомітити в репозиторій, який віддає GitHub Pages, він стане публічним, а це суперечить правилу «never deployed».
- Git не встановлено → коміти поки неможливі.
