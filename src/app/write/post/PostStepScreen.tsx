"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowCta, IconButton } from "@/components/Buttons";
import { TextField } from "@/components/Field";
import { Icon } from "@/components/Icon";
import { Screen, StepProgress, StickyBottom, Tile, Toast, TopBar } from "@/components/Layout";
import { PhotoGrid } from "@/components/PhotoGrid";
import { usePhotoPicker } from "@/components/PhotoPicker";
import { MAX_PHOTOS, STORY_MAX, TITLE_MAX } from "@/lib/write-data";
import { keptRatio, track } from "@/lib/analytics";
import { useFlow } from "@/lib/write-store";
import { usePhotoActions } from "../usePhotoActions";

/*
  ③ Your post
  - 맨 위: AI가 알아본 음식 이름. 틀렸으면 고치고 "Rewrite" → 그 이름으로 제목·본문을 다시 씀
  - 제목·본문 수정
  - 다음: AI가 이 글을 보고 투표를 만듦 (④)
*/
export function PostStepScreen() {
  const router = useRouter();
  const { draft, updateDraft, applyAiDraft, saveDraftForLater } = useFlow();
  const photo = usePhotoActions("post");
  const [limitToast, setLimitToast] = useState(false);
  const closeToast = useCallback(() => setLimitToast(false), []);
  const picker = usePhotoPicker((files) => {
    if (photo.add(files)) setLimitToast(true);
  });

  // 바로 이 화면으로 들어와도 비지 않도록 (처음 한 번만)
  const filled = useRef(false);
  useEffect(() => {
    if (filled.current) return;
    filled.current = true;
    if (!draft.title && !draft.story) applyAiDraft();
  }, [draft.title, draft.story, applyAiDraft]);

  // 음식 이름 고치기
  const [editingDish, setEditingDish] = useState(false);
  const [dishInput, setDishInput] = useState("");
  const [rewriteKey, setRewriteKey] = useState(0); // 다시 쓰면 입력칸이 반짝
  const rewrite = () => {
    const dish = dishInput.trim();
    if (dish) {
      track("dish_corrected", { ai_dish: draft.ai.dish || draft.dish, user_dish: dish });
      applyAiDraft({ dish });
      setRewriteKey((k) => k + 1);
    }
    setEditingDish(false);
  };

  const canNext = draft.photos.length > 0 && draft.title.trim().length > 0;

  return (
    <Screen className="pb-[140px]">
      <TopBar
        left={
          <IconButton
            icon="chevron-left"
            label="Back"
            onClick={() => {
              saveDraftForLater("post");
              track("draft_saved", { step: "post" });
              router.push("/write/question");
            }}
          />
        }
        title="Your post"
      />
      <StepProgress step={3} />

      <div className="stagger flex flex-col gap-1 px-2">
        {/* 글 — 맨 위. AI가 알아본 음식은 카드 첫 줄에 작게, 틀렸으면 여기서 바로잡기 */}
        <Tile>
          <div className="flex flex-col gap-3 px-5 pt-5 pb-1">
            {editingDish ? (
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  rewrite();
                }}
              >
                <input
                  autoFocus
                  value={dishInput}
                  onChange={(e) => setDishInput(e.target.value)}
                  maxLength={40}
                  aria-label="What did you make?"
                  placeholder="What did you make?"
                  className="h-11 min-w-0 flex-1 rounded-full bg-surface-2 px-4 text-[15px] outline-none ring-on-dark focus:ring-2"
                />
                <button
                  type="submit"
                  className="h-11 shrink-0 rounded-full bg-on-dark px-4 text-[14px] font-bold text-on-light transition active:scale-95"
                >
                  Rewrite
                </button>
              </form>
            ) : (
              <p className="flex flex-wrap items-center gap-x-1.5 text-[14px] leading-[1.4] text-muted">
                <Icon name="sparkle" size={14} className="text-content" />
                <span>AI thinks this is</span>
                <span key={draft.dish} className="animate-fade-in font-bold text-on-dark">
                  {draft.dish || "…"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    track("dish_correction_opened", { ai_dish: draft.dish });
                    setDishInput(draft.dish);
                    setEditingDish(true);
                  }}
                  className="font-semibold text-on-dark underline underline-offset-4"
                >
                  Not right?
                </button>
              </p>
            )}
          </div>
          <div key={rewriteKey} className={rewriteKey ? "animate-fade-in" : ""}>
            <TextField label="Title" value={draft.title} maxLength={TITLE_MAX} onChange={(title) => updateDraft({ title })} />
            <TextField
              label="Story"
              value={draft.story}
              maxLength={STORY_MAX}
              rows={3}
              onChange={(story) => updateDraft({ story })}
            />
          </div>
          <div className="pb-2" />
        </Tile>

        {/* 사진 — 맨 왼쪽이 대표(Cover) */}
        <Tile>
          <div className="flex flex-col gap-3 px-5 pt-4 pb-5">
            <p className="text-[13px] font-semibold leading-[1.3]">Photos</p>
            <PhotoGrid
              photos={draft.photos}
              coverId={draft.coverId}
              coverChip
              onCover={photo.cover}
              onRemove={photo.remove}
              onMove={photo.move}
              onAdd={() => {
                if (draft.photos.length >= MAX_PHOTOS) {
                  photo.limitHit();
                  setLimitToast(true);
                } else picker.open();
              }}
            />
            <p className="text-[13px] leading-[1.4] text-muted">Tap to set the cover · Hold to reorder</p>
          </div>
        </Tile>

        <p className="flex items-center gap-1.5 px-6 pt-3 text-[13px] font-medium leading-[1.3] text-muted">
          <Icon name="info" size={14} />
          Written by AI. Please check it before moving on.
        </p>
      </div>

      <StickyBottom>
        <ArrowCta
          caption="AI makes a vote from your post"
          title="Make the vote"
          {...(canNext
            ? {
                href: "/write/vote",
                onClick: () =>
                  track("post_step_completed", {
                    dish_corrected: draft.dish !== (draft.ai.dish || draft.dish),
                    title_kept: keptRatio(draft.ai.title, draft.title),
                    story_kept: keptRatio(draft.ai.story, draft.story),
                    title_length: draft.title.length,
                    story_length: draft.story.length,
                    photos: draft.photos.length,
                  }),
              }
            : { disabled: true })}
        />
      </StickyBottom>

      <Toast
        open={limitToast}
        onClose={closeToast}
        title={`You can add up to ${MAX_PHOTOS} photos`}
        body="Remove a photo first, then add a new one."
      />
      {picker.input}
    </Screen>
  );
}
