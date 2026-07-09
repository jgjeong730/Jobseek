/**
 * 피플앤잡 — 외국계 기업 특화. 키워드 필터 없이 오늘의 공고 전체 수집 후 채점 단계에서 필터링.
 */
import { chromium } from 'playwright';
import { today, extractStack } from '../utils.js';
import type { RawJob } from '../types.js';

const BASE = 'https://www.peoplenjob.com';

export async function fetchPeopleNJobPlaywright(): Promise<RawJob[]> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'ko-KR',
  });
  const jobs: RawJob[] = [];

  const page = await context.newPage();
  try {
    await page.goto(`${BASE}/jobs`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('li.card-list', { timeout: 10000 }).catch(() => null);

    const items = await page.$$eval('li.card-list', (els) =>
      els.map((el) => {
        const linkEl = el.querySelector('a.card-link') as HTMLAnchorElement | null;
        const company = el.querySelector('p.company')?.textContent?.trim() ?? '';
        const descRaw = el.querySelector('p.desc')?.textContent?.trim() ?? '';
        // p.desc format: "[Company Description] Job Title"  — strip the bracket part
        const title = descRaw.replace(/^\[.*?\]\s*/, '').trim() || descRaw;
        const href = linkEl?.href ?? linkEl?.getAttribute('href') ?? '';
        const idMatch = href.match(/\/jobs\/(\d+)/);
        const finDate = el.querySelector('.job-fin-date')?.textContent?.trim() ?? '';
        return { company, title, href, jobId: idMatch?.[1] ?? '', finDate };
      })
    );

    for (const item of items) {
      if (!item.title || !item.href) continue;
      const url = item.href.startsWith('http') ? item.href : `${BASE}${item.href}`;
      jobs.push({
        id: `peoplenjob-${item.jobId || encodeURIComponent(item.title).slice(0, 20)}`,
        source: 'peoplenjob',
        title: item.title,
        company: item.company,
        location: '서울',
        experience: '경력 무관',
        stack: extractStack(item.title),
        url,
        postedAt: today(),
      });
    }
    console.log(`[peoplenjob] ${jobs.length}건 수집`);
  } catch (e) {
    console.warn('[peoplenjob] 수집 실패:', e);
  } finally {
    await page.close();
    await browser.close();
  }
  return jobs;
}
