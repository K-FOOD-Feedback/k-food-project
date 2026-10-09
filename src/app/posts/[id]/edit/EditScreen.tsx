"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { IconButton, PillButton } from "@/components/Buttons";
import { TextField } from "@/components/Field";
import { Icon } from "@/components/Icon";
import { Screen, StickyBottom, Tile, Toast, TopBar } from "@/components/Layout";
import { PhotoGrid } from "@/components/PhotoGrid";
import { usePhotoPicker } from "@/components/PhotoPicker";
import { aiVoteFor, getQuestion, MAX_PHOTOS, rankQuestions, STORY_MAX, TITLE_MAX, VOTE_TITLE_MAX, type Photo } from "@/lib/write-data";
import { SAMPLE_MY_POST, useFlow, type MyPost, MY_POST_ID } from "@/lib/write-store";
import { OptionsEditor } from "@/app/write/OptionsEditor";
import { QuestionWheel } from "@/app/write/vote/QuestionWheel";
import { track } from "@/lib/analytics";

let editSeq = 0;

export function EditScreen() {
  const router = useRouter();
  const { myPost, updateMyPost } = useFlow();
  const initial = myPost ?? SAMPLE_MY_POST;
  const locked = initial.votes > 0; // 투표가 시작되면 사진 추가·질문 변경 잠금
  const [form, setForm] = useState<MyPost>(initial);
  const [limitToast, setLimitToast] = useState(false);
  const closeToast = useCallback(() => setLimitToast(false), []);
  // 투표 후 잠긴 항목을 눌렀을 때: 흔들림 + 안내 토스트
  const [lockShake, setLockShake] = useState(0);
  const [lockToast, setLockToast] = useState(false);
  const closeLockToast = useCallback(() => setLockToast(false), []);
  const canSave = form.title.trim().length > 0 && form.options.filter((o) => o.trim()).length >= 2;
  const set = (patch: Partial<MyPost>) => setForm((f) => ({ ...f, ...patch }));
  const question = getQuestion(form.questionId);
  // 주제 휠 순서 — 처음 글 기준 AI 추천 순서로 고정 (본문을 고치는 동안 휠 순서가 바뀌지 않게)
  const [ranked] = useState(() => rankQuestions(initial));

  const picker = usePhotoPicker((files) => {
    const room = MAX_PHOTOS - form.photos.length;
    const added = Array.from(files)
      .slice(0, room)
      .map<Photo>((file) => ({ id: `edit-${Date.now()}-${editSeq++}`, src: URL.createObjectURL(file) }));
    if (files.length > room) setLimitToast(true);
    set({ photos: [...form.photos, ...added] });
  });

  // 분석용: 무엇을 고쳤는지 (원래 글과 비교)
  const changedFields = () => ({
    photos_changed: form.photos.map((p) => p.id).join() !== initial.photos.map((p) => p.id).join() || form.coverId !== initial.coverId,
    topic_changed: form.questionId !== initial.questionId,
    title_changed: form.title !== initial.title,
    story_changed: form.story !== initial.story,
    vote_title_changed: form.voteQuestion !== initial.voteQuestion,
    options_changed: form.options.join("|") !== initial.options.join("|"),
  });

  const removePhoto = (id: string) => {
    if (form.photos.length <= 1) return;
    const photos = form.photos.filter((p) => p.id !== id);
    set({ photos, coverId: form.coverId === id ? photos[0].id : form.coverId });
  };

  const movePhoto = (from: number, to: number) => {
    const photos = [...form.photos];
    const [moved] = photos.splice(from, 1);
    photos.splice(to, 0, moved);
    set({ photos });
  };

  return (
    <Screen className="pb-[140px]">
      <TopBar
        left={
          <IconButton
            icon="x"
            label="Discard changes"
            href={`/my/posts/${MY_POST_ID}`}
            onClick={() => {
              const changed = Object.values(changedFields()).some(Boolean);
              track("post_edit_discarded", { had_changes: changed, locked });
            }}
          />
        }
        title="Edit post"
      />

      <div className="stagger flex flex-col gap-1 px-2">
        {locked && (
          <Tile>
            <div className="flex items-start gap-3 px-5 py-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-content text-on-light">
                <Icon name="lock" size={18} />
              </span>
              <div className="flex flex-col gap-0.5">
                <p className="text-[15px] font-bold leading-[1.3]">
                  {initial.votes} {initial.votes === 1 ? "person" : "people"} already voted
                </p>
                <p className="text-[13px] leading-[1.4] text-muted">
                  You can edit text and remove photos. Adding photos or changing the question is locked to keep votes
                  fair.
                </p>
              </div>
            </div>
          </Tile>
        )}

        <Tile>
          <h2 className="px-5 pt-5 pb-2 text-[18px] font-bold leading-[1.3]">Your post</h2>
          <TextField label="Title" value={form.title} maxLength={TITLE_MAX} onChange={(title) => set({ title })} />
          <TextField
            label="Story"
            value={form.story}
            maxLength={STORY_MAX}
            rows={3}
            onChange={(story) => set({ story })}
          />
          <div className="h-2" />
        </Tile>

        <Tile>
          <div className="flex items-center px-5 pt-5 pb-2">
            <h2 className="flex-1 text-[18px] font-bold leading-[1.3]">Photos</h2>
            <span className="text-[15px] font-bold leading-[1.3] text-neutral-400 tabular-nums">
              {form.photos.length}/{MAX_PHOTOS}
            </span>
          </div>
          <div className="px-5 pt-3.5 pb-3">
            <PhotoGrid
              photos={form.photos}
              onRemove={removePhoto}
              onMove={movePhoto}
              onAdd={form.photos.length < MAX_PHOTOS ? picker.open : undefined}
              addLocked={locked}
              onLockedTap={() => {
                track("locked_item_tapped", { item: "add_photo", votes: initial.votes });
                setLockToast(true);
              }}
              canRemove={form.photos.length > 1}
            />
          </div>
          <p className="px-5 pt-1 pb-5 text-[13px] leading-[1.4] text-muted">
            {locked
              ? "Keep at least 1 photo. To remove everything, delete the post."
              : "Drag to reorder · The first photo is the cover"}
          </p>
        </Tile>

        {/* 작성 ③과 같은 구조: 주제 휠 → 투표 제목 → 선택지. 투표가 시작되면 모두 잠김 */}
        <Tile>
          <h2 className="px-5 pt-5 pb-2 text-[18px] font-bold leading-[1.3]">
            {locked ? "Ask Koreans (locked)" : "Ask Koreans"}
          </h2>
          <div className="flex flex-col gap-2 pt-1 pb-1">
            {locked ? (
              <div className="px-5 pt-1">
                <button
                  key={lockShake}
                  type="button"
                  onClick={() => {
                    track("locked_item_tapped", { item: "topic", votes: initial.votes });
                    setLockShake((k) => k + 1);
                    setLockToast(true);
                  }}
                  className={`flex h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-surface-2 px-4 text-muted ${
                    lockShake ? "animate-shake" : ""
                  }`}
                >
                  <Icon name={question.icon} size={18} className="text-on-dark" />
                  <span className="text-[17px] font-bold text-on-dark">{question.label}</span>
                  <Icon name="lock" size={16} className="text-on-dark" />
                </button>
              </div>
            ) : (
              <div className="px-3">
                <QuestionWheel
                  items={ranked}
                  value={form.questionId}
                  onChange={(id, method) => {
                    track("edit_topic_changed", { from_topic: form.questionId, to_topic: id, method });
                    // 주제를 바꾸면 투표 제목·선택지를 그 주제에 맞게 다시 만듦
                    set({ questionId: id, ...aiVoteFor(id, form.dish, form) });
                  }}
                />
              </div>
            )}
            <p className="px-5 text-center text-[13px] leading-[1.4] text-muted">{question.hint}</p>
          </div>
          <div key={form.questionId} className="animate-fade-in">
            <TextField
              label="Vote title"
              value={form.voteQuestion}
              maxLength={VOTE_TITLE_MAX}
              locked={locked}
              onChange={(voteQuestion) => set({ voteQuestion })}
            />
            <div className="flex flex-col gap-2 px-5 pt-3 pb-5">
              <p className="text-[13px] font-semibold leading-[1.3]">Choices Koreans can pick</p>
              <OptionsEditor source="edit" options={form.options} locked={locked} onChange={(options) => set({ options })} />
            </div>
          </div>
        </Tile>
      </div>

      <StickyBottom>
        <div className="flex">
          <PillButton
            tone={canSave ? "primary" : "disabled"}
            disabled={!canSave}
            onClick={() => {
              track("post_edit_saved", { ...changedFields(), locked, votes: initial.votes });
              updateMyPost(form);
              router.push(`/my/posts/${MY_POST_ID}`);
            }}
          >
            Save changes
          </PillButton>
        </div>
      </StickyBottom>

      <Toast
        open={limitToast}
        onClose={closeToast}
        title={`You can add up to ${MAX_PHOTOS} photos`}
        body="Remove a photo first, then add a new one."
      />
      <Toast
        open={lockToast}
        onClose={closeLockToast}
        title="Locked after votes"
        body="To keep votes fair, you can't add photos or change the question."
      />
      {picker.input}
    </Screen>
  );
}
