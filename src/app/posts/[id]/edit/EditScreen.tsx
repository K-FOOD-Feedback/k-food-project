"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { IconButton, PillButton } from "@/components/Buttons";
import { TextField } from "@/components/Field";
import { Icon } from "@/components/Icon";
import { Screen, StickyBottom, Tile, Toast, TopBar } from "@/components/Layout";
import { PhotoGrid } from "@/components/PhotoGrid";
import { usePhotoPicker } from "@/components/PhotoPicker";
import { getQuestion, MAX_PHOTOS, STORY_MAX, TITLE_MAX, VOTE_TITLE_MAX, type Photo } from "@/lib/write-data";
import { SAMPLE_MY_POST, useFlow, type MyPost, MY_POST_ID } from "@/lib/write-store";
import { OptionsEditor } from "@/app/write/OptionsEditor";
import { track } from "@/lib/analytics";

let editSeq = 0;

/*
  5. 수정 — 담당 송희
  - 글(제목·본문)과 사진(추가·삭제·순서)만 고칠 수 있음
  - 투표(주제·투표 제목·선택지)는 올린 뒤엔 바꿀 수 없음 → 읽기 전용으로 보여 주기만
    (메인 카드에 주제가 이미 보이고, 투표 중간에 질문이 바뀌면 공정하지 않으니까)
*/

export function EditScreen() {
  const router = useRouter();
  const { myPost, updateMyPost } = useFlow();
  const initial = myPost ?? SAMPLE_MY_POST;
  const locked = initial.votes > 0; // 분석용: 이미 투표가 들어온 글인지
  const [form, setForm] = useState<MyPost>(initial);
  const [limitToast, setLimitToast] = useState(false);
  const closeToast = useCallback(() => setLimitToast(false), []);
  // 잠긴 투표를 눌렀을 때: 흔들림 + 안내 토스트
  const [lockShake, setLockShake] = useState(0);
  const [lockToast, setLockToast] = useState(false);
  const closeLockToast = useCallback(() => setLockToast(false), []);
  const canSave = form.title.trim().length > 0;
  const set = (patch: Partial<MyPost>) => setForm((f) => ({ ...f, ...patch }));
  const question = getQuestion(form.questionId);

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
    title_changed: form.title !== initial.title,
    story_changed: form.story !== initial.story,
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
        <Tile>
          <h2 className="px-5 pt-5 pb-2 font-display text-[20px] leading-[1.2]">Your post</h2>
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
            <h2 className="flex-1 font-display text-[20px] leading-[1.2]">Photos</h2>
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
              canRemove={form.photos.length > 1}
            />
          </div>
          <p className="px-5 pt-1 pb-5 text-[13px] leading-[1.4] text-muted">
            Drag to reorder · The first photo is the cover
          </p>
        </Tile>

        {/* 투표 — 읽기 전용 (작성 ③과 같은 순서: 주제 → 투표 제목 → 선택지) */}
        <Tile>
          <h2 className="px-5 pt-5 pb-2 font-display text-[20px] leading-[1.2]">Ask Koreans</h2>
          <div className="px-5 pt-1 pb-1">
            <button
              key={lockShake}
              type="button"
              onClick={() => {
                track("locked_item_tapped", { item: "topic", votes: initial.votes });
                setLockShake((k) => k + 1);
                setLockToast(true);
              }}
              className={`flex h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-surface-2 px-4 ${
                lockShake ? "animate-shake" : ""
              }`}
            >
              <Icon name={question.icon} size={18} />
              <span className="text-[17px] font-bold">{question.label}</span>
              <Icon name="lock" size={16} className="text-neutral-400" />
            </button>
          </div>
          <TextField label="Vote title" value={form.voteQuestion} maxLength={VOTE_TITLE_MAX} locked />
          <div className="flex flex-col gap-2 px-5 pt-3 pb-4">
            <p className="text-[13px] font-semibold leading-[1.3]">Choices Koreans can pick</p>
            <OptionsEditor source="edit" options={form.options} locked onChange={() => {}} />
          </div>
          <p className="flex items-center gap-1.5 px-5 pb-5 text-[13px] font-medium leading-[1.3] text-muted">
            <Icon name="info" size={14} />
            Votes can&apos;t be changed after posting.
          </p>
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
        title="Votes can't be changed"
        body="To keep votes fair, the question and choices stay as posted."
      />
      {picker.input}
    </Screen>
  );
}
