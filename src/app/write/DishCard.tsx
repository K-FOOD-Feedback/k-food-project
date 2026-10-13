"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { Tile } from "@/components/Layout";
import { track } from "@/lib/analytics";
import { useFlow } from "@/lib/write-store";
import { usePhotoCheck } from "./PhotoCheckNotice";

/**
 * ① 사진 화면 — AI가 알아본 음식 "Is this right?" (담당 송희)
 * - 사진 검사가 끝나면 음식을 알아봄 (검사 중이거나 음식 아닌 사진이 있으면 기다림)
 * - 알아본 순간 뒤에서 제목·본문을 미리 씀 → ②로 넘어가면 대부분 이미 써져 있음
 * - Edit로 고치면 미리 쓰던 글은 버리고 고친 이름으로 다시 씀
 * - 이어 쓰는 초안(이미 음식·본문이 있음)은 다시 돌리지 않음
 */
export function useDishFlow() {
  const { draft, ai, recognizeDish, writeStory, resetAi } = useFlow();
  const check = usePhotoCheck();
  const hasPhotos = draft.photos.length > 0;
  const dishReady = ai.dish === "ready" || (ai.dish === "idle" && !!draft.dish);

  // 사진 검사가 끝나면 음식 알아보기 / 사진을 다 빼면 처음부터
  useEffect(() => {
    if (!hasPhotos) {
      if (ai.dish !== "idle" || draft.dish) resetAi();
      return;
    }
    if (check.canGo && ai.dish === "idle" && !draft.dish) recognizeDish();
  }, [hasPhotos, check.canGo, ai.dish, draft.dish, recognizeDish, resetAi]);

  // 음식을 알아본 순간 본문 미리 쓰기
  useEffect(() => {
    if (ai.dish === "ready" && ai.story === "idle" && !draft.story) writeStory();
  }, [ai.dish, ai.story, draft.story, writeStory]);

  return { dishReady, working: hasPhotos && ai.dish === "working", canGo: hasPhotos && check.canGo && dishReady };
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
            <p key={draft.dish} className="animate-fade-in font-display text-[26px] leading-[1.15]">
              {draft.dish}
            </p>
            <p className="flex items-center gap-2 text-[14px] text-muted">
              Is this right?
              <button
                type="button"
                onClick={() => {
                  track("dish_correction_opened", { ai_dish: draft.dish });
                  setInput(draft.dish);
                  setEditing(true);
                }}
                className="font-semibold text-on-dark underline underline-offset-4"
              >
                Edit
              </button>
            </p>
          </>
        )}
      </div>
    </Tile>
  );
}
