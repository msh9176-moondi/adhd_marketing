# 10분 포스트잇 — 프로젝트 전체 개요

> **AI 독자를 위한 안내:** 이 문서는 코드베이스를 처음 접하는 AI(또는 개발자)가 전체 맥락을 빠르게 파악할 수 있도록 작성되었습니다. 앱의 존재 이유, 동작 원리, 데이터 흐름, 각 파일의 역할을 모두 담고 있습니다.

---

## 1. 한 줄 요약

**ADHD를 가진 성인이 "오늘 뭘 해야 하는지"를 10분 안에 손으로 쓸 수 있는 포스트잇 한 장으로 정리할 수 있도록 돕는 PWA.**

---

## 2. 앱의 철학 (왜 이렇게 만들었는가)

이 앱의 모든 UI/UX 결정은 ADHD 뇌의 특성에서 출발합니다.

| ADHD 특성                                   | 앱의 대응                                             |
| ------------------------------------------- | ----------------------------------------------------- |
| 시간 인식이 "지금 vs. 지금 아님" 두 가지뿐  | 10분짜리 첫 동작으로 쪼개기                           |
| 실행 의도보다 시작 자체가 어렵다            | "완료"가 아니라 "시작"에 보상(XP)                     |
| 디지털 투두는 눈에서 사라지면 존재를 잊는다 | 물리적 포스트잇을 직접 쓰고 붙이도록 유도             |
| 감정/회피 신호가 미루기로 이어진다          | 브레인 덤프에서 감정 신호를 AI가 감지하고 맥락에 반영 |
| 매일 다시 시작하는 게 핵심이다              | NFC 태그를 통한 일일 리추얼 + 스트릭 XP               |
| 동기부여는 지속되지 않는다                  | 게임화(XP, 레벨, 나무 성장)로 외적 보상 설계          |

---

## 3. 기술 스택

```
Frontend:  Next.js 14 (App Router, React 18)
Styling:   Tailwind CSS (Amber 테마)
Auth/DB:   Supabase (PostgreSQL + GoTrue Auth)
AI:        OpenAI GPT-4o-mini (JSON mode)
Infra:     PWA (Service Worker + Web App Manifest)
Push:      Web Push API (Supabase Edge Function)
Hardware:  NFC Web API (URL 태깅 방식)
```

---

## 4. 전체 사용자 흐름

```
[NFC 태그 탭 or 직접 접속]
       │
       ▼
[로그인 / 회원가입]  ←── next 파라미터로 NFC 페이지로 복귀
       │
       ▼
[/nfc?src=tag]  ──→  XP +10 (nfc_tag, 하루 1회)
       │
       ▼
[그라운딩 루틴]  ──→  30초 마음 준비 (4가지 루틴 중 랜덤)
       │
       ▼
[브레인 덤프]  ──→  AI 분류 → XP +10 (brain_dump)
       │
       ▼
[에너지 선택]  ──→  오늘의 처리 가능량 결정 (🔴🟡🟢)
       │
       ▼
[할 일 선택]  ──→  분류된 태스크 중 에너지에 맞게 선택
       │
       ▼
[포스트잇 루프]  ──→  태스크 1개씩 AI가 10분 동작으로 변환
       │
       ▼
[시간 배치] (선택)  ──→  각 포스트잇에 시작 시간 배정
       │
       ▼
[일일 계획 확인]  ──→  DB 저장 → XP +20 (plan_sentence)
       │
       ▼
[포스트잇 쓰기] (선택)  ──→  손글씨 가이드 → XP +20 (postit_written)
       │
       ▼
[포스트잇 위치 선택] (선택)  ──→  어디에 붙일지 선택
       │
       ▼
[보상 화면]  ──→  오늘 획득 XP + 뱃지 표시
       │
       ▼
[타이머]  ──→  포스트잇 1개씩 실행 (10/5/3분 선택)
       │
       ▼
[프로필]  ──→  XP, 레벨, 스트릭, 주간 통계
```

---

## 5. 파일 구조 및 각 파일 설명

```
ADHD_POSTIT/
├── app/
│   ├── page.tsx                  # 루트: 인증 상태에 따라 리다이렉트
│   ├── layout.tsx                # 전역 레이아웃, PWA 설정
│   ├── grounding/page.tsx        # 그라운딩 루틴 (4종)
│   ├── brain-dump/page.tsx       # 브레인 덤프 입력 + AI 분류
│   ├── energy-select/page.tsx    # 에너지 레벨 선택
│   ├── task-select/page.tsx      # 태스크 선택 + 우선순위
│   ├── postit-loop/page.tsx      # AI 태스크 변환 루프
│   ├── time-arrange/page.tsx     # 시간 배치 (선택)
│   ├── daily-plan/page.tsx       # 계획 시각화 + DB 저장
│   ├── write-postit/page.tsx     # 손글씨 포스트잇 가이드
│   ├── postit-location/page.tsx  # 포스트잇 부착 위치 선택
│   ├── reward/page.tsx           # 보상/뱃지 화면
│   ├── timer/page.tsx            # 실행 타이머
│   ├── profile/page.tsx          # 프로필 + 통계 대시보드
│   ├── guide/page.tsx            # ADHD 가이드 (6단계)
│   ├── setup/page.tsx            # 온보딩: 계획 시간 설정
│   ├── nfc/page.tsx              # NFC 태그 처리 + XP
│   ├── auth/
│   │   ├── login/page.tsx        # 로그인/회원가입
│   │   └── callback/route.ts     # OAuth/이메일 인증 콜백
│   └── api/
│       ├── classify-dump/route.ts  # POST: 브레인 덤프 AI 분류
│       ├── convert-task/route.ts   # POST: 태스크 → 10분 동작 변환
│       └── push/
│           ├── subscribe/route.ts  # POST: 푸시 구독 저장
│           └── send/route.ts       # POST: 푸시 알림 발송
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # 브라우저용 Supabase 클라이언트
│   │   └── server.ts             # 서버용 Supabase 클라이언트
│   ├── xp/
│   │   └── reward.ts             # XP 지급 로직 (중복 방지)
│   ├── ai/
│   │   ├── classifyDump.ts       # 브레인 덤프 분류 AI
│   │   └── convertTask.ts        # 태스크 변환 AI
│   ├── config/
│   │   └── energyLevels.ts       # 에너지 레벨별 설정값
│   └── push/
│       └── subscribe.ts          # 푸시 구독 클라이언트 로직
├── components/
│   ├── layout/
│   │   └── AppShell.tsx          # 전역 앱 컨테이너 (최대 너비, 패딩)
│   └── ui/
│       ├── Button.tsx            # 재사용 버튼 (primary/secondary/ghost)
│       ├── Card.tsx              # 재사용 카드 (default/postit/highlight)
│       └── XPBar.tsx             # XP 레벨 + 진행 바
├── types/
│   └── index.ts                  # 전체 TypeScript 타입 정의
└── supabase/
    └── functions/
        └── send-push/index.ts    # Supabase Edge Function: 푸시 발송
```

---

## 6. 핵심 모듈 상세

### 6-1. 브레인 덤프 분류 AI (`lib/ai/classifyDump.ts`)

사용자가 자유롭게 쓴 텍스트를 4가지 카테고리로 분류합니다.

```typescript
// 입력
const brainDump = "내일 영어 발표가 있는데 준비를 못했어. 빨래도 해야 하고. 너무 피곤해. 저녁에 회의 있음"

// 출력 (ClassifyDumpResponse)
{
  fixedSchedule: ["저녁 회의"],          // 시간이 고정된 일정
  taskCandidates: ["영어 발표 준비", "빨래"],  // 실행 가능한 태스크 (최대 7개)
  emotionOrAvoidanceSignals: ["너무 피곤해"],  // 감정/회피 신호
  energyNotes: []                         // 에너지/컨디션 메모
}
```

**AI 프롬프트 핵심 규칙:**

- 오탈자, 단편적 생각, 감정 표현을 그대로 수용
- "마감" 키워드 → "마감 준비하기"로 변환
- 절대 태스크를 무시하거나 "할 수 없다"고 판단하지 않음
- 감정(피곤, 막막함)은 태스크가 아닌 emotionOrAvoidanceSignals로 분류
- 응답은 항상 JSON 형식

---

### 6-2. 태스크 변환 AI (`lib/ai/convertTask.ts`)

태스크 하나를 "지금 당장 시작할 수 있는 10분짜리 첫 동작"으로 변환합니다.

```typescript
// 입력
convertTask(
  "영어 에세이 쓰기",          // task
  "서론 초안 작성",            // taskContext (사용자 추가 설명)
  "너무 피곤해"                // emotionContext (브레인 덤프에서 감지)
)

// 출력 (ConvertTaskResponse)
{
  finalPostitSentence: "에세이 제목과 첫 문장만 쓰기. 10분만.",
  backupTinyAction: "빈 문서 열고 제목 칸에 커서만 놓기",
  estimatedStartTime: "3분",
  reason: "시작이 전부예요. 첫 문장이 생기면 나머지가 따라와요.",
  rewardSuggestion: "유튜브 10분 봐도 돼"
}
```

**변환 원칙:**

- 동사는 반드시 물리적·관찰 가능한 것 (켜기, 펴기, 쓰기, 누르기)
- "공부하다" → "교재 47페이지 펴기"처럼 구체적으로
- backupTinyAction은 3분 이내 완료 가능한 초소형 동작
- emotionContext가 있으면 난이도를 자동으로 낮춤
- shrinkLevel 파라미터로 재요청 시 더 잘게 쪼갬

---

### 6-3. XP 지급 시스템 (`lib/xp/reward.ts`)

하루에 같은 종류의 보상은 1번만 지급됩니다.

```typescript
export async function grantXP(
  supabase: SupabaseClient,
  userId: string,
  rewardType: RewardType, // 'nfc_tag' | 'brain_dump' | 'plan_sentence' | 'postit_written' | 'return_bonus'
): Promise<{ granted: boolean; xp: number }>;
```

```typescript
// XP 지급량
export const REWARD_XP: Record<RewardType, number> = {
  nfc_tag: 10, // NFC 태그 탭
  brain_dump: 10, // 브레인 덤프 작성
  plan_sentence: 20, // 계획 문장 생성
  postit_written: 20, // 포스트잇 손글씨 작성
  return_bonus: 30, // 복귀 보너스 (미래 기능)
};
```

**중복 방지 로직:**

1. 오늘 00:00 ~ 23:59 사이에 동일 `reward_type`의 `reward_logs` 행이 있는지 확인
2. 있으면 `{ granted: false, xp: 0 }` 반환
3. 없으면 `reward_logs` INSERT + `increment_xp` RPC 호출

---

### 6-4. NFC 흐름 (`app/nfc/page.tsx`)

```
URL: /nfc?src=tag

1. src=tag 파라미터 확인 (없으면 /grounding으로)
2. Supabase 세션 확인
   ├─ 비로그인 → /auth/login?next=/nfc%3Fsrc%3Dtag
   └─ 로그인 됨 →
       3. nfc_logs에 INSERT
       4. grantXP('nfc_tag') → +10 XP (하루 1회)
       5. 푸시 알림 권한 요청 (처음 방문 시)
       6. /grounding으로 이동
```

NFC 태그에 쓸 URL: `https://your-domain.com/nfc?src=tag`

---

### 6-5. 에너지 레벨 설정 (`lib/config/energyLevels.ts`)

```typescript
// 에너지 레벨별 태스크 상한
'low':  { maxSelect: 2, recommendedMax: 1 }  // 🔴 방전됨
'mid':  { maxSelect: 3, recommendedMax: 2 }  // 🟡 보통
'high': { maxSelect: 5, recommendedMax: 3 }  // 🟢 에너지 충분
```

---

## 7. 데이터베이스 스키마 (Supabase)

### 주요 테이블

```sql
-- 사용자 프로필
profiles (
  id uuid PRIMARY KEY,         -- auth.users.id와 동일
  nickname text,
  plan_time text,              -- "08:00" 형식
  total_xp integer DEFAULT 0,
  created_at timestamptz
)

-- 브레인 덤프 원문 저장
brain_dumps (
  id uuid PRIMARY KEY,
  user_id uuid,
  content text,
  created_at timestamptz
)

-- 일일 계획 세션
daily_plans (
  id uuid PRIMARY KEY,
  user_id uuid,
  date date,
  created_at timestamptz
)

-- 개별 포스트잇 항목
plan_sentences (
  id uuid PRIMARY KEY,
  user_id uuid,
  brain_dump_id uuid,
  original_task text,          -- 원래 태스크
  final_sentence text,         -- AI 변환된 10분 동작
  created_at timestamptz,
  written_confirmed boolean    -- 손글씨 작성 완료 여부
)

-- XP 보상 기록 (중복 방지용)
reward_logs (
  id uuid PRIMARY KEY,
  user_id uuid,
  reward_type text,            -- RewardType
  xp integer,
  created_at timestamptz
)

-- NFC 태깅 기록 (스트릭 계산용)
nfc_logs (
  id uuid PRIMARY KEY,
  user_id uuid,
  accessed_at timestamptz,
  reward_given boolean
)
```

### RPC 함수

```sql
-- XP 원자적 증가 (동시성 안전)
increment_xp(user_id_input uuid, xp_input integer)
-- profiles.total_xp += xp_input WHERE id = user_id_input
```

---

## 8. 세션 스토리지 키 (클라이언트 상태)

다단계 흐름에서 페이지 간 데이터를 전달합니다. DB에 저장하지 않는 일시적 상태입니다.

| 키                     | 타입                              | 저장 시점       | 읽는 곳                                       |
| ---------------------- | --------------------------------- | --------------- | --------------------------------------------- |
| `classifyResult`       | `ClassifyDumpResponse` (JSON)     | brain-dump      | energy-select, task-select                    |
| `brainDumpId`          | `string` (UUID)                   | brain-dump      | postit-loop                                   |
| `brainDumpContent`     | `string`                          | brain-dump      | —                                             |
| `energyLevel`          | `'low'\|'mid'\|'high'`            | energy-select   | task-select                                   |
| `selectedTasks`        | `string[]` (JSON)                 | task-select     | postit-loop                                   |
| `taskPriorities`       | `Record<string, Priority>` (JSON) | task-select     | postit-loop                                   |
| `taskContexts`         | `Record<string, string>` (JSON)   | task-select     | postit-loop                                   |
| `postitItems`          | `DailyPostitItem[]` (JSON)        | postit-loop     | time-arrange, daily-plan, write-postit, timer |
| `currentTaskIndex`     | `string` (number)                 | postit-loop     | postit-loop                                   |
| `timerItemIndex`       | `string` (number)                 | timer           | timer                                         |
| `postitLocation`       | `string`                          | postit-location | —                                             |
| `planSaved_YYYY-MM-DD` | `'true'`                          | daily-plan      | daily-plan (멱등성)                           |

---

## 9. TypeScript 타입 정의 (`types/index.ts`)

```typescript
// AI 분류 응답
interface ClassifyDumpResponse {
  fixedSchedule: string[]; // 고정 일정
  taskCandidates: string[]; // 실행 가능 태스크 (최대 7개)
  emotionOrAvoidanceSignals: string[]; // 감정/회피 신호
  energyNotes: string[]; // 에너지 메모
}

// AI 변환 응답
interface ConvertTaskResponse {
  originalTask: string;
  finalPostitSentence: string; // 10분 포스트잇 문장
  backupTinyAction: string; // 3분 대안 행동
  estimatedStartTime: string; // "3분" | "5분" | "10분"
  reason: string; // 격려 메시지
  rewardSuggestion: string; // 완료 후 보상 제안
}

// 포스트잇 항목 (완전한 메타데이터 포함)
interface DailyPostitItem {
  id: string;
  order: number;
  originalTask: string;
  finalPostitSentence: string;
  backupTinyAction: string;
  estimatedStartTime: string;
  startTime?: string; // time-arrange에서 배정
  priority?: 'red' | 'yellow' | 'green';
}

// 보상 타입 및 XP값
type RewardType =
  | 'nfc_tag'
  | 'brain_dump'
  | 'plan_sentence'
  | 'postit_written'
  | 'return_bonus';
const REWARD_XP: Record<RewardType, number> = {
  nfc_tag: 10,
  brain_dump: 10,
  plan_sentence: 20,
  postit_written: 20,
  return_bonus: 30,
};
```

---

## 10. UI 컴포넌트

### Button (`components/ui/Button.tsx`)

```tsx
<Button variant="primary" size="lg" loading={false}>
  시작하기
</Button>

// variant: 'primary' (amber 배경) | 'secondary' (흰 배경) | 'ghost' (투명)
// size: 'sm' | 'md' | 'lg'
// loading: true → 스피너 표시
// fullWidth: 기본 true (모바일 full-width)
```

### Card (`components/ui/Card.tsx`)

```tsx
<Card variant="postit" padding="md">
  포스트잇 스타일 카드
</Card>

// variant: 'default' (흰 배경 + 그림자) | 'postit' (amber-300) | 'highlight' (amber-50 + 테두리)
// padding: 'sm' (p-4) | 'md' (p-5) | 'lg' (p-6)
```

### XPBar (`components/ui/XPBar.tsx`)

```tsx
<XPBar totalXp={250} showLabel={true} />

// 레벨 계산: Math.floor(totalXp / 100) + 1
// 나무 이모지: 🌱(≤2) → 🌿(≤5) → 🌳(≤10) → 🌲(≤20) → 🎄(>20)
// 진행도: (totalXp % 100)%
```

---

## 11. 그라운딩 루틴 4종 (`app/grounding/page.tsx`)

포스트잇 작성 전 30초간 집중력을 준비하는 루틴입니다.

| 루틴            | 설명                                       | 기술                                     |
| --------------- | ------------------------------------------ | ---------------------------------------- |
| 패턴 따라그리기 | Canvas에 그려진 패턴을 터치로 따라 그리기  | Canvas API, touch events                 |
| 시선 이동       | 화면의 점을 따라 눈을 이동 (6회)           | CSS 애니메이션, Web Audio, Vibration API |
| 감각 체크       | 보이는 것 5개 → 느껴지는 것 4개 → 소리 3개 | 순차적 텍스트 표시                       |
| 짧은 호흡       | 3사이클 호흡 (들이쉬기/내쉬기 각 4초)      | SVG circle scale 애니메이션              |

```typescript
// 오디오 피드백 (Web Audio API)
function playTone(freq: number, duration: number) {
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = freq;
  osc.start();
  osc.stop(ctx.currentTime + duration / 1000);
}

// 햅틱 피드백 (Vibration API)
function buzz(pattern: number | number[]) {
  navigator.vibrate?.(pattern);
}
```

---

## 12. 프로필 & 레벨 시스템 (`app/profile/page.tsx`)

```
레벨 계산: Math.floor(total_xp / 100) + 1

나무 성장:
  Level 1-2:   🌱 새싹
  Level 3-5:   🌿 풀
  Level 6-10:  🌳 나무
  Level 11-20: 🌲 큰 나무
  Level 21+:   🎄 크리스마스 트리

스트릭 계산:
  nfc_logs에서 날짜별 최근 연속 접속 일수 계산
  오늘 또는 어제 접속이 없으면 스트릭 리셋

오늘 XP:
  reward_logs에서 오늘 날짜의 xp 합산
```

---

## 13. 인증 흐름

### 로그인 (`app/auth/login/page.tsx`)

```
로그인 성공 → router.push(next ?? '/grounding')
회원가입 성공 → router.push('/setup')  (온보딩)
이메일 인증 필요 → 안내 메시지 표시 (세션 없음)
```

### OAuth/이메일 인증 콜백 (`app/auth/callback/route.ts`)

```
GET /auth/callback?code=xxx&next=/nfc?src=tag
  → supabase.auth.exchangeCodeForSession(code)
  → redirect to (next ?? '/nfc')
```

---

## 14. PWA 설정 (`app/layout.tsx`)

```tsx
// 메타데이터
themeColor: '#fbbf24'   // Amber 400
manifest: '/manifest.json'
appleWebApp: { capable: true, statusBarStyle: 'default' }

// 홈 화면 추가 시 전체화면 앱처럼 동작
// Service Worker로 오프라인 캐싱 지원
// 안드로이드/iOS 모두 지원
```

---

## 15. 주요 API 라우트

### `POST /api/classify-dump`

```typescript
// 요청
{
  content: string;
} // 브레인 덤프 원문

// 응답
ClassifyDumpResponse; // fixedSchedule, taskCandidates, emotionOrAvoidanceSignals, energyNotes
```

### `POST /api/convert-task`

```typescript
// 요청
{
  task: string
  taskContext?: string
  emotionContext?: string
  shrinkLevel?: number  // 0=기본, 1,2,3=점점 더 작게 쪼개기
}

// 응답
ConvertTaskResponse  // finalPostitSentence, backupTinyAction, estimatedStartTime, reason, rewardSuggestion
```

### `POST /api/push/subscribe`

```typescript
// 요청
{ endpoint: string, keys: { p256dh: string, auth: string } }

// 응답
{ ok: true }
```

---

## 16. 앱을 이해하는 데 가장 중요한 단 하나의 포인트

> "완료"보다 "돌아옴"이 더 중요하다.

이 앱은 ADHD를 가진 사람이 매일 포스트잇 루틴으로 돌아올 수 있도록 설계되었습니다. 포스트잇 한 장을 완성하지 못해도, NFC를 다시 태깅하는 것 자체가 성공입니다. XP, 스트릭, 나무 성장 등 모든 보상 시스템은 "완료"가 아닌 "참여"에 반응합니다.

---

_Last updated: 2026-05-26_
