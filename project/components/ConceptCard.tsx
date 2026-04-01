interface ConceptCardProps {
  concepts: [string, string];
  rationale: string;
}

export default function ConceptCard({ concepts, rationale }: ConceptCardProps) {
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-3">
      <p className="text-sm text-gray-600">{rationale}</p>
      <div className="flex gap-3">
        {concepts.map((concept, i) => (
          <div
            key={i}
            className="flex-1 rounded-lg bg-white border border-blue-200 px-4 py-3 text-center"
          >
            <span className="text-xs text-blue-400 font-medium block mb-1">개념 {i + 1}</span>
            <span className="text-sm font-semibold text-gray-800">{concept}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
