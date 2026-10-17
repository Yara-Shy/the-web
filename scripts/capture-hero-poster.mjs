// Знімає кадр фонової сцени (вгорі сторінки) → public/media/hero-poster.webp.
// Потрібні: запущений локальний сервер (npm run serve), Microsoft Edge, ffmpeg.
// Запуск: node scripts/capture-hero-poster.mjs [url]
import { chromium } from 'playwright-core';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const URL_ = process.argv[2] || 'http://127.0.0.1:8080/';
const OUT = path.join(ROOT, 'public', 'media', 'hero-poster.webp');
const SIZE = { width: 1600, height: 1000 };

const browser = await chromium.launch({ channel: 'msedge', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: SIZE });
await page.goto(URL_, { waitUntil: 'load' });
await page.waitForSelector('#bg-canvas[data-demo-state="ready"]', { timeout: 30000 });
await page.waitForFunction(() => document.getElementById('loader')?.classList.contains('hide'), null, { timeout: 30000 });
// Лишаємо тільки canvas: постер має бути чистим кадром сцени.
await page.addStyleTag({ content: 'body > :not(#bg-canvas) { visibility: hidden !important; }' });
await page.waitForTimeout(2500);

const png = path.join(os.tmpdir(), `hero-poster-${Date.now()}.png`);
await page.locator('#bg-canvas').screenshot({ path: png });
await browser.close();

const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', png, '-c:v', 'libwebp', '-quality', '72', OUT], { stdio: 'inherit' });
fs.rmSync(png, { force: true });
if (r.status !== 0) throw new Error('ffmpeg failed');
console.log(`${path.relative(ROOT, OUT)}  ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`);
