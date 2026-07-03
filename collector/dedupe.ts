import type { RawJob } from './types.js';

/**
 * 중복 제거 기준 (우선순위 순):
 * 1. url 동일
 * 2. 같은 source + 같은 id suffix
 * 3. company + title 유사 (소문자 정규화, 공백 제거)
 */
export function dedupe(jobs: RawJob[]): RawJob[] {
  const seenUrl = new Set<string>();
  const seenId = new Set<string>();
  const seenKey = new Set<string>();

  return jobs.filter((job) => {
    if (seenUrl.has(job.url)) return false;
    if (seenId.has(job.id)) return false;

    const key = `${job.company.toLowerCase().replace(/\s/g, '')}::${job.title.toLowerCase().replace(/\s/g, '')}`;
    if (seenKey.has(key)) return false;

    seenUrl.add(job.url);
    seenId.add(job.id);
    seenKey.add(key);
    return true;
  });
}
