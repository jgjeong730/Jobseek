import type { JobCategory, JobsFile } from './types';

// jobs.json 을 런타임에 fetch. base 경로(BASE_URL)를 존중하고 캐시 버스팅.
export async function loadJobs(): Promise<JobsFile> {
  const url = `${import.meta.env.BASE_URL}data/jobs.json?t=${Date.now()}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`jobs.json 로드 실패: ${res.status}`);
  }
  return (await res.json()) as JobsFile;
}

// 직무 제목/스택으로 대략적 카테고리 추론 (필터용).
export function categorize(title: string): JobCategory {
  const t = title.toLowerCase();
  if (
    /(데이터\s*사이언|data\s*scien|머신러닝|machine\s*learning|\bml\b|딥러닝|deep\s*learning)/.test(
      t
    )
  ) {
    return 'data-science';
  }
  if (/(데이터\s*분석|data\s*analy|데이터\s*엔지니어|data\s*engineer|분석가)/.test(t)) {
    return 'data-analysis';
  }
  if (/(백엔드|backend|서버|server|소프트웨어|software|개발자|engineer|developer)/.test(t)) {
    return 'backend';
  }
  return 'other';
}

export const CATEGORY_LABELS: Record<JobCategory, string> = {
  'data-science': '데이터 사이언스 / ML',
  'data-analysis': '데이터 분석 / 엔지니어',
  backend: '백엔드 / SW',
  other: '기타',
};

export const SOURCE_LABELS: Record<string, string> = {
  wanted: '원티드',
  jumpit: '점핏',
  programmers: '프로그래머스',
  jobkorea: '잡코리아',
  saramin: '사람인',
  linkedin: '링크드인',
  rocketpunch: '로켓펀치',
  peoplenjob: '피플앤잡',
};

export type ExperienceFilter = 'all' | 'entry' | 'any' | 'experienced';

export const EXPERIENCE_LABELS: Record<ExperienceFilter, string> = {
  all: '전체',
  entry: '신입 포함',
  any: '경력 무관',
  experienced: '경력직만',
};

export function categorizeExperience(exp: string): 'entry' | 'any' | 'experienced' {
  if (!exp) return 'any';
  if (/무관|관계없|상관없/.test(exp)) return 'any';
  if (/신입/.test(exp)) return 'entry';
  return 'experienced';
}
