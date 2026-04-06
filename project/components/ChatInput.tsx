"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { ArrowUp, Paperclip, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";

const MAX_FILES = 5;

interface ChatInputProps {
  onSubmit: (value: string, files?: File[]) => void;
  disabled?: boolean;
  placeholder?: string;
  allowFiles?: boolean;
}

export default function ChatInput({
  onSubmit,
  disabled = false,
  placeholder = "메시지를 입력하세요...",
  allowFiles = false,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<{ file: File; preview: string }[]>([]);
  const [lightbox, setLightbox] = useState<{ preview: string; name: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: File[]) => {
    setFiles((prev) => {
      const remaining = MAX_FILES - prev.length;
      const toAdd = incoming.slice(0, remaining).map((f) => ({
        file: f,
        preview: URL.createObjectURL(f),
      }));
      return [...prev, ...toAdd];
    });
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed, files.length > 0 ? files.map((f) => f.file) : undefined);
    setValue("");
    files.forEach((f) => URL.revokeObjectURL(f.preview));
    setFiles([]);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length > 0) addFiles(selected);
    e.target.value = "";
  };

  const handleDragEnter = (e: React.DragEvent) => {
    if (!allowFiles) return;
    e.preventDefault();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!allowFiles) return;
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!allowFiles) return;
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!allowFiles) return;
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);
    const imageFiles = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );
    if (imageFiles.length > 0) addFiles(imageFiles);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (!allowFiles) return;
    const imageFiles = Array.from(e.clipboardData.items)
      .filter((item) => item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((f): f is File => f !== null);
    if (imageFiles.length > 0) addFiles(imageFiles);
  };

  return (
    <>
      <InputGroup
        onClick={() => textareaRef.current?.focus()}
        onPaste={handlePaste}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        data-dragging={isDragging || undefined}
        className={isDragging ? "ring-2 ring-primary ring-inset" : undefined}
      >
        {files.length > 0 && (
          <div className="px-3 pt-2 flex flex-wrap gap-2 justify-start w-full">
            {files.map((f, i) => (
              <div key={i} className="relative w-14 h-14 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.preview}
                  alt={f.file.name}
                  onClick={(e) => { e.stopPropagation(); setLightbox({ preview: f.preview, name: f.file.name }); }}
                  className="w-full h-full object-cover rounded-md border border-border cursor-pointer"
                />
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                  className="absolute -top-1.5 -right-1.5 bg-background border border-border rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}
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
        <InputGroupAddon align="block-end" className="justify-end gap-1">
          {allowFiles && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              <InputGroupButton
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                disabled={disabled || files.length >= MAX_FILES}
                variant="ghost"
                size="icon-sm"
                className="rounded-full text-muted-foreground"
                aria-label="이미지 첨부"
              >
                <Paperclip className="size-4" />
              </InputGroupButton>
            </>
          )}
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

      <Dialog open={!!lightbox} onOpenChange={(open) => !open && setLightbox(null)}>
        <DialogContent className="max-w-lg flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox?.preview} alt={lightbox?.name} className="max-h-[70vh] w-auto rounded-md object-contain" />
          <p className="text-sm text-muted-foreground text-center break-all">{lightbox?.name}</p>
        </DialogContent>
      </Dialog>
    </>
  );
}
