"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowCta, IconButton } from "@/components/Buttons";
import { TextField } from "@/components/Field";
import { Icon } from "@/components/Icon";
import { Chip, Screen, StepProgress, StickyBottom, Tile, Toast, TopBar } from "@/components/Layout";
import { PhotoGrid } from "@/components/PhotoGrid";
import { usePhotoPicker } from "@/components/PhotoPicker";
import { getQuestion, MAX_PHOTOS, STORY_MAX, TITLE_MAX } from "@/lib/write-data";
import { useFlow } from "@/lib/write-store";

export function ReviewScreen() {
  const router = useRouter();
  const { draft, updateDraft, applyAiDraft, saveDraftForLater, publish, addPhotos, removePhoto, setCover, movePhoto } =
    useFlow();
  const question = getQuestion(draft.questionId);
  const [limitToast, setLimitToast] = useState(false);
  const [posting, setPosting] = useState(false);
  const closeToast = useCallback(() => setLimitToast(false), []);
  const picker = usePhotoPicker((files) => {
    if (addPhotos(files).overflow) setLimitToast(true);
  });

  // 바로 이 화면으로 들어온 경우에도 초안이 비어 있지 않도록 (처음 한 번만)
  const filled = useRef(false);
  useEffect(() => {
    if (filled.current) return;
    filled.current = true;
    if (!draft.title && !draft.story) applyAiDraft();
  }, [draft.title, draft.story, applyAiDraft]);

  const canPost =
    draft.photos.length > 0 && draft.title.trim().length > 0 && draft.voteQuestion.trim().length > 0;

  return (
    <Screen className="pb-[140px]">
      <TopBar
        left={
          <IconButton
            icon="chevron-left"
            label="Back"
            onClick={() => {
              saveDraftForLater("review");
              router.push("/write/question");
            }}
          />
        }
        title="Review your post"
      />
      <StepProgress step={3} />

      <div className="stagger flex flex-col gap-1 px-2">
        {/* 사진 — 맨 왼쪽이 대표(Cover) */}
        <Tile>
          <div className="px-5 pt-4 pb-3">
            <PhotoGrid
              photos={draft.photos}
              coverId={draft.coverId}
              coverChip
              onCover={setCover}
              onRemove={removePhoto}
              onMove={movePhoto}
              onAdd={() => (draft.photos.length >= MAX_PHOTOS ? setLimitToast(true) : picker.open())}
            />
          </div>
          <p className="px-5 pt-1 pb-5 text-[13px] leading-[1.4] text-muted">
            Tap a photo to make it the cover · Hold &amp; drag to reorder
          </p>
        </Tile>

        <Tile>
          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <h2 className="text-[18px] font-bold leading-[1.3]">Your post</h2>
            <Chip tone="yellow">
              <Icon name="sparkle" size={14} />
              Written by AI
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
          <div className="flex items-center gap-2 px-5 pb-1">
            <Chip tone="soft">
              <Icon name={question.icon} size={14} />
              {question.label}
            </Chip>
            {/* 질문 종류 바꾸기 → 휠 화면으로 */}
            <Link
              href="/write/question"
              aria-label="Change question type"
              className="-m-2 flex size-8 items-center justify-center"
            >
              <EditFilledIcon />
            </Link>
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
                className="flex h-12 items-center rounded-full border border-on-dark/70 px-5 text-[15px] leading-[1.5]"
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
          caption={posting ? "Translating into Korean…" : "Koreans will see it in Korean"}
          title={posting ? "Posting…" : "Post"}
          disabled={!canPost || posting}
          className={posting ? "animate-pulse" : ""}
          onClick={() => {
            // 바로 넘어가지 않고 "올리는 중" 상태를 잠깐 보여 줍니다
            setPosting(true);
            window.setTimeout(() => {
              publish();
              router.push("/write/done");
            }, 900);
          }}
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

// 채워진 연필 (Figma ant-design:edit-filled 대응)
function EditFilledIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm17.71-10.21a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  );
}
