import openai from "@/lib/openai";
import supabase from "@/lib/supabase";

export const maxDuration = 60;

interface IterationHistory {
  userMessage: string;
  fusionDescription: string;
}

interface Phase2Request {
  teamId: string;
  concepts: [string, string];
  userMessage: string;
  history: IterationHistory[];
}

const SYSTEM_PROMPT = `너는 창의적 개념 결합을 돕는 AI야.
사용자가 제시한 두 개의 상반된 개념과 요구사항을 바탕으로, 두 개념이 창의적으로 결합된 방식을 설명해.
이전 대화 내역이 있다면 그 맥락을 반영하여 수정하거나 발전시켜줘.
반드시 아래 JSON 형식으로만 응답해. 다른 텍스트는 포함하지 마.

{
  "fusionDescription": "두 개념이 결합된 방식과 그 창의적 의미에 대한 설명",
  "imagePrompt": "결합된 개념을 시각화하기 위한 영어 이미지 생성 프롬프트"
}

주의사항:
- fusionDescription은 한국어로 3~5문장으로 작성할 것
- imagePrompt는 DALL-E 3에 적합한 상세한 영어 프롬프트로 작성할 것
- imagePrompt는 두 개념의 시각적 결합이 명확히 드러나도록 구체적으로 작성할 것`;

async function uploadImageToSupabase(tempUrl: string, filename: string): Promise<string> {
  const res = await fetch(tempUrl);
  const buffer = Buffer.from(await res.arrayBuffer());

  const { error } = await supabase.storage
    .from("generated-images")
    .upload(filename, buffer, { contentType: "image/png", upsert: false });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabase.storage
    .from("generated-images")
    .getPublicUrl(filename);

  return data.publicUrl;
}

export async function POST(request: Request) {
  const body: Phase2Request = await request.json();
  const { teamId, concepts, userMessage, history } = body;

  // 이전 이터레이션을 messages로 변환
  const historyMessages: { role: "user" | "assistant"; content: string }[] = history.flatMap((iter) => [
    { role: "user", content: iter.userMessage },
    { role: "assistant", content: JSON.stringify({ fusionDescription: iter.fusionDescription, imagePrompt: "" }) },
  ]);

  const userContent = `상반된 두 개념: "${concepts[0]}"와 "${concepts[1]}"
요구사항: ${userMessage}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...historyMessages,
      { role: "user", content: userContent },
    ],
    response_format: { type: "json_object" },
    temperature: 0.8,
  });

  const raw = completion.choices[0].message.content ?? "{}";
  const parsed = JSON.parse(raw) as { fusionDescription: string; imagePrompt: string };

  // 이전 이미지 프롬프트 맥락을 DALL-E 프롬프트에 반영
  const previousContext = history.length > 0
    ? `This is a refinement based on previous iterations. Previous description: "${history[history.length - 1].fusionDescription}". `
    : "";

  const imageResponse = await openai.images.generate({
    model: "dall-e-3",
    prompt: previousContext + parsed.imagePrompt,
    n: 1,
    size: "1024x1024",
    quality: "standard",
  });

  const tempUrl = imageResponse.data?.[0]?.url ?? "";
  const filename = `${teamId}_${Date.now()}.png`;
  const imageUrl = tempUrl ? await uploadImageToSupabase(tempUrl, filename) : "";

  return Response.json({
    fusionDescription: parsed.fusionDescription,
    imageUrl,
  });
}
