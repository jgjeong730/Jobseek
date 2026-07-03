import { chromium } from 'playwright';
import { politeDelay, today, normalizeUrl, parseDeadline } from '../utils.js';
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
      'Mozilla/5.0 (compatible; SiheonJobFinder/1.0; +https://github.com/jgjeong730/jobseek)',
  });
  const jobs: RawJob[] = [];

  try {
    for (const kw of KEYWORDS) {
      const page = await context.newPage();
      try {
        const url = `${BASE}/Search/?stext=${encodeURIComponent(kw)}&tabType=recruit&Page_No=1`;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForSelector('.list-default', { timeout: 10000 }).catch(() => null);

        const items = await page.$$eval(
          '.list-default .list-post',
          (els: Element[]) =>
            els.map((el) => {
              const titleEl =
                el.querySelector('.post-name a') ??
                el.querySelector('.title a') ??
                el.querySelector('h3 a');
              const compEl =
                el.querySelector('.corp-name a') ??
                el.querySelector('.company a');
              const locEl =
                el.querySelector('.work-place') ?? el.querySelector('.loc');
              const expEl =
                el.querySelector('.exp') ?? el.querySelector('.career');
              const deadlineEl =
                el.querySelector('.date') ??
                el.querySelector('.deadline') ??
                el.querySelector('.period');
              const stackEl = el.querySelector('.skill, .stack, .hashtag');
              const href =
                titleEl?.getAttribute('href') ??
                el.querySelector('a')?.getAttribute('href') ??
                '';
              return {
                title: titleEl?.textContent?.trim() ?? '',
                company: compEl?.textContent?.trim() ?? '',
                location: locEl?.textContent?.trim() ?? '서울',
                experience: expEl?.textContent?.trim() ?? '경력 무관',
                deadline: deadlineEl?.textContent?.trim() ?? '',
                stack: stackEl?.textContent?.trim() ?? '',
                href,
              };
            }) as {
              title: string;
              company: string;
              location: string;
              experience: string;
              deadline: string;
              stack: string;
              href: string;
            }[]
        );

        for (const item of items) {
          if (!item.title || !item.href) continue;
          const absUrl = normalizeUrl(item.href, BASE);
          const idMatch = item.href.match(/\/(\d+)/);
          jobs.push({
            id: `jobkorea-${idMatch?.[1] ?? Buffer.from(item.title + item.company).toString('base64').slice(0, 12)}`,
            source: 'jobkorea',
            title: item.title,
            company: item.company,
            location: item.location,
            experience: item.experience,
            stack: item.stack ? item.stack.split(/[\s,·]+/).filter(Boolean) : [],
            url: absUrl,
            postedAt: today(),
            deadline: parseDeadline(item.deadline),
          });
        }
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
