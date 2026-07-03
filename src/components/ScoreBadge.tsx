interface Props {
  score: number;
}

function scoreColor(score: number): string {
  if (score >= 80) return 'var(--score-high)';
  if (score >= 60) return 'var(--score-mid)';
  return 'var(--score-low)';
}

export default function ScoreBadge({ score }: Props) {
  const color = scoreColor(score);
  return (
    <div className="score-badge" style={{ borderColor: color, color }}>
      <span className="score-badge__num">{score}</span>
      <span className="score-badge__label">적합도</span>
    </div>
  );
}
