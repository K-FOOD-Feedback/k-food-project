"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { Tile } from "@/components/Layout";
import { track } from "@/lib/analytics";
import { useFlow } from "@/lib/write-store";
import { usePhotoCheck } from "./PhotoCheckNotice";
import { clampText } from "@/lib/text-length";
import { useWriteCopy } from "@/app/write/copy";

/** 음식 이름 직접 고칠 때 한도 (칸 수) */
export const DISH_MAX = 40;

/**
 * ① 사진 화면 맨 위 — AI가 알아본 음식 + 이름 옆 ✎로 고치기 (담당 송희)
 * - 음식 인식은 사진을 고른 순간부터 (write-store) → 이 화면에 들어올 땐 보통 이미 끝나 있음
 * - ✎로 고치면 미리 쓰던 글은 버리고 고친 이름으로 다시 씀
 */
export function useDishFlow() {
  const { draft, ai } = useFlow();
  const check = usePhotoCheck();
  const hasPhotos = draft.photos.length > 0;
  const dishReady = !!draft.dish && ai.dish !== "working";
  return {
    dishReady,
    working: hasPhotos && ai.dish === "working",
    canGo: hasPhotos && check.canGo && dishReady,
    // 처음 사진을 고른 뒤 분석 중 (검사 중이거나 음식 인식 중, 아직 음식 모름) → 분석 화면
    analyzing: hasPhotos && !draft.dish && check.notFood === 0,
  };
}

export function DishCard({
  onEditingChange,
  preview,
}: {
  onEditingChange?: (editing: boolean) => void;
  /** 점검 화면(/dev/edge-cases) 전용: 작성 중인 글 대신 이 음식 이름을 보여 줌 */
  preview?: string;
}) {
  const { draft: stored, ai, writeStory } = useFlow();
  const w = useWriteCopy();
  const draft = preview === undefined ? stored : { ...stored, dish: preview, ai: { ...stored.ai, dish: preview } };
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const working = preview === undefined && ai.dish === "working";

  useEffect(() => onEditingChange?.(editing), [editing, onEditingChange]);

  if (!working && !draft.dish) return null;

  const save = () => {
    const dish = input.trim();
    if (preview === undefined && dish && dish !== draft.dish) {
      track("dish_corrected", { ai_dish: draft.ai.dish || draft.dish, user_dish: dish });
      writeStory(dish); // 미리 쓰던 글은 버리고 고친 이름으로 다시
    }
    setEditing(false);
  };

  return (
    <Tile>
      <div className="flex flex-col gap-2 px-5 py-5" aria-live="polite">
        <p className="flex items-center gap-2 text-[14px] font-semibold leading-[1.4] text-muted">
          <Icon name="sparkle" size={16} className={`text-content ${working ? "animate-spin [animation-duration:1.4s]" : ""}`} />
          {working ? w.dishLooking : w.dishThinks}
        </p>

        {working ? (
          <span className="h-8 w-48 animate-pulse rounded-full bg-surface-2" />
        ) : editing ? (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <input
              autoFocus
              value={input}
              // 40칸까지 (한·중·일 글자 2칸, src/lib/text-length.ts) — 한글 조합 중엔 자르지 않음
              onChange={(e) =>
                setInput((e.nativeEvent as InputEvent).isComposing ? e.target.value : clampText(e.target.value, DISH_MAX))
              }
              onCompositionEnd={(e) => setInput(clampText(e.currentTarget.value, DISH_MAX))}
              aria-label={w.dishAsk}
              placeholder={w.dishAsk}
              className="h-12 min-w-0 flex-1 rounded-full bg-surface-2 px-4 text-[16px] outline-none ring-on-dark focus:ring-2"
            />
            <button
              type="submit"
              className="h-12 shrink-0 rounded-full bg-on-dark px-5 text-[16px] font-bold text-on-light transition active:scale-95"
            >
              {w.dishSave}
            </button>
          </form>
        ) : (
          <>
            {/* 음식 이름 옆 ✎ — 눌러서 고치기 */}
            <p key={draft.dish} className="flex animate-fade-in items-center gap-2">
              {/* 띄어쓰기 없는 긴 이름도 칸 안에서 줄바꿈 (✎가 밀려나지 않게) */}
              <span className="min-w-0 font-display text-[24px] leading-[1.2] break-keep [overflow-wrap:anywhere]">{draft.dish}</span>
              <button
                type="button"
                aria-label={w.dishEdit}
                onClick={() => {
                  track("dish_correction_opened", { ai_dish: draft.dish });
                  setInput(draft.dish);
                  setEditing(true);
                }}
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-neutral-400 transition active:scale-90"
              >
                <Icon name="pencil" size={16} />
              </button>
            </p>
          </>
        )}
      </div>
    </Tile>
  );
}
