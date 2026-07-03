import {
  Building2,
  MapPin,
  Briefcase,
  ExternalLink,
  Languages,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import type { Job } from '../lib/types';
import { SOURCE_LABELS } from '../lib/jobs';
import ScoreBadge from './ScoreBadge';

interface Props {
  job: Job;
}

export default function JobCard({ job }: Props) {
  const hasEnglish = job.flags.includes('english_plus');
  const hasPenalty = job.flags.some((f) =>
    ['salesforce_cs', 'senior_required', 'non_tech'].includes(f)
  );

  return (
    <article className="card">
      <div className="card__main">
        <div className="card__head">
          <span className="card__source">
            {SOURCE_LABELS[job.source] ?? job.source}
          </span>
          {hasEnglish && (
            <span className="chip chip--english">
              <Languages size={12} /> 영어 가점
            </span>
          )}
          {hasPenalty && (
            <span className="chip chip--penalty">
              <AlertTriangle size={12} /> 회피 조건
            </span>
          )}
        </div>

        <h2 className="card__title">{job.title}</h2>

        <div className="card__meta">
          <span>
            <Building2 size={14} /> {job.company}
          </span>
          <span>
            <MapPin size={14} /> {job.location}
          </span>
          <span>
            <Briefcase size={14} /> {job.experience}
          </span>
          {job.deadline && (
            <span>
              <Clock size={14} /> ~{job.deadline}
            </span>
          )}
        </div>

        {job.stack.length > 0 && (
          <div className="card__stack">
            {job.stack.map((s) => (
              <span key={s} className="tag">
                {s}
              </span>
            ))}
          </div>
        )}

        <p className="card__reason">{job.reason}</p>
      </div>

      <div className="card__side">
        <ScoreBadge score={job.score} />
        <a
          className="btn btn--primary"
          href={job.url}
          target="_blank"
          rel="noreferrer noopener"
        >
          원문 보기 <ExternalLink size={14} />
        </a>
      </div>
    </article>
  );
}
