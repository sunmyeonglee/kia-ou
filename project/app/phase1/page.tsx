"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ChatInput from "@/components/ChatInput";
import LikertScale from "@/components/LikertScale";
import ConceptCard from "@/components/ConceptCard";

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
  const teamId = searchParams.get("teamId") ?? "unknown";

  const [turns, setTurns] = useState<Turn[]>([]);
  const [history, setHistory] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const turnsRef = useRef<Turn[]>([]);
  turnsRef.current = turns;

  // 새로고침 후 복원
  useEffect(() => {
    const savedTurns = sessionStorage.getItem(`phase1_turns_${teamId}`);
    const savedHistory = sessionStorage.getItem(`phase1_history_${teamId}`);
    if (savedTurns) setTurns(JSON.parse(savedTurns));
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, [teamId]);

  // turns/history 변경 시 sessionStorage에 저장
  useEffect(() => {
    if (turns.length > 0) sessionStorage.setItem(`phase1_turns_${teamId}`, JSON.stringify(turns));
  }, [turns, teamId]);

  useEffect(() => {
    if (history.length > 0) sessionStorage.setItem(`phase1_history_${teamId}`, JSON.stringify(history));
  }, [history, teamId]);

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

  const handleLikert = async (turnIndex: number, value: number) => {
    // ref에서 최신 turns를 읽어 stale closure 방지
    const turn = turnsRef.current.find((t) => t.turnIndex === turnIndex);
    if (!turn || turn.logged) return;

    setTurns((prev) =>
      prev.map((t) =>
        t.turnIndex === turnIndex ? { ...t, likert: value, logged: true } : t
      )
    );

    await saveLog(teamId, turn, value);
  };

  const handleGoToPhase2 = async () => {
    // 미평가(logged=false) 턴은 likert=null로 일괄 저장
    const unlogged = turnsRef.current.filter((t) => !t.logged);
    await Promise.all(unlogged.map((t) => saveLog(teamId, t, null)));

    const pairs: ConceptPair[] = turnsRef.current.map((t) => ({
      concepts: t.concepts,
      turnIndex: t.turnIndex,
    }));
    sessionStorage.setItem("conceptPairs", JSON.stringify(pairs));
    router.push(`/phase2?teamId=${encodeURIComponent(teamId)}`);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* 상단 헤더 */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1">
            Phase 1
          </span>
          <span className="text-sm text-gray-500">팀 {teamId}</span>
        </div>
        <button
          onClick={handleGoToPhase2}
          disabled={turns.length === 0}
          className="rounded-xl bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Phase 2로 이동 →
        </button>
      </header>

      {/* 대화 영역 */}
      <main className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl mx-auto w-full space-y-6">
        {turns.length === 0 && !loading && (
          <div className="text-center py-16 text-gray-400 text-sm">
            <p className="text-2xl mb-3">💭</p>
            <p>요구사항을 입력하면 AI가 상반된 두 개념을 제안합니다.</p>
            <p className="mt-1">예: "환경과 기술에 대한 상반된 개념을 찾고 싶어"</p>
          </div>
        )}

        {turns.map((turn) => (
          <div key={turn.turnIndex} className="space-y-3">
            {/* 사용자 메시지 */}
            <div className="flex justify-end">
              <div className="max-w-xs rounded-2xl rounded-tr-sm bg-blue-600 px-4 py-3 text-sm text-white">
                {turn.userMessage}
              </div>
            </div>

            {/* AI 응답 */}
            <div className="flex justify-start">
              <div className="max-w-lg w-full">
                <ConceptCard concepts={turn.concepts} rationale={turn.rationale} />
                <LikertScale
                  onSelect={(val) => handleLikert(turn.turnIndex, val)}
                  selected={turn.likert}
                  disabled={turn.logged}
                />
              </div>
            </div>
          </div>
        ))}

        {loading && pendingMessage && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <div className="max-w-xs rounded-2xl rounded-tr-sm bg-blue-600 px-4 py-3 text-sm text-white">
                {pendingMessage}
              </div>
            </div>
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-tl-sm bg-gray-100 px-4 py-3 text-sm text-gray-500 animate-pulse">
                AI가 개념을 생성하고 있습니다...
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      {/* 하단 입력창 */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <ChatInput
            onSubmit={handleSubmit}
            disabled={loading}
            placeholder="요구사항을 입력하세요... (Enter로 전송)"
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
