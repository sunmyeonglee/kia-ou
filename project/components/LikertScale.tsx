"use client";

interface LikertScaleProps {
  onSelect: (value: number) => void;
  selected: number | null;
  disabled?: boolean;
}

const LABELS: Record<number, string> = {
  1: "매우 불만족",
  2: "불만족",
  3: "보통",
  4: "만족",
  5: "매우 만족",
};

export default function LikertScale({ onSelect, selected, disabled = false }: LikertScaleProps) {
  return (
    <div className="mt-3">
      <p className="text-xs text-gray-500 mb-2">이 응답에 대한 만족도를 선택해주세요</p>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((val) => (
          <button
            key={val}
            title={LABELS[val]}
            onClick={() => !disabled && onSelect(val)}
            disabled={disabled}
            className={`w-9 h-9 rounded-full text-sm font-semibold border-2 transition-all
              ${
                selected === val
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            {val}
          </button>
        ))}
      </div>
      {selected !== null && (
        <p className="text-xs text-blue-600 mt-1">{LABELS[selected!]} ({selected}점)</p>
      )}
    </div>
  );
}
