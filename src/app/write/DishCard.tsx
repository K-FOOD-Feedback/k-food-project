"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { Tile } from "@/components/Layout";
import { track } from "@/lib/analytics";
import { useFlow } from "@/lib/write-store";
import { usePhotoCheck } from "./PhotoCheckNotice";

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

export function DishCard({ onEditingChange }: { onEditingChange?: (editing: boolean) => void }) {
  const { draft, ai, writeStory } = useFlow();
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const working = ai.dish === "working";

  useEffect(() => onEditingChange?.(editing), [editing, onEditingChange]);

  if (!working && !draft.dish) return null;

  const save = () => {
    const dish = input.trim();
    if (dish && dish !== draft.dish) {
      track("dish_corrected", { ai_dish: draft.ai.dish || draft.dish, user_dish: dish });
      writeStory(dish); // 미리 쓰던 글은 버리고 고친 이름으로 다시
    }
    setEditing(false);
  };

  return (
    <Tile>
      <div className="flex flex-col gap-2 px-5 py-5" aria-live="polite">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold leading-[1.3] text-muted">
          <Icon name="sparkle" size={14} className={`text-content ${working ? "animate-spin [animation-duration:1.4s]" : ""}`} />
          {working ? "Looking at your photos…" : "AI thinks this is"}
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
              onChange={(e) => setInput(e.target.value)}
              maxLength={40}
              aria-label="What did you make?"
              placeholder="What did you make?"
              className="h-12 min-w-0 flex-1 rounded-full bg-surface-2 px-4 text-[16px] outline-none ring-on-dark focus:ring-2"
            />
            <button
              type="submit"
              className="h-12 shrink-0 rounded-full bg-on-dark px-5 text-[15px] font-bold text-on-light transition active:scale-95"
            >
              Save
            </button>
          </form>
        ) : (
          <>
            {/* 음식 이름 옆 ✎ — 눌러서 고치기 */}
            <p key={draft.dish} className="flex animate-fade-in items-center gap-2">
              <span className="font-display text-[26px] leading-[1.15] break-keep">{draft.dish}</span>
              <button
                type="button"
                aria-label="Edit dish name"
                onClick={() => {
                  track("dish_correction_opened", { ai_dish: draft.dish });
                  setInput(draft.dish);
                  setEditing(true);
                }}
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-neutral-400 transition active:scale-90"
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
