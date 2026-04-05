"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { ArrowUp } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";

interface ChatInputProps {
  onSubmit: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({
  onSubmit,
  disabled = false,
  placeholder = "메시지를 입력하세요...",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <InputGroup onClick={() => textareaRef.current?.focus()}>
      <InputGroupTextarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="min-h-0 max-h-50 overflow-y-auto"
      />
      <InputGroupAddon align="block-end" className="justify-end">
        <InputGroupButton
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          variant="default"
          size="icon-sm"
          className="rounded-full"
          aria-label="전송"
        >
          <ArrowUp />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
