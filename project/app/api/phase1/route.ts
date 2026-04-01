import openai from "@/lib/openai";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Phase1Request {
  teamId: string;
  turnIndex: number;
  userMessage: string;
  history: Message[];
}

const SYSTEM_PROMPT = `너는 창의적 사고를 돕는 AI 퍼실리테이터야.
사용자의 요구사항을 바탕으로 의미 있게 상반되는 두 개념을 한 쌍 제시하고, 선정 근거를 설명해.
반드시 아래 JSON 형식으로만 응답해. 다른 텍스트는 포함하지 마.

{
  "rationale": "두 개념을 선정한 이유와 상반성에 대한 설명",
  "concepts": ["첫 번째 개념", "두 번째 개념"]
}

주의사항:
- concepts 배열에는 반드시 정확히 2개의 개념만 포함할 것
- 두 개념은 의미적으로 명확하게 상반되어야 함
- rationale은 한국어로 2~4문장으로 작성할 것`;

export async function POST(request: Request) {
  const body: Phase1Request = await request.json();
  const { userMessage, history } = body;

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    response_format: { type: "json_object" },
    temperature: 0.8,
  });

  const raw = completion.choices[0].message.content ?? "{}";
  const parsed = JSON.parse(raw) as { rationale: string; concepts: [string, string] };

  return Response.json({
    rationale: parsed.rationale,
    concepts: parsed.concepts,
  });
}
