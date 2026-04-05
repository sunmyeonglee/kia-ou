"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldTitle, FieldError } from "@/components/ui/field";

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

    const sessionId = crypto.randomUUID();
    sessionStorage.setItem("sessionId", sessionId);

    router.push(
      `/phase1?teamId=${encodeURIComponent(trimmed)}&sessionId=${sessionId}`,
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleStart();
  };

  return (
    <main className="flex flex-1 flex-col items-center min-h-screen px-4 pt-[25vh]">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            창의적 개념 탐색
          </h1>
          <p className="text-sm text-muted-foreground">
            AI와 함께하는 연구 실험에 참여해주세요
          </p>
        </div>

        <Card>
          <CardContent className="space-y-3 pt-2">
            <Field data-invalid={!!error}>
              <FieldTitle>참가팀 번호</FieldTitle>
              <Input
                type="text"
                value={teamId}
                onChange={(e) => {
                  setTeamId(e.target.value);
                  if (error) setError("");
                }}
                onKeyDown={handleKeyDown}
                placeholder="예: A1, B3"
                className="h-10 text-base"
                maxLength={20}
                aria-invalid={!!error}
              />
              <FieldError>{error}</FieldError>
            </Field>
            <Button onClick={handleStart} className="w-full" size="lg">
              실험 시작 <ArrowRight className="size-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
