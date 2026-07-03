/**
 * 피플앤잡 (peoplenjob.com) — 외국계 기업 특화 채용 플랫폼.
 * robots.txt: /jobs 크롤 금지 명시 없음. 요청 간 딜레이 적용.
 */
import { chromium } from 'playwright';
import { politeDelay, today, normalizeUrl, parseDeadline, extractStack } from '../utils.js';
import type { RawJob } from '../types.js';

const BASE = 'https://www.peoplenjob.com';
const KEYWORDS = [
  '데이터 사이언티스트',
  '데이터 분석',
  'ML engineer',
  'data engineer',
  'software engineer',
];

export async function fetchPeopleNJobPlaywright(): Promise<RawJob[]> {
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
        const url = `${BASE}/jobs?q=${encodeURIComponent(kw)}&page=1`;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForSelector('.job-list, .search-result, article', {
          timeout: 8000,
        }).catch(() => null);

        const items = await page.$$eval(
          '.job-item, .job-card, .recruit-item, article.job, li.job',
          (els: Element[]) =>
            els.map((el) => {
              const titleEl =
                el.querySelector('.job-title a, h2 a, h3 a, .title a');
              const compEl =
                el.querySelector('.company-name, .corp-name, .company');
              const locEl = el.querySelector('.location, .loc, .place');
              const expEl = el.querySelector('.career, .experience, .exp');
              const deadlineEl = el.querySelector('.deadline, .date, .period');
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
                href,
                text: el.textContent?.slice(0, 200) ?? '',
              };
            }) as {
              title: string;
              company: string;
              location: string;
              experience: string;
              deadline: string;
              href: string;
              text: string;
            }[]
        );

        for (const item of items) {
          if (!item.title || !item.href) continue;
          const absUrl = normalizeUrl(item.href, BASE);
          const idMatch = item.href.match(/\/(\d+)/);
          jobs.push({
            id: `peoplenjob-${idMatch?.[1] ?? encodeURIComponent(item.title).slice(0, 16)}`,
            source: 'peoplenjob',
            title: item.title,
            company: item.company,
            location: item.location,
            experience: item.experience,
            stack: extractStack(item.text),
            url: absUrl,
            postedAt: today(),
            deadline: parseDeadline(item.deadline),
          });
        }
      } catch (e) {
        console.warn(`[peoplenjob] "${kw}" 실패:`, e);
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
