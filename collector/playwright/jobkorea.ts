import { chromium } from 'playwright';
import { politeDelay, today, parseDeadline, extractStack } from '../utils.js';
import type { RawJob } from '../types.js';

const BASE = 'https://www.jobkorea.co.kr';
const KEYWORDS = [
  '데이터 사이언티스트',
  '데이터 분석가',
  'ML엔지니어',
  '데이터 엔지니어',
  '신입 공채 데이터',
  '대기업 데이터 분석',
];

export async function fetchJobKoreaPlaywright(): Promise<RawJob[]> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'ko-KR',
  });
  const jobs: RawJob[] = [];

  try {
    for (const kw of KEYWORDS) {
      const page = await context.newPage();
      try {
        const url = `${BASE}/Search/?stext=${encodeURIComponent(kw)}&tabType=recruit&Page_No=1`;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // JobKorea is a Tailwind SPA — no semantic class names, use structural selectors
        await page
          .waitForSelector('div[class*="rounded-2xl"][class*="shadow-list"]', { timeout: 10000 })
          .catch(() => null);

        const items = await page.$$eval(
          'div[class*="rounded-2xl"][class*="shadow-list"]',
          (els: Element[]) =>
            els.map((el) => {
              // Each card has 3 <a> links pointing to the same /Recruit/GI_Read/ID URL:
              // links[0] = logo/image, links[1] = title, links[2] = company
              const links = Array.from(el.querySelectorAll<HTMLAnchorElement>('a[href*="/Recruit/GI_Read/"]'));
              const href = links[0]?.href ?? '';
              const idMatch = href.match(/\/GI_Read\/(\d+)/i);
              const title = links[1]?.textContent?.trim() ?? '';
              const company = links[2]?.textContent?.trim() ?? '';

              // Spans: [badge, "스크랩", title-dup, company-dup, company-dup2, location, categories, experience]
              const spans = Array.from(el.querySelectorAll('span')).map(
                (s) => s.textContent?.trim() ?? ''
              );
              const location = spans[5] ?? '서울';
              const experience = spans[7] ?? '경력 무관';

              const deadlineText =
                el.querySelector('[class*="deadline"], [class*="date"], [class*="period"]')
                  ?.textContent?.trim() ?? '';

              return { title, company, href, jobId: idMatch?.[1] ?? '', location, experience, deadlineText };
            }) as {
              title: string;
              company: string;
              href: string;
              jobId: string;
              location: string;
              experience: string;
              deadlineText: string;
            }[]
        );

        for (const item of items) {
          if (!item.title || !item.href) continue;
          // Strip query string to get clean canonical URL
          const cleanUrl = item.href.split('?')[0];
          jobs.push({
            id: `jobkorea-${item.jobId || encodeURIComponent(item.title).slice(0, 16)}`,
            source: 'jobkorea',
            title: item.title,
            company: item.company,
            location: item.location,
            experience: item.experience,
            stack: extractStack(item.title),
            url: cleanUrl,
            postedAt: today(),
            deadline: parseDeadline(item.deadlineText),
          });
        }
        console.log(`[jobkorea] "${kw}" → ${items.filter((i) => i.title).length}건`);
      } catch (e) {
        console.warn(`[jobkorea] "${kw}" 실패:`, e);
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
