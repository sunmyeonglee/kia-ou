import { logPhase1, logPhase2, Phase1LogEntry, Phase2LogEntry } from "@/lib/csvLogger";

interface LogRequest {
  phase: 1 | 2;
  data: Phase1LogEntry | Phase2LogEntry;
}

export async function POST(request: Request) {
  const body: LogRequest = await request.json();

  if (body.phase === 1) {
    logPhase1(body.data as Phase1LogEntry);
  } else if (body.phase === 2) {
    logPhase2(body.data as Phase2LogEntry);
  } else {
    return Response.json({ error: "Invalid phase" }, { status: 400 });
  }

  return Response.json({ ok: true });
}
