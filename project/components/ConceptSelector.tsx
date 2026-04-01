"use client";

export interface ConceptPair {
  concepts: [string, string];
  turnIndex: number;
}

interface ConceptSelectorProps {
  pairs: ConceptPair[];
  selected: ConceptPair | null;
  onSelect: (pair: ConceptPair) => void;
}

export default function ConceptSelector({ pairs, selected, onSelect }: ConceptSelectorProps) {
  if (pairs.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">Phase 1에서 생성된 개념 쌍이 없습니다.</p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">Phase 1에서 생성된 개념 쌍을 선택하세요</p>
      <div className="grid gap-2">
        {pairs.map((pair, i) => {
          const isSelected =
            selected?.concepts[0] === pair.concepts[0] &&
            selected?.concepts[1] === pair.concepts[1];
          return (
            <button
              key={i}
              onClick={() => onSelect(pair)}
              className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all
                ${
                  isSelected
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 bg-white hover:border-blue-300"
                }
              `}
            >
              <span className="text-xs text-gray-400 shrink-0">턴 {pair.turnIndex + 1}</span>
              <div className="flex gap-2 flex-1">
                <span className="rounded-lg bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                  {pair.concepts[0]}
                </span>
                <span className="text-gray-400 self-center">↔</span>
                <span className="rounded-lg bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                  {pair.concepts[1]}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
