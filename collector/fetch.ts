/**
 * 플랫폼별 채용공고 수집.
 *
 * 원티드·점핏·프로그래머스: 각 플랫폼의 내부 JSON API 직접 호출 (Playwright 불필요).
 * 실패 시 해당 플랫폼 결과를 빈 배열로 처리하고 계속 진행.
 *
 * robots.txt 존중:
 *  - 원티드: /api/* 크롤 금지 명시 없음 (2024 robots.txt 기준)
 *  - 점핏: /api/* 비명시
 *  - 프로그래머스: 공개 페이지 기반
 * 요청 간 딜레이 2~3초 적용.
 */

import { politeDelay, extractStack, today } from './utils.js';
import type { RawJob } from './types.js';

const KEYWORDS = [
  '데이터 사이언티스트',
  '데이터 분석',
  'ML 엔지니어',
  '데이터 엔지니어',
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

  for (const kw of KEYWORDS) {
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

  for (const kw of KEYWORDS) {
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

  for (const kw of KEYWORDS) {
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
          jobCategories: string[];
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
// 사람인 공개 채용공고 검색 (HTML 기반 → Playwright 사용)
// 사람인은 API 계약 없이 사용 가능한 공개 엔드포인트가 없어
// Playwright 헤드리스로 폴백. 기본은 스킵 처리 후 Actions에서 활성화.
// ───────────────────────────────────────────
async function fetchSaramin(): Promise<RawJob[]> {
  // Playwright 의존 — Actions 환경에서만 실행
  if (!process.env.ENABLE_PLAYWRIGHT) {
    console.log('[saramin] ENABLE_PLAYWRIGHT 미설정, 스킵');
    return [];
  }
  try {
    const { fetchSaraminPlaywright } = await import('./playwright/saramin.js');
    return fetchSaraminPlaywright();
  } catch (e) {
    console.warn('[saramin] Playwright 수집 실패:', e);
    return [];
  }
}

// ───────────────────────────────────────────
// 통합 진입점
// ───────────────────────────────────────────
export async function fetchAllJobs(): Promise<RawJob[]> {
  console.log('수집 시작…');
  const [wanted, jumpit, programmers, saramin] = await Promise.allSettled([
    fetchWanted(),
    fetchJumpit(),
    fetchProgrammers(),
    fetchSaramin(),
  ]);

  const results: RawJob[] = [];
  for (const [label, r] of [
    ['wanted', wanted],
    ['jumpit', jumpit],
    ['programmers', programmers],
    ['saramin', saramin],
  ] as const) {
    if (r.status === 'fulfilled') {
      console.log(`[${label}] ${r.value.length}건 수집`);
      results.push(...r.value);
    } else {
      console.warn(`[${label}] 실패:`, r.reason);
    }
  }
  console.log(`수집 완료: 총 ${results.length}건 (중복 제거 전)`);
  return results;
}
