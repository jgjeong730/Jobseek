import { SlidersHorizontal } from 'lucide-react';
import type { JobCategory, JobSource } from '../lib/types';
import { CATEGORY_LABELS, SOURCE_LABELS } from '../lib/jobs';

export interface Filters {
  source: JobSource | string | 'all';
  minScore: number;
  category: JobCategory | 'all';
}

interface Props {
  filters: Filters;
  availableSources: string[];
  onChange: (next: Filters) => void;
}

const SCORE_OPTIONS = [0, 50, 60, 70, 80];
const CATEGORIES: (JobCategory | 'all')[] = [
  'all',
  'data-science',
  'data-analysis',
  'backend',
  'other',
];

export default function FilterBar({ filters, availableSources, onChange }: Props) {
  function set<K extends keyof Filters>(key: K, val: Filters[K]) {
    onChange({ ...filters, [key]: val });
  }

  return (
    <div className="filterbar">
      <SlidersHorizontal size={15} className="filterbar__icon" />

      <label className="filterbar__group">
        <span>플랫폼</span>
        <select
          value={filters.source}
          onChange={(e) => set('source', e.target.value)}
        >
          <option value="all">전체</option>
          {availableSources.map((s) => (
            <option key={s} value={s}>
              {SOURCE_LABELS[s] ?? s}
            </option>
          ))}
        </select>
      </label>

      <label className="filterbar__group">
        <span>최소 점수</span>
        <select
          value={filters.minScore}
          onChange={(e) => set('minScore', Number(e.target.value))}
        >
          {SCORE_OPTIONS.map((v) => (
            <option key={v} value={v}>
              {v === 0 ? '제한 없음' : `${v}점 이상`}
            </option>
          ))}
        </select>
      </label>

      <label className="filterbar__group">
        <span>직무</span>
        <select
          value={filters.category}
          onChange={(e) => set('category', e.target.value as Filters['category'])}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c === 'all' ? '전체' : CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
