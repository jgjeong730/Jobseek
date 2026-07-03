/**
 * 로켓펀치 (rocketpunch.com) — 스타트업 특화.
 * robots.txt: /job-positions 크롤 금지 명시 없음.
 */
import { chromium } from 'playwright';
import { politeDelay, today, normalizeUrl, extractStack } from '../utils.js';
import type { RawJob } from '../types.js';

const BASE = 'https://rocketpunch.com';
const KEYWORDS = [
  '데이터 사이언티스트',
  '데이터 분석가',
  '머신러닝',
  '데이터 엔지니어',
];

export async function fetchRocketpunchPlaywright(): Promise<RawJob[]> {
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
        const url = `${BASE}/job-positions?q=${encodeURIComponent(kw)}`;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page
          .waitForSelector('.job-list, .position-item, .card', { timeout: 10000 })
          .catch(() => null);

        const items = await page.$$eval(
          '.position-item, .job-card, .card.position, li.position',
          (els: Element[]) =>
            els.map((el) => {
              const titleEl = el.querySelector(
                '.position-title a, .title a, h2 a, h3 a'
              );
              const compEl = el.querySelector(
                '.company-name a, .company a, .name a'
              );
              const locEl = el.querySelector('.location, .loc, .address');
              const expEl = el.querySelector('.career, .exp, .experience');
              const tagEls = Array.from(el.querySelectorAll('.tag, .skill, .hashtag'));
              const href =
                titleEl?.getAttribute('href') ??
                el.querySelector('a')?.getAttribute('href') ??
                '';
              return {
                title: titleEl?.textContent?.trim() ?? '',
                company: compEl?.textContent?.trim() ?? '',
                location: locEl?.textContent?.trim() ?? '서울',
                experience: expEl?.textContent?.trim() ?? '경력 무관',
                tags: tagEls.map((t) => t.textContent?.trim() ?? '').filter(Boolean),
                href,
                text: el.textContent?.slice(0, 200) ?? '',
              };
            }) as {
              title: string;
              company: string;
              location: string;
              experience: string;
              tags: string[];
              href: string;
              text: string;
            }[]
        );

        for (const item of items) {
          if (!item.title || !item.href) continue;
          const absUrl = normalizeUrl(item.href, BASE);
          const idMatch = item.href.match(/\/(\d+)/);
          const stack =
            item.tags.length > 0
              ? item.tags
              : extractStack(item.text);
          jobs.push({
            id: `rocketpunch-${idMatch?.[1] ?? encodeURIComponent(item.title + item.company).slice(0, 16)}`,
            source: 'rocketpunch',
            title: item.title,
            company: item.company,
            location: item.location,
            experience: item.experience,
            stack,
            url: absUrl,
            postedAt: today(),
          });
        }
      } catch (e) {
        console.warn(`[rocketpunch] "${kw}" 실패:`, e);
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
