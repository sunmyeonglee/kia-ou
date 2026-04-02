# 개발 기획 문서

> 작성일: 2026-04-01 / 최종 수정: 2026-04-02
> 기술 스택: Next.js (App Router), Tailwind CSS, OpenAI GPT API, Supabase
> 목적: Generative AI 기반 연구용 프로토타입

---

## 1. 서비스 개요

### 1.1 목적

본 서비스는 Generative AI를 활용한 **창의적 개념 탐색 실험**을 위한 연구용 프로토타입이다. 참가자가 AI와의 상호작용을 통해 상반된 두 개념을 발견하고(Phase 1), 이를 창의적으로 결합하는(Phase 2) 과정을 경험한다. 각 세션의 대화 내용과 만족도 응답은 연구 분석을 위해 Supabase PostgreSQL에 기록된다.

### 1.2 사용자 흐름

```
메인 페이지 (팀 번호 입력)
    ↓ teamId + sessionId (UUID) 생성 → URL query param으로 전달
Phase 1: 상반된 두 개념 찾기
    - 사용자 텍스트 입력 → AI가 근거 + 상반된 두 개념 반환
    - 각 AI 응답에 5점 Likert 만족도 평가
    - 여러 턴 반복 가능 (이전 대화 컨텍스트 유지)
    ↓
Phase 2: 상반된 두 개념 결합
    - Phase 1 결과에서 개념 쌍 선택 (collapse 토글 UI)
    - 추가 텍스트 입력 → AI가 결합 방식 설명 + 결합 이미지 생성
    - 이미지 반복 수정 가능 (이터레이션 히스토리 탭으로 탐색)
```

### 1.3 페이지 구성

| 페이지 | 경로 | 설명 |
|--------|------|------|
| 메인 페이지 | `/` | 팀 번호 입력 후 Phase 1으로 이동 |
| Phase 1 | `/phase1` | 상반된 두 개념 탐색 (멀티턴 대화) |
| Phase 2 | `/phase2` | 상반된 개념 결합 이미지 생성 |

### 1.4 데이터 흐름

```
사용자 입력
    → Next.js API Route (서버)
    → OpenAI GPT API 호출 (텍스트 / 이미지)
    → DALL·E 이미지 → Supabase Storage 업로드
    → 응답 반환 + Supabase DB 로그 저장
    → 클라이언트 렌더링
```

---

## 2. 개발 계획

### 2.1 프로젝트 구조

```
project/
├── app/
│   ├── page.tsx                  # 메인 페이지 (팀 번호 입력)
│   ├── phase1/
│   │   └── page.tsx              # Phase 1 페이지
│   ├── phase2/
│   │   └── page.tsx              # Phase 2 페이지
│   └── api/
│       ├── phase1/
│       │   └── route.ts          # Phase 1 GPT API 호출
│       ├── phase2/
│       │   └── route.ts          # Phase 2 GPT + DALL·E API 호출 (maxDuration=60)
│       └── log/
│           └── route.ts          # Supabase 로그 저장
├── components/
│   ├── ChatInput.tsx             # 텍스트 입력 컴포넌트
│   ├── LikertScale.tsx           # 5점 Likert 평가 컴포넌트
│   ├── ConceptCard.tsx           # 상반된 두 개념 표시 카드
│   └── ConceptSelector.tsx       # Phase 2용 개념 쌍 선택 UI (collapse 토글)
├── lib/
│   ├── openai.ts                 # OpenAI 클라이언트 초기화
│   ├── supabase.ts               # Supabase 클라이언트 초기화
│   └── logger.ts                 # Supabase DB 로그 유틸리티
├── instrumentation.ts            # Next.js instrumentation hook (빈 파일, 캐시 오류 방지)
├── .env.local                    # API 키 관리 (gitignore)
├── .gitignore
└── next.config.ts                # remotePatterns: *.supabase.co
```

### 2.2 환경 변수 (.env.local)

```
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

> `.env.local`은 `.gitignore`에 반드시 포함.

### 2.3 API 설계

#### `POST /api/phase1`

**Request**
```json
{
  "teamId": "A1",
  "turnIndex": 2,
  "userMessage": "환경과 기술에 대한 상반된 개념을 찾고 싶어",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

**Response**
```json
{
  "rationale": "환경 보호와 기술 발전은 흔히 상충되는 가치로...",
  "concepts": ["자연 생태계", "인공 디지털 환경"]
}
```

**GPT 프롬프트 전략**
- System: 창의적 사고 퍼실리테이터 역할, JSON mode로 구조화된 응답
- `history` 배열을 messages에 누적하여 멀티턴 컨텍스트 유지

#### `POST /api/phase2`

**Request**
```json
{
  "teamId": "A1",
  "concepts": ["자연 생태계", "인공 디지털 환경"],
  "userMessage": "두 개념이 공존하는 미래 도시 풍경을 보여줘",
  "history": [
    { "userMessage": "...", "fusionDescription": "..." }
  ]
}
```

**Response**
```json
{
  "fusionDescription": "두 개념은 바이오필릭 디자인과 스마트 인프라의 공존으로...",
  "imageUrl": "https://...supabase.co/storage/v1/object/public/generated-images/..."
}
```

**GPT/DALL·E 활용**
- GPT: 결합 방식 텍스트 설명 생성 (이전 이터레이션 컨텍스트 반영)
- DALL·E 3: 결합된 이미지 생성 → Supabase Storage에 영구 저장
- `maxDuration = 60` 설정으로 Vercel 타임아웃 방지

#### `POST /api/log`

**Request (Phase 1)**
```json
{
  "phase": 1,
  "teamId": "A1",
  "sessionId": "uuid-...",
  "turnIndex": 2,
  "userMessage": "...",
  "aiResponse": { "rationale": "...", "concepts": ["...", "..."] },
  "likert": 4
}
```

> Supabase `phase1_logs` / `phase2_logs` 테이블에 INSERT.

### 2.4 Supabase 스키마

**phase1_logs**

| 컬럼 | 설명 |
|------|------|
| timestamp | ISO 8601 형식 |
| teamId | 참가팀 번호 |
| sessionId | UUID (동시 접속 구분) |
| turnIndex | 해당 세션 내 턴 번호 |
| userMessage | 사용자 입력 |
| rationale | AI 선정 근거 |
| concept1 | 첫 번째 개념 |
| concept2 | 두 번째 개념 |
| likert | 만족도 (1~5) |

**phase2_logs**

| 컬럼 | 설명 |
|------|------|
| timestamp | ISO 8601 형식 |
| teamId | 참가팀 번호 |
| sessionId | UUID (동시 접속 구분) |
| selectedConcept1 | 선택된 첫 번째 개념 |
| selectedConcept2 | 선택된 두 번째 개념 |
| userMessage | 사용자 추가 입력 |
| fusionDescription | AI 결합 방식 설명 |
| imageUrl | Supabase Storage 공개 URL |

**Supabase Storage**
- 버킷: `generated-images` (public)
- 파일명: `{teamId}_{timestamp}.png`

### 2.5 UI/UX 설계

#### 메인 페이지 (`/`)
- 중앙 정렬 레이아웃
- 팀 번호 입력 필드 + 시작 버튼
- 시작 시 `crypto.randomUUID()`로 sessionId 생성 → URL query param으로 전달
- `font-size: 16px` 적용 (iOS 자동 확대 방지)

#### Phase 1 (`/phase1`)
- 상단: 팀 번호 표시, Phase 표시
- 중앙: 대화 내역 스크롤 영역
  - 사용자 발화: 오른쪽 정렬 말풍선 (즉시 표시, pendingMessage)
  - AI 응답: 왼쪽 정렬 (근거 텍스트 + 두 개념 카드)
  - AI 응답 하단: Likert 5점 버튼 (1~5 선택, 선택 후 비활성화)
- 하단 고정: 텍스트 입력창 + 전송 버튼 (Enter 제출 지원)
- "Phase 2로 이동" 버튼
- sessionStorage로 새로고침 후 복원 (`{teamId}_{sessionId}` 키)

#### Phase 2 (`/phase2`)
- **데스크탑**: 좌(채팅) / 우(이미지) 50:50 분할 레이아웃
- **모바일**: 이미지(35vh) 상단 + 채팅 하단 세로 배치
- 상단: Phase 1 개념 쌍 선택 (collapse 토글, 기본 펼침 / 선택 후 자동 접힘)
- 이미지 영역: 이터레이션 탭 + 좌우 화살표 네비게이션
- sessionStorage로 이터레이션 히스토리 복원
- `font-size: 16px` 적용 (iOS 자동 확대 방지)

### 2.6 상태 관리

- Phase 1 대화 내역: `useState` + `turnsRef` (stale closure 방지)
- 중복 로그 방지: Turn 인터페이스의 `logged: boolean` 플래그
- Phase 1 → Phase 2 데이터 전달: `sessionStorage` (`conceptPairs` 키)
- 동시 접속 격리: `crypto.randomUUID()` sessionId로 각 세션 독립 관리
- Phase 2 직접 URL 접근 방지: `teamId` 없으면 `/` 로 리다이렉트

---

## 3. TODO List

### Phase 0: 프로젝트 초기 세팅

- [x] `npx create-next-app@latest`로 프로젝트 생성 (App Router, TypeScript, Tailwind 선택)
- [x] `.env.local` 파일 생성 및 API 키 설정
- [x] `.gitignore`에 `.env.local` 추가
- [x] `openai` npm 패키지 설치
- [x] `lib/openai.ts` 작성 (OpenAI 클라이언트 싱글턴 초기화)
- [x] `lib/supabase.ts` 작성 (Supabase 클라이언트 초기화)
- [x] `lib/logger.ts` 작성 (Supabase DB 로그 유틸)

### Phase 1: 메인 페이지

- [x] `app/page.tsx` — 팀 번호 입력 폼 UI 구현
- [x] 팀 번호 유효성 검사 (빈 값 방지)
- [x] 입력 후 `/phase1?teamId=...&sessionId=...` 로 라우팅

### Phase 2: Phase 1 페이지 & API

- [x] `app/api/phase1/route.ts` — GPT API 호출 로직 구현
  - [x] System 프롬프트 설계
  - [x] 멀티턴 대화 히스토리 처리 (history 배열)
  - [x] 응답 파싱: rationale + concepts[2] 추출 (JSON mode 활용)
- [x] `app/api/log/route.ts` — Supabase 로그 저장 로직 구현
- [x] `components/ChatInput.tsx` — 텍스트 입력 + Enter/전송 버튼
- [x] `components/LikertScale.tsx` — 1~5점 선택 버튼 UI
- [x] `components/ConceptCard.tsx` — 두 개념 표시 카드 UI
- [x] `app/phase1/page.tsx` — 전체 Phase 1 페이지 조립
  - [x] 대화 내역 스크롤 영역
  - [x] AI 응답 후 Likert 평가 활성화
  - [x] Likert 선택 시 `/api/log` 호출
  - [x] Phase 2 이동 버튼
  - [x] pendingMessage로 사용자 메시지 즉시 표시
  - [x] sessionStorage 새로고침 복원

### Phase 3: Phase 2 페이지 & API

- [x] `app/api/phase2/route.ts` — GPT + DALL·E API 호출 로직
  - [x] GPT로 결합 방식 설명 텍스트 생성
  - [x] 생성된 설명을 DALL·E 3 프롬프트로 변환 후 이미지 생성
  - [x] DALL·E 이미지 Supabase Storage 업로드 (URL 만료 방지)
  - [x] 이전 이터레이션 컨텍스트 반영
  - [x] `maxDuration = 60` (Vercel 타임아웃 방지)
- [x] `components/ConceptSelector.tsx` — Phase 1 개념 쌍 선택 UI (collapse 토글)
- [x] `app/phase2/page.tsx` — 전체 Phase 2 페이지 조립
  - [x] 개념 쌍 선택 UI (기본 펼침, 선택 후 접힘, 자동 선택 없음)
  - [x] 추가 요구사항 입력창
  - [x] 결합 설명 + 이미지 렌더링
  - [x] 로딩 상태 처리 (이미지 생성 시간 고려)
  - [x] 결과 로그 `/api/log` 저장
  - [x] 이터레이션 탭 + 화살표 네비게이션
  - [x] sessionStorage 새로고침 복원
  - [x] 데스크탑 좌우 / 모바일 상하 반응형 레이아웃

### Phase 4: 통합 및 QA

- [x] Phase 1 → Phase 2 개념 쌍 데이터 전달 확인
- [x] Supabase 로그 정상 기록 여부 확인 (Phase 1, Phase 2 각각)
- [x] 멀티턴 대화 컨텍스트 유지 확인
- [x] 동시 접속 시 세션 격리 확인 (sessionId UUID)
- [x] Phase 2 직접 URL 접근 방지 (teamId 없으면 리다이렉트)
- [x] 모바일 반응형 레이아웃
- [ ] Supabase RLS(Row Level Security) 설정 (보안 강화)
- [ ] End-to-End 흐름 테스트 (실험 시나리오 기반)

---

## 부록: 주요 기술 결정 사항

| 항목 | 결정 | 이유 |
|------|------|------|
| 프레임워크 | Next.js App Router | API Route와 UI를 단일 프로젝트로 관리 |
| AI 텍스트 | GPT-4o (JSON mode) | 구조화된 응답 파싱 안정성 |
| AI 이미지 | DALL·E 3 | OpenAI 동일 계정으로 통합 관리 용이 |
| 데이터 저장 | Supabase PostgreSQL | Vercel 서버리스 환경에서 파일시스템 쓰기 불가 |
| 이미지 저장 | Supabase Storage | DALL·E URL 1시간 만료 문제 해결 |
| 상태 관리 | React useState + sessionStorage | 새로고침 복원 및 멀티탭 세션 격리 |
| 스타일링 | Tailwind CSS | 빠른 UI 구성, 반응형 레이아웃 유연성 |
| 동시 접속 | crypto.randomUUID() sessionId | 동일 팀 번호 다중 접속 시 데이터 충돌 방지 |
| Vercel 타임아웃 | maxDuration = 60 | DALL·E 3 이미지 생성 30초+ 소요 대응 |
