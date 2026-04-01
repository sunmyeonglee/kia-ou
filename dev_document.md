# 개발 기획 문서

> 작성일: 2026-04-01  
> 기술 스택: Next.js (App Router), Tailwind CSS, OpenAI GPT API  
> 목적: Generative AI 기반 연구용 프로토타입

---

## 1. 서비스 개요

### 1.1 목적

본 서비스는 Generative AI를 활용한 **창의적 개념 탐색 실험**을 위한 연구용 프로토타입이다. 참가자가 AI와의 상호작용을 통해 상반된 두 개념을 발견하고(Phase 1), 이를 창의적으로 결합하는(Phase 2) 과정을 경험한다. 각 세션의 대화 내용과 만족도 응답은 연구 분석을 위해 로컬 CSV에 기록된다.

### 1.2 사용자 흐름

```
메인 페이지 (팀 번호 입력)
    ↓
Phase 1: 상반된 두 개념 찾기
    - 사용자 텍스트 입력 → AI가 근거 + 상반된 두 개념 반환
    - 각 AI 응답에 5점 Likert 만족도 평가
    - 여러 턴 반복 가능
    ↓
Phase 2: 상반된 두 개념 결합
    - Phase 1 결과에서 개념 쌍 선택 + 추가 텍스트 입력
    - AI가 결합 방식 설명 + 결합 이미지 생성
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
    → 응답 반환 + CSV 로그 저장
    → 클라이언트 렌더링
```

---

## 2. 개발 계획

### 2.1 프로젝트 구조

```
/
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
│       │   └── route.ts          # Phase 2 GPT + DALL·E API 호출
│       └── log/
│           └── route.ts          # CSV 로그 저장
├── components/
│   ├── ChatInput.tsx             # 텍스트 입력 컴포넌트
│   ├── LikertScale.tsx           # 5점 Likert 평가 컴포넌트
│   ├── ConceptCard.tsx           # 상반된 두 개념 표시 카드
│   └── ConceptSelector.tsx       # Phase 2용 개념 쌍 선택 UI
├── lib/
│   ├── openai.ts                 # OpenAI 클라이언트 초기화
│   └── csvLogger.ts              # CSV 저장 유틸리티
├── data/
│   └── logs/                     # CSV 로그 파일 저장 디렉터리
│       ├── phase1_logs.csv
│       └── phase2_logs.csv
├── .env.local                    # API 키 관리 (gitignore)
├── .gitignore
└── README.md
```

### 2.2 환경 변수 (.env.local)

```
OPENAI_API_KEY=sk-...
```

> `.env.local`은 `.gitignore`에 반드시 포함. `data/logs/` 디렉터리도 gitignore 대상에 포함하여 실험 데이터 유출 방지.

### 2.3 API 설계

#### `POST /api/phase1`

**Request**
```json
{
  "teamId": "A1",
  "turnIndex": 2,
  "userMessage": "환경과 기술에 대한 상반된 개념을 찾고 싶어"
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
- System: "너는 창의적 사고를 돕는 AI 퍼실리테이터야. 사용자의 요구사항을 바탕으로 의미 있게 상반되는 두 개념을 한 쌍 제시하고, 선정 근거를 설명해."
- 이전 대화 내역을 messages 배열에 누적하여 멀티턴 컨텍스트 유지

#### `POST /api/phase2`

**Request**
```json
{
  "teamId": "A1",
  "concepts": ["자연 생태계", "인공 디지털 환경"],
  "userMessage": "두 개념이 공존하는 미래 도시 풍경을 보여줘"
}
```

**Response**
```json
{
  "fusionDescription": "두 개념은 바이오필릭 디자인과 스마트 인프라의 공존으로...",
  "imageUrl": "https://..."
}
```

**GPT/DALL·E 활용**
- GPT: 결합 방식 텍스트 설명 생성
- DALL·E 3: 결합된 이미지 생성 (GPT 설명을 프롬프트로 활용)

#### `POST /api/log`

**Request**
```json
{
  "phase": 1,
  "teamId": "A1",
  "turnIndex": 2,
  "userMessage": "...",
  "aiResponse": { "rationale": "...", "concepts": ["...", "..."] },
  "likert": 4
}
```

> CSV에 한 행씩 append. `likert` 필드는 Phase 1에만 해당.

### 2.4 CSV 로그 스키마

**phase1_logs.csv**

| 컬럼 | 설명 |
|------|------|
| timestamp | ISO 8601 형식 |
| teamId | 참가팀 번호 |
| turnIndex | 해당 세션 내 턴 번호 |
| userMessage | 사용자 입력 |
| rationale | AI 선정 근거 |
| concept1 | 첫 번째 개념 |
| concept2 | 두 번째 개념 |
| likert | 만족도 (1~5, 미응답 시 null) |

**phase2_logs.csv**

| 컬럼 | 설명 |
|------|------|
| timestamp | ISO 8601 형식 |
| teamId | 참가팀 번호 |
| selectedConcept1 | 선택된 첫 번째 개념 |
| selectedConcept2 | 선택된 두 번째 개념 |
| userMessage | 사용자 추가 입력 |
| fusionDescription | AI 결합 방식 설명 |
| imageUrl | 생성된 이미지 URL 또는 로컬 경로 |

### 2.5 UI/UX 설계

#### 메인 페이지 (`/`)
- 중앙 정렬 레이아웃
- 팀 번호 입력 필드 + 시작 버튼
- 입력값을 `sessionStorage` 또는 URL query string(`?teamId=A1`)으로 전달

#### Phase 1 (`/phase1`)
- 상단: 팀 번호 표시, Phase 표시
- 중앙: 대화 내역 스크롤 영역
  - 사용자 발화: 오른쪽 정렬 말풍선
  - AI 응답: 왼쪽 정렬 (근거 텍스트 + 두 개념 카드)
  - AI 응답 하단: Likert 5점 버튼 (1~5 선택)
- 하단 고정: 텍스트 입력창 + 전송 버튼 (Enter 제출 지원)
- "Phase 2로 이동" 버튼 (원하는 시점에 클릭)

#### Phase 2 (`/phase2`)
- 상단: Phase 1에서 생성된 개념 쌍 목록 → 드롭다운 또는 카드 선택 UI
- 중앙: 추가 요구사항 입력창
- 하단: AI 응답 영역
  - 결합 방식 설명 텍스트
  - 생성 이미지 (로딩 스피너 포함)

### 2.6 상태 관리

- Phase 1 대화 내역 및 생성된 개념 쌍 목록은 React `useState` + `useContext` (또는 Zustand)로 관리
- Phase 1 → Phase 2 데이터 전달: Context 또는 `sessionStorage` 활용

---

## 3. TODO List

### Phase 0: 프로젝트 초기 세팅

- [ ] `npx create-next-app@latest`로 프로젝트 생성 (App Router, TypeScript, Tailwind 선택)
- [ ] `.env.local` 파일 생성 및 `OPENAI_API_KEY` 설정
- [ ] `.gitignore`에 `.env.local`, `data/logs/` 추가
- [ ] `data/logs/` 디렉터리 생성, `.gitkeep` 추가
- [ ] `openai` npm 패키지 설치 (`npm install openai`)
- [ ] `lib/openai.ts` 작성 (OpenAI 클라이언트 싱글턴 초기화)
- [ ] `lib/csvLogger.ts` 작성 (fs 모듈로 CSV append 유틸 함수)

### Phase 1: 메인 페이지

- [ ] `app/page.tsx` — 팀 번호 입력 폼 UI 구현
- [ ] 팀 번호 유효성 검사 (빈 값 방지)
- [ ] 입력 후 `/phase1?teamId=...` 로 라우팅

### Phase 2: Phase 1 페이지 & API

- [ ] `app/api/phase1/route.ts` — GPT API 호출 로직 구현
  - [ ] System 프롬프트 설계
  - [ ] 멀티턴 대화 히스토리 처리 (messages 배열)
  - [ ] 응답 파싱: rationale + concepts[2] 추출 (JSON mode 활용)
- [ ] `app/api/log/route.ts` — CSV append 로직 구현
- [ ] `components/ChatInput.tsx` — 텍스트 입력 + Enter/전송 버튼
- [ ] `components/LikertScale.tsx` — 1~5점 선택 버튼 UI
- [ ] `components/ConceptCard.tsx` — 두 개념 표시 카드 UI
- [ ] `app/phase1/page.tsx` — 전체 Phase 1 페이지 조립
  - [ ] 대화 내역 스크롤 영역
  - [ ] AI 응답 후 Likert 평가 활성화
  - [ ] Likert 선택 시 `/api/log` 호출
  - [ ] Phase 2 이동 버튼

### Phase 3: Phase 2 페이지 & API

- [ ] `app/api/phase2/route.ts` — GPT + DALL·E API 호출 로직
  - [ ] GPT로 결합 방식 설명 텍스트 생성
  - [ ] 생성된 설명을 DALL·E 3 프롬프트로 변환 후 이미지 생성
  - [ ] 응답 반환 (fusionDescription + imageUrl)
- [ ] `components/ConceptSelector.tsx` — Phase 1 개념 쌍 선택 UI
- [ ] `app/phase2/page.tsx` — 전체 Phase 2 페이지 조립
  - [ ] 개념 쌍 선택 UI
  - [ ] 추가 요구사항 입력창
  - [ ] 결합 설명 + 이미지 렌더링
  - [ ] 로딩 상태 처리 (이미지 생성 시간 고려)
  - [ ] 결과 로그 `/api/log` 저장

### Phase 4: 통합 및 QA

- [ ] Phase 1 → Phase 2 개념 쌍 데이터 전달 확인
- [ ] CSV 로그 정상 기록 여부 확인 (Phase 1, Phase 2 각각)
- [ ] 멀티턴 대화 컨텍스트 유지 확인
- [ ] 네트워크 에러 / API 오류 시 사용자에게 안내 메시지 표시
- [ ] 모바일 반응형 기본 검토
- [ ] 실험 시나리오 기반 End-to-End 흐름 테스트

---

## 부록: 주요 기술 결정 사항

| 항목 | 결정 | 이유 |
|------|------|------|
| 프레임워크 | Next.js App Router | API Route와 UI를 단일 프로젝트로 관리 |
| AI 텍스트 | GPT-4o (JSON mode) | 구조화된 응답 파싱 안정성 |
| AI 이미지 | DALL·E 3 | OpenAI 동일 계정으로 통합 관리 용이 |
| 데이터 저장 | CSV (로컬 파일시스템) | 연구 프로토타입 수준의 단순성, 별도 DB 불필요 |
| 상태 관리 | React Context + useState | 외부 라이브러리 없이 경량 관리 |
| 스타일링 | Tailwind CSS | 빠른 UI 구성, 커스텀 디자인 유연성 |
