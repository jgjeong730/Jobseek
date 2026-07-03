// data/jobs.json 을 public/data/jobs.json 으로 복사해 Vite 정적 서빙 대상에 포함시킨다.
// dev/build 전에 실행되어 대시보드가 런타임 fetch로 최신 데이터를 읽을 수 있게 한다.
import { mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(root, 'data/jobs.json');
const dest = resolve(root, 'public/data/jobs.json');

if (!existsSync(src)) {
  console.warn(`[copy-data] source not found: ${src}`);
  process.exit(0);
}

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log(`[copy-data] ${src} -> ${dest}`);
