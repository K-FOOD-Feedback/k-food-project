"use client";

import { useEffect, useId, useRef } from "react";
import { clampText, textLength } from "@/lib/text-length";
import { Icon } from "./Icon";

/** Input/Title · Input/Story — 라벨 + 글자 수 + 자동 높이 텍스트 영역 */
/** 글자 크기 15px × 줄 간격 1.5 */
const LINE_PX = 22.5;

export function TextField({
  label,
  value,
  onChange,
  maxLength,
  rows = 1,
  maxRows = rows > 1 ? 8 : 4,
  locked = false,
  onBlur,
  placeholder,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange?: (value: string) => void;
  maxLength?: number;
  rows?: number;
  /** 이 줄 수까지만 늘어나고 넘치면 칸 안에서 스크롤 (여러 줄 칸 기본 8줄) */
  maxRows?: number;
  locked?: boolean;
  /** 입력칸에서 나갈 때 (분석 기록 등 — 글자마다가 아니라 한 번만) */
  onBlur?: (value: string) => void;
}) {
  const id = useId();
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // 글이 길어지면 늘어나다가 maxRows 줄에서 멈추고, 그 뒤로는 칸 안에서 스크롤 (화면이 끝없이 길어지지 않게)
    el.style.height = "auto";
    const max = maxRows * LINE_PX + 1;
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  }, [value, maxRows]);

  return (
    <div className="group flex w-full flex-col gap-2 px-5 py-3">
      <div className="flex items-start text-[13px] leading-[1.3]">
        <label htmlFor={id} className="flex-1 font-semibold">
          {label}
        </label>
        {/* 글자 수는 쓰는 중이거나 한도에 가까울 때만 (평소엔 숨겨서 덜 복잡하게) */}
        {maxLength && !locked && (
          <span
            className={`font-medium tabular-nums text-neutral-400 transition-opacity ${
              textLength(value) >= maxLength * 0.9 ? "" : "opacity-0 group-focus-within:opacity-100"
            }`}
          >
            {/* 한도는 칸 수 — 한·중·일 글자는 1.5칸 (src/lib/text-length.ts) */}
            {textLength(value)}/{maxLength}
          </span>
        )}
      </div>
      <div className="flex items-start gap-2 rounded-[20px] border-2 border-transparent bg-surface-2 px-4 py-[14px] focus-within:border-on-dark">
        <textarea
          ref={ref}
          id={id}
          rows={rows}
          value={value}
          placeholder={placeholder}
          readOnly={locked}
          aria-readonly={locked}
          onBlur={(e) => onBlur?.(e.target.value)}
          onChange={(e) => {
            const v = e.target.value.replace(rows === 1 ? /\n/g : /$^/, "");
            // 한글 등을 조합하는 중엔 자르지 않고(글자가 깨짐), 조합이 끝나면 자름
            const composing = (e.nativeEvent as InputEvent).isComposing;
            onChange?.(maxLength && !composing ? clampText(v, maxLength) : v);
          }}
          onCompositionEnd={(e) => maxLength && onChange?.(clampText(e.currentTarget.value, maxLength))}
          className={`min-w-0 flex-1 resize-none overflow-hidden overscroll-contain bg-transparent text-[15px] leading-[1.5] outline-none placeholder:text-neutral-400 ${
            locked ? "text-muted" : "text-on-dark"
          }`}
        />
        {locked && <Icon name="lock" size={18} className="mt-0.5 shrink-0" />}
      </div>
    </div>
  );
}
