"use client";

import { Badge } from "@/components/ui/badge";

export interface ConceptPair {
  concepts: [string, string];
  turnIndex: number;
}

interface ConceptSelectorProps {
  pairs: ConceptPair[];
  selected: ConceptPair | null;
  onSelect: (pair: ConceptPair) => void;
  onClose?: () => void;
}

export default function ConceptSelector({ pairs, selected, onSelect, onClose }: ConceptSelectorProps) {
  if (pairs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Phase 1에서 생성된 개념 쌍이 없습니다.</p>
    );
  }

  return (
    <div className="grid gap-1.5">
      {pairs.map((pair, i) => {
        const isSelected =
          selected?.concepts[0] === pair.concepts[0] &&
          selected?.concepts[1] === pair.concepts[1];
        return (
          <button
            key={i}
            onClick={() => { onSelect(pair); onClose?.(); }}
            className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all
              ${isSelected ? "border-foreground bg-muted" : "border-border hover:bg-muted/50"}`}
          >
            <Badge variant="secondary" className="shrink-0">턴 {pair.turnIndex + 1}</Badge>
            <div className="flex gap-2 flex-1 flex-wrap items-center">
              <span className="rounded-md bg-muted px-2 py-0.5 text-sm font-medium">{pair.concepts[0]}</span>
              <span className="text-muted-foreground text-xs">↔</span>
              <span className="rounded-md bg-muted px-2 py-0.5 text-sm font-medium">{pair.concepts[1]}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
