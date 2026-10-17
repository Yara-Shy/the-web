// Кодує оригінали з assets-src/ в оптимізовані файли public/media/ за scripts/media.manifest.mjs.
// Потрібен ffmpeg у PATH. Запуск: node scripts/encode-media.mjs [--force]
// Пропускає файли, де результат новіший за оригінал, тож повторний запуск дешевий.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MEDIA } from './media.manifest.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'assets-src');
const OUT = path.join(ROOT, 'public', 'media');
const FORCE = process.argv.includes('--force');

const VIDEO_EXT = new Set(['.mp4', '.mov', '.webm']);

// Відео на сайті завжди muted — аудіодоріжку не тягнемо (-an).
const H264 = ['-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an'];

function jobsFor(src, out) {
  if (VIDEO_EXT.has(path.extname(src).toLowerCase())) {
    return [
      { out: `${out}.mp4`,         args: ['-vf', "scale='min(1920,iw)':-2", '-crf', '23', ...H264] },
      // Заміна Cloudinary-трансформації q_auto:eco,w_720 для слабких/мобільних пристроїв.
      { out: `${out}-720.mp4`,     args: ['-vf', 'scale=720:-2', '-crf', '27', ...H264] },
      { out: `${out}-poster.webp`, args: ['-frames:v', '1', '-vf', "scale='min(1280,iw)':-2", '-c:v', 'libwebp', '-quality', '78'] },
    ];
  }
  return [
    { out: `${out}.webp`, args: ['-vf', "scale='min(1920,iw)':'min(1920,ih)':force_original_aspect_ratio=decrease", '-c:v', 'libwebp', '-quality', '82'] },
  ];
}

function ffmpeg(input, output, args) {
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', input, ...args, output], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${input} → ${output}`);
}

function probe(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  return r.stdout.trim();
}

const rows = [];
for (const [srcRel, outRel] of Object.entries(MEDIA)) {
  const input = path.join(SRC, srcRel);
  if (!fs.existsSync(input)) throw new Error(`missing source: assets-src/${srcRel}`);
  for (const job of jobsFor(srcRel, outRel)) {
    const output = path.join(OUT, job.out);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    const fresh = fs.existsSync(output) && fs.statSync(output).mtimeMs >= fs.statSync(input).mtimeMs;
    if (FORCE || !fresh) {
      process.stdout.write(`encode ${job.out}\n`);
      ffmpeg(input, output, job.args);
    }
    rows.push({ file: job.out, kb: Math.round(fs.statSync(output).size / 1024), size: probe(output) });
  }
}

const total = rows.reduce((s, r) => s + r.kb, 0);
console.table(rows);
console.log(`public/media: ${rows.length} files, ${(total / 1024).toFixed(1)} MB`);
