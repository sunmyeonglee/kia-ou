"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ChatInput from "@/components/ChatInput";
import LikertScale from "@/components/LikertScale";
import ConceptCard from "@/components/ConceptCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, ArrowRight } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Turn {
  userMessage: string;
  rationale: string;
  concepts: [string, string];
  likert: number | null;
  turnIndex: number;
  logged: boolean; // likert 선택 후 로그 저장 여부
}

export interface ConceptPair {
  concepts: [string, string];
  turnIndex: number;
}

async function saveLog(teamId: string, turn: Turn, likert: number | null) {
  await fetch("/api/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phase: 1,
      data: {
        teamId,
        turnIndex: turn.turnIndex,
        userMessage: turn.userMessage,
        rationale: turn.rationale,
        concept1: turn.concepts[0],
        concept2: turn.concepts[1],
        likert,
      },
    }),
  });
}

function Phase1Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamId = searchParams.get("teamId") ?? "";
  const sessionId = searchParams.get("sessionId") ?? sessionStorage.getItem("sessionId") ?? "default";
  const storageKey = `${teamId}_${sessionId}`;

  const [turns, setTurns] = useState<Turn[]>([]);
  const [history, setHistory] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const turnsRef = useRef<Turn[]>([]);
  turnsRef.current = turns;

  // teamId 없으면 메인으로 리다이렉트
  useEffect(() => {
    if (!teamId) router.replace("/");
  }, [teamId, router]);

  // 새로고침 후 복원
  useEffect(() => {
    if (!teamId) return;
    const savedTurns = sessionStorage.getItem(`phase1_turns_${storageKey}`);
    const savedHistory = sessionStorage.getItem(`phase1_history_${storageKey}`);
    if (savedTurns) setTurns(JSON.parse(savedTurns));
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, [storageKey, teamId]);

  // turns/history 변경 시 sessionStorage에 저장
  useEffect(() => {
    if (turns.length > 0) sessionStorage.setItem(`phase1_turns_${storageKey}`, JSON.stringify(turns));
  }, [turns, storageKey]);

  useEffect(() => {
    if (history.length > 0) sessionStorage.setItem(`phase1_history_${storageKey}`, JSON.stringify(history));
  }, [history, storageKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, loading]);

  const handleSubmit = async (userMessage: string) => {
    setLoading(true);
    setError("");
    setPendingMessage(userMessage);

    const turnIndex = turns.length;

    const res = await fetch("/api/phase1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, turnIndex, userMessage, history }),
    });

    if (!res.ok) {
      setError("AI 응답 중 오류가 발생했습니다. 다시 시도해주세요.");
      setPendingMessage(null);
      setLoading(false);
      return;
    }

    const data = await res.json() as { rationale: string; concepts: [string, string] };

    const newTurn: Turn = {
      userMessage,
      rationale: data.rationale,
      concepts: data.concepts,
      likert: null,
      turnIndex,
      logged: false,
    };

    setPendingMessage(null);
    setTurns((prev) => [...prev, newTurn]);
    setHistory((prev) => [
      ...prev,
      { role: "user", content: userMessage },
      { role: "assistant", content: `근거: ${data.rationale}\n개념: ${data.concepts[0]}, ${data.concepts[1]}` },
    ]);

    setLoading(false);
  };

  const handleLikert = (turnIndex: number, value: number) => {
    setTurns((prev) =>
      prev.map((t) =>
        t.turnIndex === turnIndex ? { ...t, likert: value } : t
      )
    );
  };

  const handleGoToPhase2 = async () => {
    // Phase 2 이동 시 모든 턴 일괄 저장
    const unlogged = turnsRef.current.filter((t) => !t.logged);
    await Promise.all(unlogged.map((t) => saveLog(teamId, t, t.likert)));

    const pairs: ConceptPair[] = turnsRef.current.map((t) => ({
      concepts: t.concepts,
      turnIndex: t.turnIndex,
    }));
    sessionStorage.setItem("conceptPairs", JSON.stringify(pairs));
    router.push(`/phase2?teamId=${encodeURIComponent(teamId)}&sessionId=${sessionId}`);
  };

  return (
    <div className="flex flex-col min-h-dvh">
      {/* 상단 헤더 */}
      <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="secondary">Phase 1</Badge>
          <span className="text-sm text-muted-foreground">팀 {teamId}</span>
        </div>
        <Button
          onClick={handleGoToPhase2}
          disabled={turns.length === 0 || loading}
          size="sm"
        >
          Phase 2로 이동 <ArrowRight className="size-4" />
        </Button>
      </header>

      {/* 대화 영역 */}
      <main className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl mx-auto w-full space-y-6">
        {turns.length === 0 && !loading && (
          <div className="text-center py-16 text-muted-foreground text-sm">
            <MessageCircle className="mx-auto mb-3 size-8 opacity-40" />
            <p>요구사항을 입력하면 AI가 상반된 두 개념을 제안합니다.</p>
            <p className="mt-1">예: "환경과 기술에 대한 상반된 개념을 찾고 싶어"</p>
          </div>
        )}

        {turns.map((turn) => (
          <div key={turn.turnIndex} className="space-y-3">
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-3 text-sm">
                {turn.userMessage}
              </div>
            </div>
            <div className="flex justify-start">
              <div className="max-w-lg w-full">
                <ConceptCard concepts={turn.concepts} rationale={turn.rationale} />
                <LikertScale
                  onSelect={(val) => handleLikert(turn.turnIndex, val)}
                  selected={turn.likert}
                />
              </div>
            </div>
          </div>
        ))}

        {loading && pendingMessage && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-3 text-sm">
                {pendingMessage}
              </div>
            </div>
            <div className="flex justify-start">
              <div className="max-w-lg w-full space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div ref={bottomRef} />
      </main>

      {/* 하단 입력창 */}
      <div className="sticky bottom-0 bg-background border-t border-border px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <ChatInput
            onSubmit={handleSubmit}
            disabled={loading}
            placeholder="요구사항을 입력하세요..."
          />
        </div>
      </div>
    </div>
  );
}

export default function Phase1Page() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-gray-400">로딩 중...</div>}>
      <Phase1Content />
    </Suspense>
  );
}
