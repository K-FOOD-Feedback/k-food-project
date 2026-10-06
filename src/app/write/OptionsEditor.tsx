"use client";

import { useRef } from "react";
import { Icon } from "@/components/Icon";
import { track } from "@/lib/analytics";
import { OPTION_MAX, OPTIONS_MAX, OPTIONS_MIN } from "@/lib/write-data";

/**
 * 투표 선택지 편집 (④ Your vote · 수정 화면 공용, 담당 송희)
 * 고치기 · 지우기(최소 2개) · 추가하기(최대 4개). 잠기면 읽기 전용.
 */
export function OptionsEditor({
  options,
  onChange,
  locked = false,
  source,
}: {
  options: string[];
  onChange?: (options: string[]) => void;
  locked?: boolean;
  /** 분석용: 어느 화면에서 고쳤는지 */
  source: "write" | "edit";
}) {
  const focusedValue = useRef("");
  const set = (i: number, value: string) =>
    onChange?.(options.map((o, j) => (j === i ? value.replace(/\n/g, "") : o)));
  const remove = (i: number) => {
    onChange?.(options.filter((_, j) => j !== i));
    track("vote_option_removed", { position: i, options_count: options.length - 1, source });
  };
  const add = () => {
    onChange?.([...options, ""]);
    track("vote_option_added", { options_count: options.length + 1, source });
  };

  return (
    <div className="flex flex-col gap-1">
      <ol className="flex flex-col gap-1">
        {options.map((opt, i) => (
          <li
            key={i}
            className="flex h-14 animate-pop items-center gap-3 rounded-full bg-surface-2 pl-4 pr-2 focus-within:ring-2 focus-within:ring-on-dark"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[12px] font-bold tabular-nums">
              {i + 1}
            </span>
            <input
              value={opt}
              maxLength={OPTION_MAX}
              readOnly={locked}
              placeholder="Write a choice"
              aria-label={`Choice ${i + 1}`}
              onChange={(e) => set(i, e.target.value)}
              onFocus={(e) => (focusedValue.current = e.target.value)}
              onBlur={(e) => {
                if (e.target.value !== focusedValue.current)
                  track("vote_option_edited", { position: i, length: e.target.value.length, source });
              }}
              className={`min-w-0 flex-1 bg-transparent text-[15px] leading-[1.5] outline-none placeholder:text-neutral-400 ${
                locked ? "text-muted" : "text-on-dark"
              }`}
            />
            {locked ? (
              <Icon name="lock" size={18} className="mr-2 shrink-0" />
            ) : (
              <>
                <span className="shrink-0 text-[12px] font-medium tabular-nums text-neutral-400">
                  {opt.length}/{OPTION_MAX}
                </span>
                <button
                  type="button"
                  aria-label={`Remove choice ${i + 1}`}
                  disabled={options.length <= OPTIONS_MIN}
                  onClick={() => remove(i)}
                  className="flex size-10 shrink-0 items-center justify-center rounded-full text-neutral-400 transition active:scale-90 disabled:opacity-25"
                >
                  <Icon name="x" size={18} />
                </button>
              </>
            )}
          </li>
        ))}
      </ol>
      {!locked && options.length < OPTIONS_MAX && (
        <button
          type="button"
          onClick={add}
          className="flex h-14 items-center justify-center gap-2 rounded-full border-[1.5px] border-dashed border-white/25 text-[15px] font-semibold text-muted transition active:scale-[0.99]"
        >
          <Icon name="plus" size={18} />
          Add a choice
        </button>
      )}
    </div>
  );
}
