"use client";

import { useEffect, useId, useRef } from "react";
import { Icon } from "./Icon";

/** Input/Title · Input/Story — 라벨 + 글자 수 + 자동 높이 텍스트 영역 */
export function TextField({
  label,
  value,
  onChange,
  maxLength,
  rows = 1,
  locked = false,
  onBlur,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  maxLength?: number;
  rows?: number;
  locked?: boolean;
  /** 입력칸에서 나갈 때 (분석 기록 등 — 글자마다가 아니라 한 번만) */
  onBlur?: (value: string) => void;
}) {
  const id = useId();
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <div className="flex w-full flex-col gap-2 px-5 py-3">
      <div className="flex items-start text-[13px] leading-[1.3]">
        <label htmlFor={id} className="flex-1 font-semibold">
          {label}
        </label>
        {maxLength && !locked && (
          <span className="font-medium tabular-nums text-neutral-400">
            {value.length}/{maxLength}
          </span>
        )}
      </div>
      <div className="flex items-start gap-2 rounded-[20px] border-2 border-transparent bg-surface-2 px-4 py-[14px] focus-within:border-on-dark">
        <textarea
          ref={ref}
          id={id}
          rows={rows}
          value={value}
          maxLength={maxLength}
          readOnly={locked}
          aria-readonly={locked}
          onBlur={(e) => onBlur?.(e.target.value)}
          onChange={(e) => onChange?.(e.target.value.replace(rows === 1 ? /\n/g : /$^/, ""))}
          className={`min-w-0 flex-1 resize-none overflow-hidden bg-transparent text-[15px] leading-[1.5] outline-none ${
            locked ? "text-muted" : "text-on-dark"
          }`}
        />
        {locked && <Icon name="lock" size={18} className="mt-0.5 shrink-0" />}
      </div>
    </div>
  );
}
