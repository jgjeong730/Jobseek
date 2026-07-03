// 채용공고 데이터 스키마. collector와 대시보드가 공유.

export type JobSource =
  | 'wanted'
  | 'jumpit'
  | 'programmers'
  | 'jobkorea'
  | 'saramin'
  | 'linkedin'
  | 'rocketpunch';

export type JobFlag =
  | 'english_plus' // 영어 활용 가점
  | 'salesforce_cs' // Salesforce 운영/CS 직무 (감점)
  | 'senior_required' // 5년 이상 경력 요구 (감점)
  | 'non_tech'; // 데이터/개발 무관 (감점)

export interface Job {
  id: string; // "플랫폼-고유id"
  source: JobSource | string;
  title: string;
  company: string;
  location: string;
  experience: string; // 요구 경력
  stack: string[]; // 기술 태그
  url: string; // 원문 링크
  postedAt: string; // 수집/게시일 ISO
  score: number; // 0-100 적합도
  reason: string; // 추천 이유 한 줄
  flags: (JobFlag | string)[];
}

export interface JobsFile {
  updatedAt: string; // ISO
  jobs: Job[];
}

// 희망 직무 카테고리 (필터용)
export type JobCategory =
  | 'data-science' // 데이터 사이언티스트 / ML
  | 'data-analysis' // 데이터 분석 / 엔지니어
  | 'backend' // 백엔드 / SW
  | 'other';
