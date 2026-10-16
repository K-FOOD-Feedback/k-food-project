"use client";

import { useRouter } from "next/navigation";
import { ArrowCta, IconButton } from "@/components/Buttons";
import { TextField } from "@/components/Field";
import { Icon } from "@/components/Icon";
import { Screen, StepProgress, StickyBottom, TopBar } from "@/components/Layout";
import { STORY_MAX, TITLE_MAX } from "@/lib/write-data";
import { keptRatio, track } from "@/lib/analytics";
import { currentFrom, withFrom } from "@/lib/back";
import { coverOf, useFlow } from "@/lib/write-store";
import { PhotoImage } from "@/components/PhotoGrid";
import { WriteExit } from "../WriteExit";
import { useWriteCopy } from "@/app/write/copy";

/*
  ② Your post — 제목 · 본문 (담당 송희)
  - AI가 ① 사진 화면에서 음식을 알아본 순간 뒤에서 미리 써 둠 → 보통은 들어오자마자 채워져 있음
  - 아직 쓰는 중이면 그 자리에서 "Writing…"을 보여 주고, 다 쓰면 채워짐 (전체 로딩 화면 없음)
  - 음식 이름 확인·사진은 ①에서 (여기선 글만)
  - 다음: 이 글을 보고 투표 주제 추천 · 선택지 (③)
*/
export function PostStepScreen() {
  const router = useRouter();
  const { draft, ai, updateDraft, saveDraftForLater } = useFlow();
  const w = useWriteCopy();
  const cover = draft.photos.length ? coverOf(draft) : null;
  const writing = ai.story === "working";

  const canNext = !writing && draft.title.trim().length > 0 && draft.story.trim().length > 0;

  return (
    <Screen className="pb-[140px]">
      <TopBar
        left={
          <IconButton
            icon="chevron-left"
            label={w.back}
            onClick={() => {
              saveDraftForLater("post");
              track("draft_saved", { step: "post" });
              router.push(withFrom("/write", currentFrom())); // 들어온 곳(?from=)은 이어서
            }}
          />
        }
        title={w.postTitle}
        right={<WriteExit step="post" />}
      />
      <StepProgress step={2} />

      <div className="stagger flex flex-col gap-1 px-2">
        {/* 무엇에 대해 쓰는 글인지 — 대표 사진 + AI가 알아본 음식 이름 (①에서 확인한 것) */}
        {cover && (
          <div className="flex items-center gap-3 px-5 pt-1 pb-2">
            <span className="relative size-14 shrink-0 overflow-hidden rounded-[16px] bg-surface">
              <PhotoImage src={cover.src} sizes="56px" className="object-cover" />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[13px] font-medium text-muted">
                {w.photoCount(draft.photos.length)}
              </span>
              <span className="truncate font-display text-[20px] leading-[1.2]">{draft.dish || w.yourKfood}</span>
            </span>
          </div>
        )}

        {/* 바깥 카드 없이 입력칸만 */}
        <div>
          {writing ? (
            <WritingSkeleton dish={draft.dish} />
          ) : (
            <div className="animate-fade-in">
              <TextField label={w.titleLabel} value={draft.title} maxLength={TITLE_MAX} onChange={(title) => updateDraft({ title })} />
              <TextField
                label={w.storyLabel}
                value={draft.story}
                maxLength={STORY_MAX}
                // 남는 공간을 채우게 길게 (9줄부터, 14줄까지 늘어나고 그 뒤로는 칸 안에서 스크롤)
                rows={9}
                maxRows={14}
                onChange={(story) => updateDraft({ story })}
              />
              <div className="pb-2" />
            </div>
          )}
        </div>

        <p className="flex items-center gap-1.5 px-6 pt-3 text-[13px] font-medium leading-[1.3] text-muted">
          <Icon name="info" size={14} />
          {w.writtenByAi}
        </p>
      </div>

      <StickyBottom>
        <ArrowCta
          // 작성 세 단계 모두 같은 버튼 (위 작은 글 없이, compact)
          title={w.next}
          compact
          {...(canNext
            ? {
                onClick: () => {
                  track("post_step_completed", {
                    title_kept: keptRatio(draft.ai.title, draft.title),
                    story_kept: keptRatio(draft.ai.story, draft.story),
                    title_length: draft.title.length,
                    story_length: draft.story.length,
                    photos: draft.photos.length,
                  });
                  router.push(withFrom("/write/vote", currentFrom())); // 들어온 곳(?from=)은 이어서
                },
              }
            : { disabled: true })}
        />
      </StickyBottom>
    </Screen>
  );
}

/** 아직 쓰는 중 — 제목·본문 자리가 반짝이며 채워질 준비 */
function WritingSkeleton({ dish }: { dish: string }) {
  const w = useWriteCopy();
  return (
    <div className="flex flex-col gap-4 px-5 py-5" aria-live="polite">
      <p className="flex items-center gap-2 text-[14px] font-semibold">
        <Icon name="sparkle" size={16} className="animate-spin text-content [animation-duration:1.4s]" />
        {w.writingAbout(dish)}
      </p>
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold text-muted">{w.titleLabel}</span>
        <span className="h-[52px] animate-pulse rounded-[20px] bg-surface-2" />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold text-muted">{w.storyLabel}</span>
        <span className="h-[230px] animate-pulse rounded-[20px] bg-surface-2 [animation-delay:150ms]" />
      </div>
    </div>
  );
}
