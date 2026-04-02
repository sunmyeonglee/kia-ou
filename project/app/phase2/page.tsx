"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import ChatInput from "@/components/ChatInput";
import ConceptSelector, { ConceptPair } from "@/components/ConceptSelector";

interface Iteration {
  userMessage: string;
  fusionDescription: string;
  imageUrl: string;
}

function Phase2Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamId = searchParams.get("teamId") ?? "unknown";

  const [pairs, setPairs] = useState<ConceptPair[]>([]);
  const [selectedPair, setSelectedPair] = useState<ConceptPair | null>(null);
  const [iterations, setIterations] = useState<Iteration[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // 새로고침 후 복원
  useEffect(() => {
    const storedPairs = sessionStorage.getItem("conceptPairs");
    if (storedPairs) {
      const parsed: ConceptPair[] = JSON.parse(storedPairs);
      setPairs(parsed);
      if (parsed.length > 0) setSelectedPair(parsed[parsed.length - 1]);
    }

    const storedIterations = sessionStorage.getItem(`phase2_iterations_${teamId}`);
    if (storedIterations) {
      const parsed: Iteration[] = JSON.parse(storedIterations);
      setIterations(parsed);
      setActiveIndex(parsed.length - 1);
    }
  }, [teamId]);

  // iterations 변경 시 sessionStorage에 저장
  useEffect(() => {
    if (iterations.length > 0)
      sessionStorage.setItem(`phase2_iterations_${teamId}`, JSON.stringify(iterations));
  }, [iterations, teamId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [iterations, loading]);

  const handleSubmit = async (userMessage: string) => {
    if (!selectedPair) {
      setError("개념 쌍을 선택해주세요.");
      return;
    }

    setLoading(true);
    setError("");
    setPendingMessage(userMessage);

    const res = await fetch("/api/phase2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
          teamId,
          concepts: selectedPair.concepts,
          userMessage,
          history: iterations.map((iter) => ({
            userMessage: iter.userMessage,
            fusionDescription: iter.fusionDescription,
          })),
        }),
    });

    if (!res.ok) {
      setError("AI 응답 중 오류가 발생했습니다. 다시 시도해주세요.");
      setPendingMessage(null);
      setLoading(false);
      return;
    }

    const data = await res.json() as { fusionDescription: string; imageUrl: string };

    setIterations((prev) => {
      const next = [...prev, { userMessage, ...data }];
      setActiveIndex(next.length - 1);
      return next;
    });
    setPendingMessage(null);

    await fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phase: 2,
        data: {
          teamId,
          selectedConcept1: selectedPair.concepts[0],
          selectedConcept2: selectedPair.concepts[1],
          userMessage,
          fusionDescription: data.fusionDescription,
          imageUrl: data.imageUrl,
        },
      }),
    });

    setLoading(false);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* 상단 헤더 */}
      <header className="shrink-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 z-10">
        <span className="rounded-full bg-purple-100 text-purple-700 text-xs font-semibold px-3 py-1">
          Phase 2
        </span>
        <span className="text-sm text-gray-500">팀 {teamId}</span>
      </header>

      {/* 개념 쌍 선택 */}
      {pairs.length > 0 && (
        <div className="shrink-0 bg-gray-50 border-b border-gray-200 px-4 py-3 z-10">
          <div className="max-w-7xl mx-auto">
            <ConceptSelector pairs={pairs} selected={selectedPair} onSelect={setSelectedPair} />
          </div>
        </div>
      )}

      {/* 메인 좌우 분할 */}
      <div className="flex flex-1 overflow-hidden">

        {/* 왼쪽: 대화 영역 */}
        <div className="flex flex-col w-1/2 border-r border-gray-200">
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">

            {pairs.length === 0 && (
              <div className="text-center py-16 space-y-4">
                <p className="text-2xl">⚠️</p>
                <p className="text-sm text-gray-500">Phase 1을 먼저 완료해주세요.</p>
                <button
                  onClick={() => router.push(`/phase1?teamId=${encodeURIComponent(teamId)}`)}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  ← Phase 1으로 돌아가기
                </button>
              </div>
            )}

            {pairs.length > 0 && iterations.length === 0 && !loading && (
              <div className="text-center py-16 text-gray-400 text-sm">
                <p className="text-2xl mb-3">🎨</p>
                <p>요구사항을 입력하면</p>
                <p>AI가 두 개념을 결합한 이미지를 생성합니다.</p>
              </div>
            )}

            {iterations.map((iter, i) => (
              <div key={i} className="space-y-2">
                {/* 사용자 메시지 */}
                <div className="flex justify-end">
                  <div className="max-w-xs rounded-2xl rounded-tr-sm bg-purple-600 px-4 py-3 text-sm text-white">
                    {iter.userMessage}
                  </div>
                </div>
                {/* AI 설명 + 이미지 이동 버튼 */}
                <div className="flex justify-start">
                  <div className={`max-w-xs rounded-2xl rounded-tl-sm border px-4 py-3 text-sm leading-relaxed transition-colors ${
                    activeIndex === i
                      ? "bg-purple-50 border-purple-300 text-gray-700"
                      : "bg-white border-gray-200 text-gray-700"
                  }`}>
                    <p>{iter.fusionDescription}</p>
                    <button
                      onClick={() => setActiveIndex(i)}
                      className={`mt-2 text-xs font-semibold px-3 py-1 rounded-full transition-colors ${
                        activeIndex === i
                          ? "bg-purple-600 text-white"
                          : "bg-gray-100 text-purple-600 hover:bg-purple-100"
                      }`}
                    >
                      {activeIndex === i ? "현재 표시 중" : `이미지 ${i + 1} 보기 →`}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {loading && pendingMessage && (
              <div className="space-y-2">
                <div className="flex justify-end">
                  <div className="max-w-xs rounded-2xl rounded-tr-sm bg-purple-600 px-4 py-3 text-sm text-white">
                    {pendingMessage}
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-tl-sm bg-gray-100 px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
                    <span>이미지 생성 중...</span>
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
          </div>

          {/* 하단 입력창 */}
          <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-4">
            <ChatInput
              onSubmit={handleSubmit}
              disabled={loading || !selectedPair}
              placeholder={
                !selectedPair
                  ? "위에서 개념 쌍을 먼저 선택해주세요"
                  : iterations.length === 0
                  ? "두 개념을 어떻게 결합할지 입력하세요..."
                  : "이미지를 수정할 요구사항을 입력하세요..."
              }
            />
          </div>
        </div>

        {/* 오른쪽: 이미지 영역 */}
        <div className="flex flex-col w-1/2 bg-gray-100">
          {/* 탭 */}
          {iterations.length > 0 && (
            <div className="shrink-0 flex items-center gap-1 px-3 py-2 bg-white border-b border-gray-200 overflow-x-auto">
              {iterations.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeIndex === i
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-purple-50 hover:text-purple-600"
                  }`}
                >
                  이미지 {i + 1}
                </button>
              ))}
              {loading && (
                <div className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-400 flex items-center gap-1">
                  <div className="w-3 h-3 border-2 border-gray-300 border-t-purple-400 rounded-full animate-spin" />
                  생성 중
                </div>
              )}
            </div>
          )}

          {/* 이미지 표시 */}
          <div className="flex-1 flex items-center justify-center relative">
            {!loading && iterations.length === 0 && (
              <div className="text-center text-gray-300 text-sm">
                <p className="text-5xl mb-4">🖼️</p>
                <p>생성된 이미지가 여기에 표시됩니다</p>
              </div>
            )}

            {loading && iterations.length === 0 && (
              <div className="text-center space-y-3 text-gray-400">
                <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto" />
                <p className="text-sm">이미지 생성 중...</p>
              </div>
            )}

            {iterations.length > 0 && iterations[activeIndex]?.imageUrl && (
              <div className="relative w-full h-full">
                <Image
                  src={iterations[activeIndex].imageUrl}
                  alt={`이미지 ${activeIndex + 1}`}
                  fill
                  className={`object-contain transition-opacity duration-300 ${loading && activeIndex === iterations.length - 1 ? "opacity-40" : "opacity-100"}`}
                  sizes="50vw"
                />
                {loading && activeIndex === iterations.length - 1 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                  </div>
                )}
                {/* 이전/다음 화살표 */}
                {iterations.length > 1 && (
                  <>
                    <button
                      onClick={() => setActiveIndex((prev) => Math.max(0, prev - 1))}
                      disabled={activeIndex === 0}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 shadow flex items-center justify-center text-gray-600 hover:bg-white disabled:opacity-30 transition-all"
                    >
                      ‹
                    </button>
                    <button
                      onClick={() => setActiveIndex((prev) => Math.min(iterations.length - 1, prev + 1))}
                      disabled={activeIndex === iterations.length - 1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 shadow flex items-center justify-center text-gray-600 hover:bg-white disabled:opacity-30 transition-all"
                    >
                      ›
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Phase2Page() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-gray-400">로딩 중...</div>}>
      <Phase2Content />
    </Suspense>
  );
}
