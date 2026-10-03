"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "./Icon";

/** 모바일 한 화면. 375 기준으로 그렸고 430까지 늘어납니다. */
export function Screen({
  children,
  bg = "bg-canvas",
  className = "",
}: {
  children: ReactNode;
  bg?: string;
  className?: string;
}) {
  return (
    <main className={`relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col ${bg} ${className}`}>
      {children}
    </main>
  );
}

/**
 * Top Bar의 Nav 영역(80px). 실제 웹에서는 기기 상태바가 따로 있으므로
 * Figma의 Status Bar(48px)는 그리지 않고 safe-area만 확보합니다.
 */
export function TopBar({
  left,
  right,
  title,
  sticky = true,
  bg = "bg-canvas",
}: {
  left?: ReactNode;
  right?: ReactNode;
  title?: ReactNode;
  sticky?: boolean;
  bg?: string;
}) {
  return (
    <header
      className={`${sticky ? "sticky top-0 z-30" : "relative"} ${bg} pt-[env(safe-area-inset-top)]`}
    >
      <div className="relative flex h-20 items-center gap-2 px-2">
        {left}
        <div className="flex-1" />
        {right}
        {title && (
          <h1 className="pointer-events-none absolute left-1/2 top-1/2 w-[219px] -translate-x-1/2 -translate-y-1/2 text-center font-display text-[20px] leading-[1.15] text-on-light">
            {title}
          </h1>
        )}
      </div>
    </header>
  );
}

/** 하단 고정 CTA 영역 (위로 갈수록 투명해지는 그라데이션) */
export function StickyBottom({
  children,
  fade = "from-canvas/0 via-canvas to-canvas",
  className = "",
}: {
  children: ReactNode;
  fade?: string;
  className?: string;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[430px]">
      <div
        className={`pointer-events-auto flex flex-col gap-2 bg-gradient-to-b via-35% px-2 pt-10 pb-[calc(24px+env(safe-area-inset-bottom))] ${fade} ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

/** 흰 바텀시트 + 딤 */
export function BottomSheet({
  open,
  onClose,
  children,
  label,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  label: string;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    sheetRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="닫기"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-black/40"
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className="absolute inset-x-0 bottom-0 mx-auto flex w-full max-w-[430px] animate-sheet-up flex-col items-center gap-4 rounded-t-[32px] bg-white px-2 pt-3 pb-[calc(24px+env(safe-area-inset-bottom))] outline-none"
      >
        <div className="h-1 w-10 shrink-0 rounded-full bg-line" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}

/** 상단 다크 토스트 (Toast/Dark) */
export function Toast({
  open,
  onClose,
  title,
  body,
  duration = 4000,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  body?: string;
  duration?: number;
}) {
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(t);
  }, [open, onClose, duration]);

  if (!open) return null;
  return (
    <div className="fixed inset-x-0 top-[calc(88px+env(safe-area-inset-top))] z-50 mx-auto w-full max-w-[430px] px-2">
      <div
        role="status"
        aria-labelledby={id}
        className="flex animate-toast-in items-start gap-2 rounded-[36px] bg-[#1c1c1c] py-5 pl-6 pr-5 text-[14px] leading-[1.4] text-white shadow-[0_12px_32px_rgba(0,0,0,0.18)]"
      >
        <Icon name="alert" size={20} className="shrink-0 text-error" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p id={id} className="font-semibold">
            {title}
          </p>
          {body && <p className="opacity-70">{body}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="shrink-0">
          <Icon name="x" size={20} />
        </button>
      </div>
    </div>
  );
}

/** 흰 타일 (radius 32, padding 4) */
export function Tile({
  children,
  className = "",
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div";
}) {
  return <Tag className={`flex w-full flex-col gap-1 overflow-hidden rounded-[32px] bg-white p-1 ${className}`}>{children}</Tag>;
}

/** 업로드 3단계 진행 바 */
export function StepProgress({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div
      className="flex gap-1 px-2 pb-3"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={3}
      aria-valuenow={step}
      aria-label={`Step ${step} of 3`}
    >
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className={`h-1 flex-1 rounded-full transition-colors ${n <= step ? "bg-on-light" : "bg-white"}`}
        />
      ))}
    </div>
  );
}

export function Chip({
  children,
  tone = "white",
  className = "",
}: {
  children: ReactNode;
  tone?: "white" | "yellow" | "soft" | "black";
  className?: string;
}) {
  const tones = {
    white: "bg-white text-on-light",
    yellow: "bg-content text-on-light",
    soft: "bg-canvas-soft text-on-light",
    black: "bg-background text-white",
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-[7px] text-[13px] font-semibold leading-[1.3] ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
