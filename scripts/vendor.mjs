// Копіює пінені сторонні ES-модулі з node_modules у vendor/ і шрифти в public/fonts/.
// Запуск: npm install && node scripts/vendor.mjs — результат комітиться, сайт його віддає як є.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NM = path.join(ROOT, 'node_modules');
// Читаємо package.json напряму: three не експортує його через "exports".
const version = pkg => JSON.parse(fs.readFileSync(path.join(NM, pkg, 'package.json'), 'utf8')).version;

function copy(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  console.log(`${path.relative(ROOT, to)}  ${(fs.statSync(to).size / 1024).toFixed(0)} KB`);
}

// three: ядро + лише ті addons, що імпортує сайт, разом з їхніми відносними залежностями.
const THREE_ADDONS = [
  'controls/OrbitControls.js',
  'postprocessing/EffectComposer.js',
  'postprocessing/RenderPass.js',
  'postprocessing/UnrealBloomPass.js',
];
const threeSrc = path.join(NM, 'three');
const threeOut = path.join(ROOT, 'vendor', `three@${version('three')}`);
fs.rmSync(threeOut, { recursive: true, force: true });
copy(path.join(threeSrc, 'build/three.module.min.js'), path.join(threeOut, 'build/three.module.min.js'));
copy(path.join(threeSrc, 'LICENSE'), path.join(threeOut, 'LICENSE'));

const seen = new Set();
(function walk(files) {
  for (const rel of files) {
    if (seen.has(rel)) continue;
    seen.add(rel);
    const from = path.join(threeSrc, 'examples/jsm', rel);
    copy(from, path.join(threeOut, 'examples/jsm', rel));
    const deps = [...fs.readFileSync(from, 'utf8').matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/g)]
      .map(m => path.posix.normalize(path.posix.join(path.posix.dirname(rel), m[1])));
    walk(deps);
  }
})(THREE_ADDONS);

// embla-carousel: ESM-збірка замість UMD-глобала.
const emblaOut = path.join(ROOT, 'vendor', `embla-carousel@${version('embla-carousel')}`);
fs.rmSync(emblaOut, { recursive: true, force: true });
copy(path.join(NM, 'embla-carousel/esm/embla-carousel.esm.js'), path.join(emblaOut, 'embla-carousel.esm.js'));
copy(path.join(NM, 'embla-carousel/esm/embla-carousel.esm.js.map'), path.join(emblaOut, 'embla-carousel.esm.js.map'));
// LICENSE в npm-пакеті embla немає — ліцензія MIT зазначена в його package.json.

// DM Mono (OFL) — ті самі сабсети latin/latin-ext, що віддавав Google Fonts.
const fontsOut = path.join(ROOT, 'public', 'fonts');
for (const subset of ['latin', 'latin-ext']) {
  for (const weight of [300, 400]) {
    const name = `dm-mono-${subset}-${weight}-normal.woff2`;
    copy(path.join(NM, '@fontsource/dm-mono/files', name), path.join(fontsOut, name));
  }
}
copy(path.join(NM, '@fontsource/dm-mono/LICENSE'), path.join(fontsOut, 'DM-Mono-OFL.txt'));
