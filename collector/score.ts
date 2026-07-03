/**
 * 규칙 기반 채점 — Claude API 불필요, 완전 무료.
 * CLAUDE.md 채점 기준을 TypeScript 로직으로 직접 구현.
 *
 * 직무 적합도 35 / 경력 요건 매칭 20 / 기술스택 겹침 25 / 영어 활용 10 / 지역 10
 * Salesforce CS 직무 -30 페널티
 */
import type { RawJob, Job } from './types.js';

// 시헌 보유 기술스택 (소문자, 공백 제거 정규화 후 비교)
const MY_STACK = [
  'python', 'r', 'sql', 'machinelearning', 'ml', 'deeplearning', 'dl',
  'tensorflow', 'pytorch', 'keras', 'scikitlearn', 'xgboost',
  'pandas', 'numpy', 'matplotlib', 'seaborn',
  'tableau', 'powerbi', 'excel', 'looker',
  '데이터시각화', '시각화',
];

// ── 직무 적합도 (35점) ───────────────────────────────────
const JOB_TIERS: { score: number; label: string; re: RegExp }[] = [
  {
    score: 35,
    label: 'DS/ML 핵심 직무',
    re: /데이터\s*사이언티스트|data\s*scientist|ml\s*엔지니어|ml\s*engineer|머신\s*러닝|machine\s*learning|딥\s*러닝|deep\s*learning|ai\s*엔지니어|ai\s*engineer|llm|생성형\s*ai|generative\s*ai/i,
  },
  {
    score: 25,
    label: '데이터 분석/엔지니어',
    re: /데이터\s*분석|data\s*anal|비즈니스\s*분석|데이터\s*엔지니어|data\s*engineer|bi\s*analyst|analytics|etl|데이터\s*파이프|spark|airflow|mlops/i,
  },
  {
    score: 15,
    label: '백엔드/SW 개발',
    re: /백엔드|back.?end|서버\s*개발|software\s*engineer|sw\s*개발|웹\s*개발|풀스택|full.?stack|django|fastapi|spring|node\.?js/i,
  },
];

function calcJobScore(job: RawJob): { score: number; label: string } {
  const text = `${job.title} ${job.stack.join(' ')}`;
  for (const tier of JOB_TIERS) {
    if (tier.re.test(text)) return { score: tier.score, label: tier.label };
  }
  return { score: 0, label: '직무 미매칭' };
}

// ── 경력 요건 (20점) ─────────────────────────────────────
function calcExpScore(exp: string): { score: number; label: string } {
  const e = exp.replace(/\s/g, '').toLowerCase();
  if (/신입|무관|경력무관|0년|entry|junior/.test(e)) return { score: 20, label: '신입/무관' };
  if (/[12]년이하|0[~-][12]|1[~-]2/.test(e)) return { score: 20, label: '1~2년' };
  if (/3년/.test(e)) return { score: 12, label: '3년' };
  if (/4년/.test(e)) return { score: 5, label: '4년' };
  if (/[5-9]년|10년|시니어|senior/.test(e)) return { score: 0, label: '5년+' };
  return { score: 14, label: '불명확' };
}

// ── 기술스택 겹침 (25점) ─────────────────────────────────
function calcStackScore(stack: string[]): { score: number; count: number } {
  if (stack.length === 0) return { score: 2, count: 0 };
  const norm = (s: string) => s.toLowerCase().replace(/[\s.\-_+#]/g, '');
  const jobNorm = stack.map(norm);
  let count = 0;
  for (const mine of MY_STACK) {
    const m = norm(mine);
    if (jobNorm.some((j) => j.includes(m) || m.includes(j))) count++;
  }
  const score = count >= 4 ? 25 : count >= 2 ? 18 : count >= 1 ? 10 : 2;
  return { score, count };
}

// ── 영어 활용 가점 (10점) ────────────────────────────────
function calcEngScore(job: RawJob): { score: number; flag: boolean } {
  if (job.source === 'linkedin' || job.source === 'peoplenjob') return { score: 10, flag: true };
  const text = `${job.title} ${job.company}`.toLowerCase();
  if (/영어|english|글로벌|global|외국계|international|multinational/.test(text))
    return { score: 8, flag: true };
  return { score: 0, flag: false };
}

// ── 지역 (10점) ──────────────────────────────────────────
function calcLocScore(location: string): number {
  const l = location.toLowerCase();
  if (/서울|seoul|강남|종로|여의도|판교|성남|분당|수원|광교|용인|인천|경기/.test(l)) return 10;
  if (/수도권|재택|remote/.test(l)) return 8;
  return 0;
}

// ── 플래그 ───────────────────────────────────────────────
function detectFlags(job: RawJob, engFlag: boolean): string[] {
  const flags: string[] = [];
  const all = `${job.title} ${job.experience} ${job.company} ${job.stack.join(' ')}`.toLowerCase();

  if (/salesforce/.test(all) && /운영|cs\b|고객|지원|support|어드민|admin/.test(all))
    flags.push('salesforce_cs');

  if (/[5-9]년|10년|시니어|senior/.test(job.experience.toLowerCase()))
    flags.push('senior_required');

  if (/^(영업|마케팅|sales|marketing)/i.test(job.title) &&
      !/데이터|분석|개발|엔지니어|analyst|engineer/.test(job.title.toLowerCase()))
    flags.push('non_tech');

  if (engFlag) flags.push('english_plus');

  return flags;
}

// ── 이유 생성 ────────────────────────────────────────────
function buildReason(
  jobLabel: string,
  expLabel: string,
  stackCount: number,
  engFlag: boolean,
  flags: string[]
): string {
  const parts = [jobLabel];
  if (stackCount >= 2) parts.push(`스택 ${stackCount}개 일치`);
  else if (stackCount === 1) parts.push('스택 1개 일치');
  else parts.push('스택 정보 부족');
  parts.push(`경력 ${expLabel}`);
  if (engFlag) parts.push('영어 가점');
  if (flags.includes('salesforce_cs')) parts.push('SF CS 감점(-30)');
  return parts.join(' · ');
}

// ── 메인 채점 함수 (동기, API 불필요) ───────────────────
export function scoreJobs(rawJobs: RawJob[]): Job[] {
  return rawJobs.map((job) => {
    const j = calcJobScore(job);
    const e = calcExpScore(job.experience);
    const s = calcStackScore(job.stack);
    const eng = calcEngScore(job);
    const loc = calcLocScore(job.location);
    const flags = detectFlags(job, eng.flag);

    let total = j.score + e.score + s.score + eng.score + loc;
    if (flags.includes('salesforce_cs')) total -= 30;
    total = Math.max(0, Math.min(100, total));

    return {
      ...job,
      score: total,
      reason: buildReason(j.label, e.label, s.count, eng.flag, flags),
      flags,
    };
  });
}
