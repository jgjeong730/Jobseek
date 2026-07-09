import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import type { JobsFile } from './lib/types';
import { categorize, categorizeExperience, loadJobs } from './lib/jobs';
import FilterBar, { type Filters } from './components/FilterBar';
import JobCard from './components/JobCard';
import './App.css';

const DEFAULT_FILTERS: Filters = {
  source: 'all',
  minScore: 0,
  category: 'all',
  experience: 'all',
};

export default function App() {
  const [data, setData] = useState<JobsFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const file = await loadJobs();
      setData(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  // 전체 공고를 score 내림차순으로 정렬
  const sorted = useMemo(
    () => [...(data?.jobs ?? [])].sort((a, b) => b.score - a.score),
    [data]
  );

  // 플랫폼 목록 (현재 데이터 기준)
  const availableSources = useMemo(
    () => [...new Set(sorted.map((j) => j.source))],
    [sorted]
  );

  // 필터 적용
  const filtered = useMemo(() => {
    return sorted.filter((job) => {
      if (filters.source !== 'all' && job.source !== filters.source) return false;
      if (job.score < filters.minScore) return false;
      if (filters.category !== 'all' && categorize(job.title) !== filters.category) return false;
      if (filters.experience !== 'all') {
        const expCat = categorizeExperience(job.experience);
        if (filters.experience === 'entry' && expCat !== 'entry') return false;
        if (filters.experience === 'any' && expCat !== 'any') return false;
        if (filters.experience === 'experienced' && expCat !== 'experienced') return false;
      }
      return true;
    });
  }, [sorted, filters]);

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__title">
          <Sparkles size={22} className="app__logo" />
          <div>
            <h1>Siheon Job Finder</h1>
            <p className="app__subtitle">시헌에게 맞는 채용공고를 적합도순으로 추천합니다</p>
          </div>
        </div>
        <div className="app__actions">
          {data?.updatedAt && (
            <span className="app__updated">
              업데이트 {new Date(data.updatedAt).toLocaleString('ko-KR')}
            </span>
          )}
          <button
            className="btn btn--ghost"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> 새로고침
          </button>
        </div>
      </header>

      <FilterBar
        filters={filters}
        availableSources={availableSources}
        onChange={setFilters}
      />

      <main className="app__main">
        {error && <div className="state state--error">에러: {error}</div>}
        {loading && !data && <div className="state">불러오는 중…</div>}

        {!loading && !error && (
          <p className="app__count">
            {filtered.length === sorted.length
              ? `총 ${sorted.length}건`
              : `${filtered.length} / ${sorted.length}건`}
          </p>
        )}

        {!loading && filtered.length === 0 && !error && (
          <div className="state">조건에 맞는 공고가 없습니다.</div>
        )}

        <div className="app__list">
          {filtered.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      </main>

      <footer className="app__footer">
        데이터는 수집 파이프라인이 매일 KST 09:00 자동 갱신합니다
      </footer>
    </div>
  );
}
