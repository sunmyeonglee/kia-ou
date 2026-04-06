"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import ChatInput from "@/components/ChatInput";
import ConceptSelector, { ConceptPair } from "@/components/ConceptSelector";
import LikertScale from "@/components/LikertScale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageIcon, ChevronDown, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Iteration {
  userMessage: string;
  fusionDescription: string;
  imageUrl: string;
  attachedImageUrls: string[];
  likert: number | null;
}

interface ImageAreaProps {
  iterations: Iteration[];
  activeIndex: number;
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
  loading: boolean;
}

function ImageArea({ iterations, activeIndex, setActiveIndex, loading }: ImageAreaProps) {
  return (
    <div className="flex flex-col bg-muted/30 w-full md:h-full h-[35vh]">
      {iterations.length > 0 && (
        <div className="shrink-0 flex items-center gap-1 px-3 py-2 bg-background border-b border-border overflow-x-auto">
          {iterations.map((_, i) => (
            <Button
              key={i}
              onClick={() => setActiveIndex(i)}
              variant={activeIndex === i ? "default" : "ghost"}
              size="xs"
              className="shrink-0"
            >
              이미지 {i + 1}
            </Button>
          ))}
          {loading && (
            <div className="shrink-0 px-2 py-1 text-xs text-muted-foreground flex items-center gap-1">
              <div className="w-3 h-3 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
              생성 중
            </div>
          )}
        </div>
      )}
      <div className="flex-1 flex items-center justify-center relative">
        {!loading && iterations.length === 0 && (
          <div className="text-center text-muted-foreground/50 text-sm">
            <ImageIcon className="mx-auto mb-3 size-8 opacity-30" />
            <p>생성된 이미지가 여기에 표시됩니다</p>
          </div>
        )}
        {loading && iterations.length === 0 && (
          <div className="text-center space-y-3 text-muted-foreground">
            <div className="w-10 h-10 border-4 border-muted border-t-foreground rounded-full animate-spin mx-auto" />
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
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            {loading && activeIndex === iterations.length - 1 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-muted border-t-foreground rounded-full animate-spin" />
              </div>
            )}
            {iterations.length > 1 && (
              <>
                <Button
                  onClick={() => setActiveIndex((prev) => Math.max(0, prev - 1))}
                  disabled={activeIndex === 0}
                  variant="outline"
                  size="icon"
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-background/80 shadow"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  onClick={() => setActiveIndex((prev) => Math.min(iterations.length - 1, prev + 1))}
                  disabled={activeIndex === iterations.length - 1}
                  variant="outline"
                  size="icon"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-background/80 shadow"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Phase2Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamId = searchParams.get("teamId") ?? "";
  const sessionId = searchParams.get("sessionId") ?? sessionStorage.getItem("sessionId") ?? "default";
  const storageKey = `${teamId}_${sessionId}`;

  const [pairs, setPairs] = useState<ConceptPair[]>([]);
  const [selectedPair, setSelectedPair] = useState<ConceptPair | null>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [iterations, setIterations] = useState<Iteration[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!teamId) router.replace("/");
  }, [teamId, router]);

  useEffect(() => {
    if (!teamId) return;
    const storedPairs = sessionStorage.getItem("conceptPairs");
    if (storedPairs) {
      const parsed: ConceptPair[] = JSON.parse(storedPairs);
      setPairs(parsed);
    }
    const storedIterations = sessionStorage.getItem(`phase2_iterations_${storageKey}`);
    if (storedIterations) {
      const parsed: Iteration[] = JSON.parse(storedIterations);
      setIterations(parsed);
      setActiveIndex(parsed.length - 1);
    }
  }, [teamId, storageKey]);

  useEffect(() => {
    if (iterations.length > 0)
      sessionStorage.setItem(`phase2_iterations_${storageKey}`, JSON.stringify(iterations));
  }, [iterations, storageKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [iterations, loading]);

  const handleSubmit = async (userMessage: string, files?: File[]) => {
    if (!selectedPair) {
      setError("개념 쌍을 선택해주세요.");
      return;
    }
    const iterationIndex = iterations.length;
    setLoading(true);
    setError("");
    setPendingMessage(userMessage);
    setPendingPreviews((files ?? []).map((f) => URL.createObjectURL(f)));

    const images = await Promise.all(
      (files ?? []).map((f) => new Promise<{ base64: string; mimeType: string }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const base64 = dataUrl.split(",")[1];
          resolve({ base64, mimeType: f.type });
        };
        reader.onerror = reject;
        reader.readAsDataURL(f);
      }))
    );

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
        images,
      }),
    });

    if (!res.ok) {
      setError("AI 응답 중 오류가 발생했습니다. 다시 시도해주세요.");
      setPendingMessage(null);
      setLoading(false);
      return;
    }

    const data = await res.json() as { fusionDescription: string; imageUrl: string; attachedImageUrls: string[] };
    setIterations((prev) => {
      const next = [...prev, { userMessage, ...data, likert: null }];
      setActiveIndex(next.length - 1);
      return next;
    });
    setPendingMessage(null);
    setPendingPreviews([]);

    try {
      await fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phase: 2,
          data: {
            teamId,
            iterationIndex,
            selectedConcept1: selectedPair.concepts[0],
            selectedConcept2: selectedPair.concepts[1],
            userMessage,
            fusionDescription: data.fusionDescription,
            imageUrl: data.imageUrl,
            attachedImageUrls: data.attachedImageUrls,
            likert: null,
          },
        }),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLikert = (iterationIndex: number, value: number) => {
    setIterations((prev) =>
      prev.map((it, i) => i === iterationIndex ? { ...it, likert: value } : it)
    );
    const iter = iterations[iterationIndex];
    if (!iter || !selectedPair) return;
    fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phase: 2,
        data: {
          teamId,
          iterationIndex,
          selectedConcept1: selectedPair.concepts[0],
          selectedConcept2: selectedPair.concepts[1],
          userMessage: iter.userMessage,
          fusionDescription: iter.fusionDescription,
          imageUrl: iter.imageUrl,
          attachedImageUrls: iter.attachedImageUrls,
          likert: value,
        },
      }),
    });
  };

  return (
    <div className="flex flex-col h-dvh">
      {/* 헤더 */}
      <header className="relative shrink-0 bg-background border-b border-border px-4 py-3 flex items-center gap-3 z-20">
        <Badge variant="secondary">Phase 2</Badge>
        <span className="text-sm text-muted-foreground">팀 {teamId}</span>
        {pairs.length > 0 && (
          <Button
            variant={selectedPair ? "outline" : "default"}
            size="sm"
            className="ml-auto max-w-50 truncate"
            onClick={() => setSelectorOpen((v) => !v)}
          >
            {selectedPair
              ? `${selectedPair.concepts[0]} ↔ ${selectedPair.concepts[1]}`
              : <><ChevronDown className="size-3.5" />개념 쌍 선택</>}
          </Button>
        )}
        {selectorOpen && (
          <div className="absolute top-full left-0 right-0 bg-background border-b border-border px-4 py-3 shadow-sm z-10">
            <ConceptSelector
              pairs={pairs}
              selected={selectedPair}
              onSelect={setSelectedPair}
              onClose={() => setSelectorOpen(false)}
            />
          </div>
        )}
      </header>

      {/* 모바일: 상하 / 데스크탑: 좌우 */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">

        {/* 모바일에서 이미지 위 */}
        <div className="md:hidden shrink-0">
          <ImageArea iterations={iterations} activeIndex={activeIndex} setActiveIndex={setActiveIndex} loading={loading} />
        </div>

        {/* 대화 영역 */}
        <div className="flex flex-col flex-1 md:w-1/2 border-r border-border overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

            {pairs.length === 0 && (
              <div className="text-center py-12 space-y-4">
                <p className="text-sm text-muted-foreground">Phase 1을 먼저 완료해주세요.</p>
                <Button
                  onClick={() => router.push(`/phase1?teamId=${encodeURIComponent(teamId)}&sessionId=${sessionId}`)}
                  variant="outline"
                  size="sm"
                >
                  ← Phase 1으로 돌아가기
                </Button>
              </div>
            )}

            {pairs.length > 0 && iterations.length === 0 && !loading && (
              <div className="text-center py-12 text-muted-foreground text-sm space-y-1">
                <p>요구사항을 입력하면</p>
                <p>AI가 두 개념을 결합한 이미지를 생성합니다.</p>
              </div>
            )}

            {iterations.map((iter, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-3 text-sm space-y-2">
                    <p>{iter.userMessage}</p>
                    {iter.attachedImageUrls?.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {iter.attachedImageUrls.map((url, j) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={j}
                            src={url}
                            alt={`첨부 이미지 ${j + 1}`}
                            onClick={() => setLightbox(url)}
                            className="w-20 h-20 object-cover rounded-md cursor-pointer"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className={`max-w-[80%] rounded-2xl rounded-tl-sm border px-4 py-3 text-sm leading-relaxed transition-colors ${
                    activeIndex === i ? "bg-muted border-border" : "bg-background border-border"
                  }`}>
                    <p>{iter.fusionDescription}</p>
                    <Button
                      onClick={() => setActiveIndex(i)}
                      variant={activeIndex === i ? "default" : "secondary"}
                      size="xs"
                      className="mt-2"
                    >
                      {activeIndex === i ? "현재 표시 중" : `이미지 ${i + 1} 보기 →`}
                    </Button>
                  </div>
                </div>
                <LikertScale
                  selected={iter.likert}
                  onSelect={(val) => handleLikert(i, val)}
                />
              </div>
            ))}

            {loading && pendingMessage && (
              <div className="space-y-2">
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-3 text-sm space-y-2">
                    <p>{pendingMessage}</p>
                    {pendingPreviews.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {pendingPreviews.map((url, j) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={j} src={url} alt="" className="w-20 h-20 object-cover rounded-md cursor-pointer" onClick={() => setLightbox(url)} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="w-full space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div ref={bottomRef} />
          </div>

          {!selectedPair ? (
            <div className="shrink-0 border-t border-border bg-background px-4 py-6 flex flex-col items-center gap-3">
              <p className="text-sm text-muted-foreground">개념 쌍을 먼저 선택해주세요</p>
              <Button variant="default" size="sm" onClick={() => setSelectorOpen(true)}>
                개념 쌍 선택하기 <ArrowRight className="size-4" />
              </Button>
            </div>
          ) : (
            <div className="shrink-0 border-t border-border bg-background px-4 py-4">
              <ChatInput
                onSubmit={handleSubmit}
                disabled={loading}
                allowFiles
                placeholder={
                  iterations.length === 0
                    ? "두 개념을 어떻게 결합할지 입력하세요..."
                    : "이미지를 수정할 요구사항을 입력하세요..."
                }
              />
            </div>
          )}
        </div>

        {/* 데스크탑에서만 오른쪽 이미지 */}
        <div className="hidden md:flex md:w-1/2">
          <ImageArea iterations={iterations} activeIndex={activeIndex} setActiveIndex={setActiveIndex} loading={loading} />
        </div>
      </div>

      <Dialog open={!!lightbox} onOpenChange={(open) => !open && setLightbox(null)}>
        <DialogContent className="max-w-lg flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {lightbox && <img src={lightbox} alt="첨부 이미지" className="max-h-[70vh] w-auto rounded-md object-contain" />}
        </DialogContent>
      </Dialog>
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
