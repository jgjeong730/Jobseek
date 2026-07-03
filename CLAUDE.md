# 프로젝트: Siheon Job Finder

## 목적
시헌에게 적합한 채용공고를 여러 플랫폼에서 주기적으로 수집·채점·추천하는 웹앱.

## 지원자 프로필 (매칭 기준값)
- 학력: Pennsylvania State University, Computational Data Science in Engineering (B.S., 2024), 수학 부전공
- 언어: 한국어 원어민, 영어 유창 (글로벌/외국계 직무 가점)
- 기술: Python, R, SQL, Machine/Deep Learning, 데이터 시각화, Excel
- 현재: 메가존클라우드 (Salesforce 서비스팀, 약 10개월차)
- 경력 수준: 신입 ~ 주니어(1~2년차)
- 근무 희망지: 수도권(서울/경기)

## 희망 직무 (우선순위)
1. 데이터 사이언티스트 / ML 엔지니어
2. 데이터 분석가 / 데이터 엔지니어
3. 백엔드·SW 개발 (주니어)

## 회피 조건 (감점)
- Salesforce 순수 운영/고객지원(CS)성 직무
- 5년 이상 경력 요구 포지션
- 데이터/개발과 무관한 영업·마케팅 직무

## 채점 가중치 (0~100)
- 직무 적합도 35 / 경력 요건 매칭 20 / 기술스택 겹침 25 / 영어 활용 가점 10 / 지역 10
- Salesforce CS 직무는 총점에서 -30 페널티

## 대상 채용 플랫폼
원티드(wanted.co.kr), 점핏(jumpit.co.kr), 프로그래머스 커리어(career.programmers.co.kr),
잡코리아, 사람인, 링크드인(선택), 로켓펀치. 개발·데이터 특화 플랫폼(원티드/점핏/프로그래머스) 우선.

## 기술 스택 & 제약
- 프론트: React + Vite + TypeScript, 배포는 GitHub Pages (계정 jgjeong730)
- 매칭 엔진: Claude API (모델은 claude-sonnet 계열, ANTHROPIC_API_KEY 사용)
- 수집: 개발/디버깅은 브라우저 MCP, 프로덕션 자동화는 Playwright 헤드리스
- 스케줄: GitHub Actions cron (매일 KST 09:00 = UTC 00:00)
- 데이터 저장: 리포 내 data/jobs.json (경량, DB 불필요)
- 정적 웹앱은 백그라운드 MCP 실행 불가 → 수집은 Actions 파이프라인이 담당

## 코딩 규칙
- TypeScript strict, 함수형 컴포넌트, 명확한 타입 정의
- 폴더: /src (앱), /collector (수집 스크립트), /data (jobs.json), /.github/workflows
- 커밋 메시지 간결하게, 각 단계 완료 시 커밋
- 비밀키는 프론트 코드/리포에 하드코딩 금지. 매칭 채점은 서버측(Actions)에서만 수행

## 디자인 토큰
- 다크모드 기본, Linear/Vercel 계열 미니멀
- 폰트: Pretendard(국문) + Inter(영문)
- 아이콘: lucide-react
- 여백 넉넉히, 카드형 리스트, 적합도 점수 배지 강조
