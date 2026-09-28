"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowCta, IconButton } from "@/components/Buttons";
import { TextField } from "@/components/Field";
import { Icon } from "@/components/Icon";
import { Chip, Screen, StepProgress, StickyBottom, Tile, TopBar } from "@/components/Layout";
import { PhotoCarousel } from "@/components/PhotoCarousel";
import { getQuestion, SAMPLE_PHOTOS, STORY_MAX, TITLE_MAX } from "@/lib/data";
import { useFlow } from "@/lib/flow-store";

export function ReviewScreen() {
  const router = useRouter();
  const { draft, updateDraft, applyAiDraft, saveDraftForLater, publish } = useFlow();
  const [variant, setVariant] = useState(0);
  const question = getQuestion(draft.questionId);
  const photos = (draft.photos.length ? draft.photos : SAMPLE_PHOTOS).map((p) => p.src);

  // 바로 이 화면으로 들어온 경우에도 초안이 비어 있지 않도록 (처음 한 번만)
  const filled = useRef(false);
  useEffect(() => {
    if (filled.current) return;
    filled.current = true;
    if (!draft.title && !draft.story) applyAiDraft();
  }, [draft.title, draft.story, applyAiDraft]);

  const canPost = draft.title.trim().length > 0 && draft.voteQuestion.trim().length > 0;

  return (
    <Screen className="pb-[140px]">
      <TopBar
        left={
          <IconButton
            icon="chevron-left"
            label="Back"
            onClick={() => {
              saveDraftForLater("review");
              router.push("/upload/question");
            }}
          />
        }
        title="Review your post"
      />
      <StepProgress step={3} />

      <div className="flex flex-col gap-1 px-2">
        <PhotoCarousel photos={photos} height={300} indicator="count" />

        <Tile>
          <div className="flex items-center gap-1 px-5 pt-5 pb-2">
            <h2 className="flex-1 text-[18px] font-bold leading-[1.3]">Your post</h2>
            <button
              type="button"
              onClick={() => {
                const next = variant + 1;
                setVariant(next);
                applyAiDraft(next);
              }}
              className="flex items-center gap-1 text-[13px] font-semibold leading-[1.3]"
            >
              <Icon name="refresh" size={16} />
              Regenerate
            </button>
          </div>
          <div className="px-5 pb-1">
            <Chip tone="yellow">
              <Icon name="sparkle" size={14} />
              Written by AI · Edit anything
            </Chip>
          </div>
          <TextField
            label="Title"
            value={draft.title}
            maxLength={TITLE_MAX}
            onChange={(title) => updateDraft({ title })}
          />
          <TextField
            label="Story"
            value={draft.story}
            maxLength={STORY_MAX}
            rows={3}
            onChange={(story) => updateDraft({ story })}
          />
          <p className="flex items-center gap-1.5 px-5 pt-1 pb-5 text-[13px] font-medium leading-[1.3] text-muted">
            <Icon name="globe" size={14} />
            Koreans will see this in Korean (auto-translated).
          </p>
        </Tile>

        <Tile>
          <div className="flex items-center gap-1.5 px-5 pt-5 pb-2">
            <h2 className="text-[18px] font-bold leading-[1.3]">Vote question</h2>
            <span title="Koreans vote on this question. Results unlock after they vote.">
              <Icon name="info" size={18} />
            </span>
          </div>
          <div className="px-5 pb-1">
            <Chip tone="soft">
              <Icon name={question.icon} size={14} />
              {question.label}
            </Chip>
          </div>
          <TextField
            label="Question (you can edit)"
            value={draft.voteQuestion}
            rows={2}
            onChange={(voteQuestion) => updateDraft({ voteQuestion })}
          />
          <div className="flex flex-col gap-1 px-5 pt-3 pb-5">
            <p className="text-[13px] font-semibold leading-[1.3]">Koreans will answer with</p>
            {question.options.map((opt) => (
              <p
                key={opt}
                className="flex h-12 items-center rounded-full border border-black px-5 text-[15px] leading-[1.5]"
              >
                {opt}
              </p>
            ))}
          </div>
        </Tile>

        <p className="flex items-center gap-1.5 px-6 pt-3 text-[13px] font-medium leading-[1.3] text-muted">
          <Icon name="info" size={14} />
          AI can make mistakes. Please check before posting.
        </p>
      </div>

      <StickyBottom>
        <ArrowCta
          caption="Koreans will see it in Korean"
          title="Post"
          disabled={!canPost}
          onClick={() => {
            publish();
            router.push("/upload/done");
          }}
        />
      </StickyBottom>
    </Screen>
  );
}
