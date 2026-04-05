import { Card, CardContent } from "@/components/ui/card";

interface ConceptCardProps {
  concepts: [string, string];
  rationale: string;
}

export default function ConceptCard({ concepts, rationale }: ConceptCardProps) {
  return (
    <Card size="sm">
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">{rationale}</p>
        <div className="flex flex-col sm:flex-row gap-2">
          {concepts.map((concept, i) => (
            <div
              key={i}
              className="flex-1 rounded-lg border border-border bg-muted/50 px-4 py-3 text-center"
            >
              <span className="text-xs text-muted-foreground font-medium block mb-1">개념 {i + 1}</span>
              <span className="text-sm font-semibold">{concept}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
