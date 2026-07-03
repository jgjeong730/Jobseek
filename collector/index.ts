/**
 * 수집 파이프라인 진입점.
 * fetch → dedupe → score → data/jobs.json 저장
 * 실행: npx tsx collector/index.ts
 */
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { fetchAllJobs } from './fetch.js';
import { dedupe } from './dedupe.js';
import { scoreJobs } from './score.js';
import type { JobsFile } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = resolve(__dirname, '..', 'data');
const OUT_PATH = resolve(DATA_DIR, 'jobs.json');

async function main() {
  console.log('=== Siheon Job Finder 수집 시작 ===');
  const startedAt = Date.now();

  // 1. 수집
  const raw = await fetchAllJobs();

  // 2. 중복 제거
  const unique = dedupe(raw);
  console.log(`중복 제거: ${raw.length}건 → ${unique.length}건`);

  // 2-1. 마감된 공고 제외
  const today = new Date().toISOString().slice(0, 10);
  const active = unique.filter((j) => !j.deadline || j.deadline >= today);
  const expired = unique.length - active.length;
  if (expired > 0) console.log(`마감 공고 제외: ${expired}건 → ${active.length}건 남음`);

  // 3. 채점 (규칙 기반, API 불필요)
  const scored = scoreJobs(active);
  console.log(`채점 완료: ${scored.length}건`);

  // 4. 점수 내림차순 정렬
  scored.sort((a, b) => b.score - a.score);

  // 5. 저장
  const output: JobsFile = {
    updatedAt: new Date().toISOString(),
    jobs: scored,
  };

  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), 'utf-8');

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`\n저장 완료: ${OUT_PATH} (${elapsed}초)`);
  console.log(`\n상위 추천 공고:`);
  scored.slice(0, 5).forEach((j, i) =>
    console.log(`  ${i + 1}. [${j.score}점] ${j.title} @ ${j.company} (${j.source})`)
  );
}

main().catch((e) => {
  console.error('[collect] 오류:', e);
  process.exit(1);
});
