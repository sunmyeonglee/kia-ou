"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import ChatInput from "@/components/ChatInput";
import ConceptSelector, { ConceptPair } from "@/components/ConceptSelector";

interface Phase2Result {
  fusionDescription: string;
  imageUrl: string;
}

function Phase2Content() {
  const searchParams = useSearchParams();
  const teamId = searchParams.get("teamId") ?? "unknown";

  const [pairs, setPairs] = useState<ConceptPair[]>([]);
  const [selectedPair, setSelectedPair] = useState<ConceptPair | null>(null);
  const [result, setResult] = useState<Phase2Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("conceptPairs");
    if (stored) {
      const parsed: ConceptPair[] = JSON.parse(stored);
      setPairs(parsed);
      if (parsed.length > 0) setSelectedPair(parsed[parsed.length - 1]);
    }
  }, []);

  const handleSubmit = async (userMessage: string) => {
    if (!selectedPair) {
      setError("개념 쌍을 선택해주세요.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    const res = await fetch("/api/phase2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamId,
        concepts: selectedPair.concepts,
        userMessage,
      }),
    });

    if (!res.ok) {
      setError("AI 응답 중 오류가 발생했습니다. 다시 시도해주세요.");
      setLoading(false);
      return;
    }

    const data: Phase2Result = await res.json();
    setResult(data);

    // 로그 저장
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
    <div className="flex flex-col min-h-screen">
      {/* 상단 헤더 */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <span className="rounded-full bg-purple-100 text-purple-700 text-xs font-semibold px-3 py-1">
          Phase 2
        </span>
        <span className="text-sm text-gray-500">팀 {teamId}</span>
      </header>

      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full space-y-6">
        {/* 개념 쌍 선택 */}
        <section className="bg-white rounded-2xl border border-gray-200 p-5">
          <ConceptSelector
            pairs={pairs}
            selected={selectedPair}
            onSelect={setSelectedPair}
          />
        </section>

        {/* 입력창 */}
        <section className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
          <p className="text-sm font-medium text-gray-700">추가 요구사항</p>
          <ChatInput
            onSubmit={handleSubmit}
            disabled={loading || !selectedPair}
            placeholder="두 개념을 어떻게 결합할지 요구사항을 입력하세요..."
          />
        </section>

        {/* 로딩 */}
        {loading && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-3">
            <div className="inline-block w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-500">AI가 이미지를 생성하고 있습니다...<br />잠시 기다려주세요.</p>
          </div>
        )}

        {/* 에러 */}
        {error && (
          <div className="text-center text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* 결과 */}
        {result && !loading && (
          <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <p className="text-xs font-semibold text-purple-600 mb-2">결합 방식 설명</p>
              <p className="text-sm text-gray-700 leading-relaxed">{result.fusionDescription}</p>
            </div>
            {result.imageUrl && (
              <div className="relative w-full aspect-square">
                <Image
                  src={result.imageUrl}
                  alt="AI 생성 결합 이미지"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 672px"
                />
              </div>
            )}
          </section>
        )}

        {/* 빈 상태 안내 */}
        {!loading && !result && pairs.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">
            <p className="text-2xl mb-3">⚠️</p>
            <p>Phase 1을 먼저 완료해주세요.</p>
            <p className="mt-1">Phase 1에서 생성된 개념 쌍이 여기에 표시됩니다.</p>
          </div>
        )}
      </main>
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
