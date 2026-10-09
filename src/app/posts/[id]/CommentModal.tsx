"use client";

import { Icon } from "@/components/Icon";
import { useEffect, useLayoutEffect, useRef } from "react";
import type { Comment } from "./comments";

/**
  한마디 말풍선을 누르면 뜨는 레이어 (Figma 344:3281 답글 레이어)
  흐린 배경 + 가운데 흰 카드 + 오른쪽 위 닫기 버튼. 카드 안 내용은 아직 비워 둡니다.
  닫기: X 버튼, 배경 누르기, Esc
*/
export function CommentModal({ comment, onClose }: { comment: Comment; onClose: () => void }) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const close = useRef(onClose);
  useLayoutEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    closeButton.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`한마디: ${comment.text.replace(/\n/g, " ")}`}
      className="fixed inset-y-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 transition-opacity duration-200 starting:opacity-0"
    >
      {/* 흐린 배경 — 눌러도 닫힘 */}
      <div className="absolute inset-0 bg-background/50 backdrop-blur-[8px]" onClick={onClose} aria-hidden />

      {/* 내용 카드 (아직 비어 있음) */}
      <div className="absolute top-1/2 left-1/2 h-[509px] max-h-[calc(100%-200px)] w-[calc(100%-40px)] -translate-x-1/2 -translate-y-1/2 rounded-[32px] bg-white" />

      <div className="absolute inset-x-0 top-0 flex justify-end px-2 pt-[calc(16px+env(safe-area-inset-top))] pb-4">
        <button
          ref={closeButton}
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="flex size-16 items-center justify-center rounded-full bg-[#242424] text-on-dark transition-transform active:scale-90"
        >
          <Icon name="x" />
        </button>
      </div>
    </div>
  );
}
