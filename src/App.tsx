import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import type { JobsFile } from './lib/types';
import { loadJobs } from './lib/jobs';
import JobCard from './components/JobCard';
import './App.css';

export default function App() {
  const [data, setData] = useState<JobsFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const jobs = [...(data?.jobs ?? [])].sort((a, b) => b.score - a.score);

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__title">
          <Sparkles size={22} className="app__logo" />
          <div>
            <h1>Siheon Job Finder</h1>
            <p className="app__subtitle">
              시헌에게 맞는 채용공고를 적합도순으로 추천합니다
            </p>
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

      <main className="app__main">
        {error && <div className="state state--error">에러: {error}</div>}
        {loading && !data && <div className="state">불러오는 중…</div>}
        {!loading && jobs.length === 0 && !error && (
          <div className="state">표시할 공고가 없습니다.</div>
        )}
        <div className="app__list">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      </main>

      <footer className="app__footer">
        총 {jobs.length}건 · 데이터는 수집 파이프라인이 자동 갱신합니다
      </footer>
    </div>
  );
}
