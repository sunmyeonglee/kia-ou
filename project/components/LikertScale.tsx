"use client";

import { Button } from "@/components/ui/button";

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
      <p className="text-xs text-muted-foreground mb-2">이 응답에 대한 만족도를 선택해주세요</p>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((val) => (
          <Button
            key={val}
            title={LABELS[val]}
            onClick={() => !disabled && onSelect(val)}
            disabled={disabled}
            variant={selected === val ? "default" : "outline"}
            size="icon"
          >
            {val}
          </Button>
        ))}
      </div>
      {selected !== null && (
        <p className="text-xs text-muted-foreground mt-1">{LABELS[selected!]} ({selected}점)</p>
      )}
    </div>
  );
}
