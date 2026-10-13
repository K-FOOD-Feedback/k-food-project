"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowCta, IconButton } from "@/components/Buttons";
import { TextField } from "@/components/Field";
import { Icon } from "@/components/Icon";
import { Screen, StepProgress, StickyBottom, Tile, TopBar } from "@/components/Layout";
import { STORY_MAX, TITLE_MAX } from "@/lib/write-data";
import { keptRatio, track } from "@/lib/analytics";
import { useFlow } from "@/lib/write-store";
import { WriteExit } from "../WriteExit";

/*
  ② Your post — 제목 · 본문 (담당 송희)
  - AI가 ① 사진 화면에서 음식을 알아본 순간 뒤에서 미리 써 둠 → 보통은 들어오자마자 채워져 있음
  - 아직 쓰는 중이면 그 자리에서 "Writing…"을 보여 주고, 다 쓰면 채워짐 (전체 로딩 화면 없음)
  - 음식 이름 확인·사진은 ①에서 (여기선 글만)
  - 다음: 이 글을 보고 투표 주제 추천 · 선택지 (③)
*/
export function PostStepScreen() {
  const router = useRouter();
  const { draft, ai, updateDraft, writeStory, saveDraftForLater } = useFlow();
  const writing = ai.story === "working";

  // ①을 거치지 않고 바로 들어왔는데 글이 없으면 여기서 씀 (이어 쓰기 등)
  useEffect(() => {
    if (ai.story === "idle" && !draft.story && draft.photos.length > 0) writeStory();
  }, [ai.story, draft.story, draft.photos.length, writeStory]);

  const canNext = !writing && draft.title.trim().length > 0 && draft.story.trim().length > 0;

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
              router.push("/write");
            }}
          />
        }
        title="Your post"
        right={<WriteExit step="post" />}
      />
      <StepProgress step={2} />

      <div className="stagger flex flex-col gap-1 px-2">
        <Tile>
          {writing ? (
            <WritingSkeleton dish={draft.dish} />
          ) : (
            <div className="animate-fade-in">
              <TextField label="Title" value={draft.title} maxLength={TITLE_MAX} onChange={(title) => updateDraft({ title })} />
              <TextField
                label="Story"
                value={draft.story}
                maxLength={STORY_MAX}
                rows={4}
                onChange={(story) => updateDraft({ story })}
              />
              <div className="pb-2" />
            </div>
          )}
        </Tile>

        <p className="flex items-center gap-1.5 px-6 pt-3 text-[13px] font-medium leading-[1.3] text-muted">
          <Icon name="info" size={14} />
          Written by AI. Please check it before moving on.
        </p>
      </div>

      <StickyBottom>
        <ArrowCta
          caption={writing ? "AI is writing your post…" : "Pick what to ask Koreans"}
          title="Next"
          {...(canNext
            ? {
                href: "/write/vote",
                onClick: () =>
                  track("post_step_completed", {
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
    </Screen>
  );
}

/** 아직 쓰는 중 — 제목·본문 자리가 반짝이며 채워질 준비 */
function WritingSkeleton({ dish }: { dish: string }) {
  return (
    <div className="flex flex-col gap-4 px-5 py-5" aria-live="polite">
      <p className="flex items-center gap-2 text-[14px] font-semibold">
        <Icon name="sparkle" size={16} className="animate-spin text-content [animation-duration:1.4s]" />
        Writing about your {dish || "dish"}…
      </p>
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold text-muted">Title</span>
        <span className="h-[52px] animate-pulse rounded-[20px] bg-surface-2" />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold text-muted">Story</span>
        <span className="h-[124px] animate-pulse rounded-[20px] bg-surface-2 [animation-delay:150ms]" />
      </div>
    </div>
  );
}
