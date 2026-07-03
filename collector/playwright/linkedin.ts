/**
 * LinkedIn 공개 구직 검색 (로그인 불필요).
 * 로그인 없이 접근 가능한 공개 jobs/search 페이지만 사용.
 * LinkedIn ToS §8.2: 자동화 스크래핑 금지 명시. 수집 빈도를 최소화하고
 * politeDelay를 적용해 서버 부하를 줄입니다.
 */
import { chromium } from 'playwright';
import { politeDelay, today, extractStack } from '../utils.js';
import type { RawJob } from '../types.js';

const BASE = 'https://www.linkedin.com';
// 검색 범위: 서울/Korea, 최근 30일
const QUERIES = [
  'data scientist Korea',
  'data analyst Seoul',
  'ML engineer Seoul',
  'data engineer Seoul',
];

export async function fetchLinkedInPlaywright(): Promise<RawJob[]> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'ko-KR',
  });
  const jobs: RawJob[] = [];

  try {
    for (const q of QUERIES) {
      const page = await context.newPage();
      try {
        const url =
          `${BASE}/jobs/search?keywords=${encodeURIComponent(q)}` +
          `&location=South+Korea&f_TPR=r2592000&position=1&pageNum=0`;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page
          .waitForSelector('.job-search-card, .jobs-search__results-list li', {
            timeout: 10000,
          })
          .catch(() => null);

        const items = await page.$$eval(
          '.job-search-card, .jobs-search__results-list li',
          (els: Element[]) =>
            els.map((el) => {
              const titleEl = el.querySelector(
                '.job-search-card__title a, h3 a, .base-search-card__title a'
              );
              const compEl = el.querySelector(
                '.job-search-card__company-name, .base-search-card__subtitle a, .base-search-card__subtitle'
              );
              const locEl = el.querySelector(
                '.job-search-card__location, .job-search-card__location'
              );
              const timeEl = el.querySelector('time');
              const href =
                titleEl?.getAttribute('href') ??
                el.querySelector('a')?.getAttribute('href') ??
                '';
              return {
                title: titleEl?.textContent?.trim() ?? '',
                company: compEl?.textContent?.trim() ?? '',
                location: locEl?.textContent?.trim() ?? 'Seoul',
                postedTime: timeEl?.getAttribute('datetime') ?? '',
                href,
                text: el.textContent?.slice(0, 200) ?? '',
              };
            }) as {
              title: string;
              company: string;
              location: string;
              postedTime: string;
              href: string;
              text: string;
            }[]
        );

        for (const item of items) {
          if (!item.title || !item.href) continue;
          // href가 상대경로일 수 있음
          const absUrl = item.href.startsWith('http')
            ? item.href
            : BASE + item.href;
          // LinkedIn job ID는 URL 끝의 숫자
          const idMatch = item.href.match(/(\d{10,})/);
          jobs.push({
            id: `linkedin-${idMatch?.[1] ?? encodeURIComponent(item.title + item.company).slice(0, 16)}`,
            source: 'linkedin',
            title: item.title,
            company: item.company,
            location: item.location,
            experience: '경력 무관',
            stack: extractStack(item.text),
            url: absUrl,
            postedAt: item.postedTime || today(),
          });
        }
      } catch (e) {
        console.warn(`[linkedin] "${q}" 실패:`, e);
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
