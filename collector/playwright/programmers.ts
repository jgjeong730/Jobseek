/**
 * 프로그래머스 커리어 — Playwright로 SPA를 로드하고 내부 API 응답을 인터셉트.
 * 직접 fetch는 Actions IP에서 차단되므로 브라우저 경유로 우회.
 */
import { chromium } from 'playwright';
import { politeDelay, today, extractStack } from '../utils.js';
import type { RawJob } from '../types.js';

const KEYWORDS = [
  '데이터 사이언티스트',
  '데이터 분석',
  'ML 엔지니어',
  '데이터 엔지니어',
  '머신러닝',
  '백엔드 개발자',
];

interface ProgrammersJob {
  id: number;
  name: string;
  company: { name: string };
  cities?: string[];
  careerRange?: string;
  technicalTags?: string[];
  closedAt?: string;
}

export async function fetchProgrammersPlaywright(): Promise<RawJob[]> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'ko-KR',
  });
  const jobs: RawJob[] = [];
  const seen = new Set<string>();

  try {
    for (const kw of KEYWORDS) {
      const page = await context.newPage();
      const collected: ProgrammersJob[] = [];

      // SPA가 페이지 로드 시 호출하는 API 응답을 인터셉트
      page.on('response', async (res) => {
        try {
          if (res.url().includes('/api/job_positions') && res.status() === 200) {
            const data = (await res.json()) as { jobPositions?: ProgrammersJob[] };
            collected.push(...(data.jobPositions ?? []));
          }
        } catch {
          // JSON 파싱 실패 시 무시
        }
      });

      try {
        const url = `https://career.programmers.co.kr/job_positions?page=1&q[keyword_cont]=${encodeURIComponent(kw)}`;
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

        for (const item of collected) {
          const key = `programmers-${item.id}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const stackFromTags = item.technicalTags ?? [];
          jobs.push({
            id: key,
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
        console.log(`[programmers] "${kw}" → ${collected.length}건`);
      } catch (e) {
        console.warn(`[programmers] "${kw}" 실패:`, e);
      } finally {
        await page.close();
      }
      await politeDelay();
    }
  } finally {
    await browser.close();
  }
  return jobs;
}
