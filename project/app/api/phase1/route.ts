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

const CONCEPT_VOCABULARY = `
SENSE (감각): Touch Scent Fragrance Aroma Flavor Taste Sound Rhythm Echo Silence Light Brightness Shadow Glow Sparkle Vibration Warmth Chill Sharpness Blur Smoothness Roughness Clarity
TIME (시간): Moment Instant Eternity Infinity Cycle Sequence Duration Interval Pace Pulse Age History Memory Anticipation Repetition Continuity Transition Impermanence Timelessness Progression Delay Acceleration Dawn Dusk Midnight Season Era
CULTURE (문화): Ritual Tradition Heritage Language Myth Festival Art Music Dance Theater Cinema Literature Design Architecture Religion Ideology Trend Identity Symbol Media Folklore Narrative Philosophy Politics Community Diversity Migration
CORE VALUES (가치): Freedom Justice Equality Truth Beauty Wisdom Harmony Transformation Chaos Order Power Resilience Sustainability Creativity Responsibility Dignity Peace Conflict Balance Legacy Innovation Authenticity Identity Vision Diversity Unity Possibility Purpose
SPACE (공간): Void Horizon Boundary Distance Proximity Density Openness Enclosure Volume Orbit Alignment Verticality Horizontality Perspective Angle Symmetry Asymmetry Fluidity Dimension Scale Geometry Axis Grid Structure Labyrinth Path Intersection
NATURE (자연): Forest Tree Leaf Flower Blossom Seed Root Soil Stone Mountain River Ocean Wave Tide Rain Storm Thunder Wind Cloud Sun Moon Star Flame Desert Ice Snow Sand Coral Bloom Meadow
FUTURE TECH (기술): Robot Algorithm Code Data Network Interface Virtual Digital Cyber Quantum Nanotech Biotech AI Automation Semiconductor Drone Sensor Hologram Avatar Blockchain Satellite Genome Circuit Machine Prototype Simulation Cloud Hybrid
MATERIALITY (물성): Ceramic Glass Metal Fabric Concrete Paper Wood Rubber Resin Crystal Moss Rust Wax Plaster Linen Silk Leather Gravel Membrane Mesh
EMOTION (감정): Joy Sorrow Anger Fear Surprise Hope Desire Love Hate Passion Empathy Serenity Melancholy Nostalgia Trust Doubt Confidence Pride Shame Excitement Loneliness Intimacy Courage Anxiety Relief Wonder Calmness Tension
`;

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
- rationale은 한국어로 2~4문장으로 작성할 것
- 아래 개념 어휘 목록을 참고하여 개념을 선정할 것. 목록 외의 단어도 사용 가능하나, 목록의 단어를 우선적으로 활용할 것

개념 어휘 목록:
${CONCEPT_VOCABULARY}`;

export async function POST(request: Request) {
  const body: Phase1Request = await request.json();
  const { userMessage, history } = body;

  const messages: { role: "system" | "user" | "assistant"; content: string }[] =
    [
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
  const parsed = JSON.parse(raw) as {
    rationale: string;
    concepts: [string, string];
  };

  return Response.json({
    rationale: parsed.rationale,
    concepts: parsed.concepts.slice(0, 2) as [string, string],
  });
}
