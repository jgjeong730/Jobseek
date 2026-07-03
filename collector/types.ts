// collector 내부 타입 — src/lib/types.ts 와 구조 일치, 빌드 의존성 분리
export interface RawJob {
  id: string;
  source: string;
  title: string;
  company: string;
  location: string;
  experience: string;
  stack: string[];
  url: string;
  postedAt: string;
}

// RawJob + 채점 결과 필드
export interface Job extends RawJob {
  score: number;
  reason: string;
  flags: string[];
}

export interface JobsFile {
  updatedAt: string;
  jobs: Job[];
}
