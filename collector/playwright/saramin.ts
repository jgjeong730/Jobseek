import { chromium } from 'playwright';
import { politeDelay, today, parseDeadline } from '../utils.js';
import type { RawJob } from '../types.js';

const KEYWORDS = ['데이터 사이언티스트', '데이터 분석가', 'ML엔지니어', '데이터 엔지니어', '백엔드 개발자'];

export async function fetchSaraminPlaywright(): Promise<RawJob[]> {
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
        const url = `https://www.saramin.co.kr/zf_user/search?searchType=search&searchword=${encodeURIComponent(kw)}&recruitPage=1&recruitPageCount=20`;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForSelector('.item_recruit', { timeout: 8000 }).catch(() => null);

        const items = await page.$$eval('.item_recruit', (els) =>
          els.map((el) => {
            const jobId = el.getAttribute('value') ?? '';
            const titleEl = el.querySelector('h2.job_tit a');
            const compEl = el.querySelector('.corp_name a');
            const conditions = Array.from(el.querySelectorAll('.job_condition span')).map(
              (s) => (s as HTMLElement).innerText?.trim() ?? s.textContent?.trim() ?? ''
            );
            const deadlineText = el.querySelector('.job_date .date')?.textContent?.trim() ?? '';
            return {
              jobId,
              title: titleEl?.textContent?.trim() ?? '',
              company: compEl?.textContent?.trim() ?? '',
              location: conditions[0] ?? '서울',
              experience: conditions[1] ?? '경력 무관',
              deadlineText,
            };
          })
        );

        for (const item of items) {
          if (!item.title || !item.jobId) continue;
          jobs.push({
            id: `saramin-${item.jobId}`,
            source: 'saramin',
            title: item.title,
            company: item.company,
            location: item.location.replace(/\s+/g, ' ').trim(),
            experience: item.experience,
            stack: [],
            url: `https://www.saramin.co.kr/zf_user/jobs/rec?rec_idx=${item.jobId}`,
            postedAt: today(),
            deadline: parseDeadline(item.deadlineText),
          });
        }
        console.log(`[saramin] "${kw}" → ${items.filter(i => i.title).length}건`);
      } catch (e) {
        console.warn(`[saramin] "${kw}" 실패:`, e);
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
