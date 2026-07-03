export const sleep = (ms: number) =>
  new Promise<void>((r) => setTimeout(r, ms));

/** 상대 경로를 절대 URL로 변환 */
export function normalizeUrl(href: string, base: string): string {
  if (!href) return '';
  href = href.trim();
  if (href.startsWith('http://') || href.startsWith('https://')) return href;
  if (href.startsWith('//')) return 'https:' + href;
  if (href.startsWith('/')) return base.replace(/\/$/, '') + href;
  return base.replace(/\/$/, '') + '/' + href;
}

/**
 * 한국 채용 사이트에서 자주 쓰이는 날짜 표현을 ISO "YYYY-MM-DD"로 변환.
 * 인식 불가 시 undefined 반환.
 */
export function parseDeadline(raw: string): string | undefined {
  if (!raw) return undefined;
  const s = raw.trim().replace(/[^\d./-]/g, '');
  // YYYY.MM.DD 또는 YYYY-MM-DD
  const full = s.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (full) return `${full[1]}-${full[2].padStart(2, '0')}-${full[3].padStart(2, '0')}`;
  // MM.DD (당해 연도)
  const mmdd = s.match(/^(\d{1,2})[.\-/](\d{1,2})$/);
  if (mmdd) {
    const year = new Date().getFullYear();
    return `${year}-${mmdd[1].padStart(2, '0')}-${mmdd[2].padStart(2, '0')}`;
  }
  return undefined;
}

// 2~3초 랜덤 딜레이 (과도한 부하 방지)
export const politeDelay = () => sleep(2000 + Math.random() * 1000);

export function today(): string {
  return new Date().toISOString();
}

// 텍스트에서 기술 스택 태그 추출 (휴리스틱)
const STACK_KEYWORDS = [
  'Python', 'R', 'SQL', 'Java', 'Scala', 'Go', 'Rust', 'C\\+\\+', 'C#',
  'JavaScript', 'TypeScript', 'React', 'Vue', 'Node\\.js',
  'TensorFlow', 'PyTorch', 'Keras', 'scikit-learn', 'XGBoost',
  'Spark', 'Hadoop', 'Kafka', 'Airflow', 'dbt',
  'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'Terraform',
  'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch',
  'Tableau', 'Power BI', 'Looker', 'Superset',
  'Pandas', 'NumPy', 'Matplotlib', 'Seaborn',
  'Salesforce', 'Django', 'FastAPI', 'Flask', 'Spring',
  'LLM', 'RAG', 'MLOps', 'DataOps',
];

const STACK_RE = new RegExp(`\\b(${STACK_KEYWORDS.join('|')})\\b`, 'gi');

export function extractStack(text: string): string[] {
  const matches = text.match(STACK_RE) ?? [];
  // 대소문자 정규화 후 중복 제거
  const seen = new Set<string>();
  return matches
    .map((m) => {
      const norm = STACK_KEYWORDS.find(
        (k) => k.replace('\\', '').toLowerCase() === m.toLowerCase()
      ) ?? m;
      return norm.replace(/\\/g, '');
    })
    .filter((m) => {
      const key = m.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
