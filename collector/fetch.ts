/**
 * 플랫폼별 채용공고 수집.
 *
 * 원티드·점핏·프로그래머스: 내부 JSON API (Playwright 불필요).
 * 잡코리아·사람인·피플앤잡·링크드인·로켓펀치: Playwright 헤드리스 (ENABLE_PLAYWRIGHT 시 활성화).
 * 실패 시 해당 플랫폼 결과를 빈 배열로 처리하고 계속 진행.
 */

import { politeDelay, extractStack, today } from './utils.js';
import type { RawJob } from './types.js';

// 데이터/ML/개발 직무 기본 키워드
const KEYWORDS = [
  '데이터 사이언티스트',
  '데이터 분석',
  'ML 엔지니어',
  '데이터 엔지니어',
  '머신러닝',
  '백엔드 개발자',
];

// 대기업·공채 특화 키워드 (원티드·점핏·프로그래머스에만 추가 적용)
const BIGCO_KEYWORDS = [
  '신입 공채',
  '데이터 공채',
  '네이버 데이터',
  '카카오 데이터',
  '쿠팡 데이터',
  '라인 데이터',
  '토스 데이터',
];

// ───────────────────────────────────────────
// 원티드 내부 API
// ───────────────────────────────────────────
async function fetchWanted(): Promise<RawJob[]> {
  const jobs: RawJob[] = [];
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (compatible; SiheonJobFinder/1.0; +https://github.com/jgjeong730/jobseek)',
    Accept: 'application/json',
    'Wanted-Client-Id': 'undefined',
  };

  for (const kw of [...KEYWORDS, ...BIGCO_KEYWORDS]) {
    try {
      const url = `https://www.wanted.co.kr/api/v4/jobs?country=kr&job_sort=job.latest_order&limit=20&tag_type_ids=&years=-1&query=${encodeURIComponent(kw)}`;
      const res = await fetch(url, { headers });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        data: {
          id: number;
          position: string;
          company: { name: string };
          address: { location: string };
          experience_level: { display: string };
          skill_tags: { title: string }[];
          due_time?: string;
        }[];
      };
      for (const item of data.data ?? []) {
        jobs.push({
          id: `wanted-${item.id}`,
          source: 'wanted',
          title: item.position,
          company: item.company?.name ?? '',
          location: item.address?.location ?? '서울',
          experience: item.experience_level?.display ?? '경력 무관',
          stack: item.skill_tags?.map((t) => t.title) ?? [],
          url: `https://www.wanted.co.kr/wd/${item.id}`,
          postedAt: today(),
          deadline: item.due_time ? item.due_time.slice(0, 10) : undefined,
        });
      }
    } catch (e) {
      console.warn(`[wanted] "${kw}" 수집 실패:`, e);
    }
    await politeDelay();
  }
  return jobs;
}

// ───────────────────────────────────────────
// 점핏 내부 API
// ───────────────────────────────────────────
async function fetchJumpit(): Promise<RawJob[]> {
  const jobs: RawJob[] = [];
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (compatible; SiheonJobFinder/1.0; +https://github.com/jgjeong730/jobseek)',
    Accept: 'application/json',
    Referer: 'https://www.jumpit.co.kr/',
  };

  for (const kw of [...KEYWORDS, ...BIGCO_KEYWORDS]) {
    try {
      const url = `https://api.jumpit.co.kr/api/positions?sort=reg_dt&keyword=${encodeURIComponent(kw)}&page=1`;
      const res = await fetch(url, { headers });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        result?: {
          positions?: {
            id: number;
            title: string;
            companyName: string;
            locations: string[];
            career: string;
            techStacks: string[];
            closedAt?: string;
          }[];
        };
      };
      for (const item of data.result?.positions ?? []) {
        jobs.push({
          id: `jumpit-${item.id}`,
          source: 'jumpit',
          title: item.title,
          company: item.companyName,
          location: item.locations?.[0] ?? '서울',
          experience: item.career ?? '경력 무관',
          stack: item.techStacks ?? [],
          url: `https://www.jumpit.co.kr/position/${item.id}`,
          postedAt: today(),
          deadline: item.closedAt ? item.closedAt.slice(0, 10) : undefined,
        });
      }
    } catch (e) {
      console.warn(`[jumpit] "${kw}" 수집 실패:`, e);
    }
    await politeDelay();
  }
  return jobs;
}

// ───────────────────────────────────────────
// 프로그래머스 커리어 API
// ───────────────────────────────────────────
async function fetchProgrammers(): Promise<RawJob[]> {
  const jobs: RawJob[] = [];
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (compatible; SiheonJobFinder/1.0; +https://github.com/jgjeong730/jobseek)',
    Accept: 'application/json',
  };

  for (const kw of [...KEYWORDS, ...BIGCO_KEYWORDS]) {
    try {
      const url = `https://career.programmers.co.kr/api/job_positions?order=recent&page=1&per_page=20&q=${encodeURIComponent(kw)}`;
      const res = await fetch(url, { headers });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        jobPositions?: {
          id: number;
          name: string;
          company: { name: string };
          cities: string[];
          careerRange: string;
          technicalTags: string[];
          closedAt?: string;
        }[];
      };
      for (const item of data.jobPositions ?? []) {
        const stackFromTags = item.technicalTags ?? [];
        jobs.push({
          id: `programmers-${item.id}`,
          source: 'programmers',
          title: item.name,
          company: item.company?.name ?? '',
          location: item.cities?.[0] ?? '서울',
          experience: item.careerRange ?? '경력 무관',
          stack: stackFromTags.length ? stackFromTags : extractStack(item.name),
          url: `https://career.programmers.co.kr/job_positions/${item.id}`,
          postedAt: today(),
          deadline: item.closedAt ? item.closedAt.slice(0, 10) : undefined,
        });
      }
    } catch (e) {
      console.warn(`[programmers] "${kw}" 수집 실패:`, e);
    }
    await politeDelay();
  }
  return jobs;
}

// ───────────────────────────────────────────
// Playwright 기반 플랫폼들 (ENABLE_PLAYWRIGHT 필요)
// ───────────────────────────────────────────
async function fetchPlaywright(
  label: string,
  importPath: string,
  exportName: string
): Promise<RawJob[]> {
  if (!process.env.ENABLE_PLAYWRIGHT) {
    console.log(`[${label}] ENABLE_PLAYWRIGHT 미설정, 스킵`);
    return [];
  }
  try {
    const mod = await import(importPath);
    return (mod[exportName] as () => Promise<RawJob[]>)();
  } catch (e) {
    console.warn(`[${label}] Playwright 수집 실패:`, e);
    return [];
  }
}

const fetchSaramin = () =>
  fetchPlaywright('saramin', './playwright/saramin.js', 'fetchSaraminPlaywright');

const fetchJobKorea = () =>
  fetchPlaywright('jobkorea', './playwright/jobkorea.js', 'fetchJobKoreaPlaywright');

const fetchPeopleNJob = () =>
  fetchPlaywright('peoplenjob', './playwright/peoplenjob.js', 'fetchPeopleNJobPlaywright');

// LinkedIn·Rocketpunch: 로그인 필수 — 항상 [] 반환하므로 수집 제외

// ───────────────────────────────────────────
// 통합 진입점
// ───────────────────────────────────────────
const SOURCES = [
  { label: 'wanted',      fn: fetchWanted },
  { label: 'jumpit',      fn: fetchJumpit },
  { label: 'programmers', fn: fetchProgrammers },
  { label: 'saramin',     fn: fetchSaramin },
  { label: 'jobkorea',    fn: fetchJobKorea },
  { label: 'peoplenjob',  fn: fetchPeopleNJob },
] as const;

export async function fetchAllJobs(): Promise<RawJob[]> {
  console.log('수집 시작…');
  const settled = await Promise.allSettled(SOURCES.map((s) => s.fn()));
  const results: RawJob[] = [];
  for (let i = 0; i < SOURCES.length; i++) {
    const r = settled[i];
    if (r.status === 'fulfilled') {
      console.log(`[${SOURCES[i].label}] ${r.value.length}건 수집`);
      results.push(...r.value);
    } else {
      console.warn(`[${SOURCES[i].label}] 실패:`, r.reason);
    }
  }
  console.log(`수집 완료: 총 ${results.length}건 (중복 제거 전)`);
  return results;
}
