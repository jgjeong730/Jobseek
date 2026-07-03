/**
 * Claude API를 이용한 채용공고 적합도 채점.
 * ANTHROPIC_API_KEY는 반드시 환경변수로 주입 — 코드에 하드코딩 금지.
 * 모델: claude-sonnet-4-6 (CLAUDE.md 명시)
 */
import Anthropic from '@anthropic-ai/sdk';
import { sleep } from './utils.js';
import type { RawJob, Job } from './types.js';

const BATCH_SIZE = 8;
const BATCH_DELAY_MS = 3000;

const SYSTEM_PROMPT = `당신은 구직자 시헌(Siheon)의 채용공고 적합도를 채점하는 전문 HR 분석가입니다.

[지원자 프로필]
- 학력: Pennsylvania State University, Computational Data Science in Engineering (B.S., 2024), 수학 부전공
- 언어: 한국어 원어민, 영어 유창
- 기술: Python, R, SQL, Machine/Deep Learning, 데이터 시각화, Excel
- 현재: 메가존클라우드 (Salesforce 서비스팀, 약 10개월차)
- 경력 수준: 신입 ~ 주니어(1~2년차)
- 근무 희망지: 수도권(서울/경기)

[희망 직무 우선순위]
1. 데이터 사이언티스트 / ML 엔지니어
2. 데이터 분석가 / 데이터 엔지니어
3. 백엔드 · SW 개발 (주니어)

[채점 기준 합계 100점]
- 직무 적합도 35점: 1순위=35, 2순위=25, 3순위=15, 무관=0
- 경력 요건 매칭 20점: 신입/0~2년=20, 3년=12, 4년=5, 5년+=0
- 기술스택 겹침 25점: Python/R/SQL/ML/DL 스택이 많이 겹칠수록 고점
- 영어 활용 가점 10점: 영어 사용 글로벌/외국계 기업이면 최대 10점
- 지역 10점: 서울/경기=10, 기타 수도권=6, 비수도권=0

[페널티 및 플래그]
- Salesforce 순수 운영·CS 직무: 총점에서 -30점 감산, flags에 "salesforce_cs" 추가
- 5년+ 경력 필수: flags에 "senior_required" 추가
- 데이터/개발 무관 영업·마케팅: flags에 "non_tech" 추가
- 영어 필요 직무: flags에 "english_plus" 추가 (페널티 아님, 단순 표시)

[응답 형식]
반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력하세요.
{
  "results": [
    {
      "id": "<공고 ID 그대로>",
      "score": <0~100 정수>,
      "reason": "<한국어 2문장 이내 채점 이유>",
      "flags": ["<해당 플래그 배열>"]
    }
  ]
}`;

interface ScoreResult {
  id: string;
  score: number;
  reason: string;
  flags: string[];
}

interface BatchResponse {
  results: ScoreResult[];
}

function buildJobText(job: RawJob): string {
  return [
    `ID: ${job.id}`,
    `직무: ${job.title}`,
    `회사: ${job.company}`,
    `위치: ${job.location}`,
    `경력 요건: ${job.experience}`,
    `기술스택: ${job.stack.join(', ') || '미기재'}`,
    `플랫폼: ${job.source}`,
  ].join('\n');
}

function clampScore(raw: number): number {
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export async function scoreJobs(rawJobs: RawJob[]): Promise<Job[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.');
  }

  const client = new Anthropic({ apiKey });
  const scored: Job[] = [];
  const total = rawJobs.length;

  for (let i = 0; i < rawJobs.length; i += BATCH_SIZE) {
    const batch = rawJobs.slice(i, i + BATCH_SIZE);
    const end = Math.min(i + BATCH_SIZE, total);
    console.log(`[score] 채점 중 ${i + 1}~${end} / ${total}건…`);

    const jobsText = batch.map(buildJobText).join('\n\n---\n\n');
    const userMessage = `다음 ${batch.length}개 채용공고를 채점해주세요:\n\n${jobsText}`;

    let resultMap = new Map<string, ScoreResult>();
    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      if (textBlock && textBlock.type === 'text') {
        const text = textBlock.text.trim();
        // JSON 블록만 추출 (코드펜스가 있으면 제거)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as BatchResponse;
          resultMap = new Map(parsed.results.map((r) => [r.id, r]));
        }
      }
    } catch (e) {
      console.warn(`[score] 배치 ${i}~${end} 채점 실패:`, e);
    }

    for (const rawJob of batch) {
      const result = resultMap.get(rawJob.id);
      if (!result) {
        scored.push({ ...rawJob, score: 50, reason: '자동 채점 실패', flags: [] });
        continue;
      }
      scored.push({
        ...rawJob,
        score: clampScore(result.score),
        reason: result.reason,
        flags: result.flags,
      });
    }

    if (i + BATCH_SIZE < rawJobs.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  return scored;
}
