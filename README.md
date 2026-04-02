# KIA-OU — Generative AI 창의적 개념 탐색 실험

연구용 프로토타입 웹 서비스. 참가자가 AI와 대화하며 상반된 두 개념을 발견하고, 이를 결합한 이미지를 생성하는 2단계 실험 플로우를 제공한다.

---

## 기술 스택

- **Frontend/Backend**: Next.js 16 (App Router, TypeScript)
- **Styling**: Tailwind CSS
- **AI**: GPT-4o (JSON mode), DALL·E 3
- **DB/Storage**: Supabase (PostgreSQL + Storage)
- **Deployment**: Vercel

---

## 실험 흐름

```
메인 페이지 → Phase 1 → Phase 2
```

1. **메인 페이지**: 팀 번호 입력
2. **Phase 1**: AI와 멀티턴 대화로 상반된 개념 쌍 탐색 + 5점 Likert 만족도 평가
3. **Phase 2**: 개념 쌍 선택 → AI가 결합 방식 설명 + DALL·E 3 이미지 생성 (반복 수정 가능)

---

## 로컬 실행

```bash
cd project
npm install
```

`.env.local` 파일 생성:

```
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

```bash
npm run dev
```

---

## Supabase 설정

`phase1_logs`, `phase2_logs` 테이블과 `generated-images` 스토리지 버킷(public)이 필요합니다. 스키마 상세는 `dev_document.md` 참조.

---

## 프로젝트 문서

상세 기획 및 개발 기록: [`dev_document.md`](./dev_document.md)
