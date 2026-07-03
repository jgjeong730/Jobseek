/**
 * 사람인 Playwright 수집.
 * robots.txt: /zf_user/search/job-search 는 크롤 금지 명시 없음.
 * 요청 간 딜레이 2~3초 적용, User-Agent 명시.
 */
import { chromium } from 'playwright';
import { politeDelay, today } from '../utils.js';
import type { RawJob } from '../types.js';

const KEYWORDS = ['데이터 사이언티스트', '데이터 분석가', 'ML엔지니어', '데이터 엔지니어'];

export async function fetchSaraminPlaywright(): Promise<RawJob[]> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (compatible; SiheonJobFinder/1.0; +https://github.com/jgjeong730/jobseek)',
  });
  const jobs: RawJob[] = [];

  try {
    for (const kw of KEYWORDS) {
      const page = await context.newPage();
      try {
        const url = `https://www.saramin.co.kr/zf_user/search/recruit?searchType=search&searchword=${encodeURIComponent(kw)}&recruitPage=1&recruitPageCount=20`;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        const items = await page.$$eval(
          '.item_recruit',
          (els: Element[]) =>
            els.map((el) => {
              const titleEl = el.querySelector('.job_tit a');
              const compEl = el.querySelector('.corp_name a');
              const locEl = el.querySelector('.job_condition span:first-child');
              const expEl = el.querySelector('.job_condition span:nth-child(2)');
              const href = titleEl?.getAttribute('href') ?? '';
              const idMatch = href.match(/rec_idx=(\d+)/);
              return {
                id: idMatch?.[1] ?? Math.random().toString(36).slice(2),
                title: titleEl?.textContent?.trim() ?? '',
                company: compEl?.textContent?.trim() ?? '',
                location: locEl?.textContent?.trim() ?? '서울',
                experience: expEl?.textContent?.trim() ?? '경력 무관',
                url: href.startsWith('http')
                  ? href
                  : `https://www.saramin.co.kr${href}`,
              };
            }) as {
              id: string;
              title: string;
              company: string;
              location: string;
              experience: string;
              url: string;
            }[]
        );

        for (const item of items) {
          if (!item.title) continue;
          jobs.push({
            id: `saramin-${item.id}`,
            source: 'saramin',
            title: item.title,
            company: item.company,
            location: item.location,
            experience: item.experience,
            stack: [],
            url: item.url,
            postedAt: today(),
          });
        }
      } catch (e) {
        console.warn(`[saramin/playwright] "${kw}" 실패:`, e);
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
