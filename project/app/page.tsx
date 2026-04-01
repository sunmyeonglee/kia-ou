"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MainPage() {
  const router = useRouter();
  const [teamId, setTeamId] = useState("");
  const [error, setError] = useState("");

  const handleStart = () => {
    const trimmed = teamId.trim();
    if (!trimmed) {
      setError("팀 번호를 입력해주세요.");
      return;
    }
    setError("");
    router.push(`/phase1?teamId=${encodeURIComponent(trimmed)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleStart();
  };

  return (
    <main className="flex flex-1 flex-col items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">창의적 개념 탐색</h1>
          <p className="text-sm text-gray-500">AI와 함께하는 연구 실험에 참여해주세요</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            참가팀 번호
          </label>
          <input
            type="text"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="예: A1, B3"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            onClick={handleStart}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            실험 시작 →
          </button>
        </div>
      </div>
    </main>
  );
}
