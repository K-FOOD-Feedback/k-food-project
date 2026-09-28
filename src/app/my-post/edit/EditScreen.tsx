"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { ArrowCta, IconButton } from "@/components/Buttons";
import { TextField } from "@/components/Field";
import { Icon } from "@/components/Icon";
import { Screen, StickyBottom, Tile, Toast, TopBar } from "@/components/Layout";
import { PhotoGrid } from "@/components/PhotoGrid";
import { usePhotoPicker } from "@/components/PhotoPicker";
import { getQuestion, MAX_PHOTOS, QUESTIONS, STORY_MAX, TITLE_MAX, type Photo } from "@/lib/data";
import { SAMPLE_MY_POST, useFlow, type MyPost } from "@/lib/flow-store";

let editSeq = 0;

export function EditScreen() {
  const router = useRouter();
  const { myPost, updateMyPost } = useFlow();
  const initial = myPost ?? SAMPLE_MY_POST;
  const locked = initial.votes > 0; // 투표가 시작되면 사진 추가·질문 변경 잠금
  const [form, setForm] = useState<MyPost>(initial);
  const [limitToast, setLimitToast] = useState(false);
  const closeToast = useCallback(() => setLimitToast(false), []);
  const set = (patch: Partial<MyPost>) => setForm((f) => ({ ...f, ...patch }));

  const picker = usePhotoPicker((files) => {
    const room = MAX_PHOTOS - form.photos.length;
    const added = Array.from(files)
      .slice(0, room)
      .map<Photo>((file) => ({ id: `edit-${Date.now()}-${editSeq++}`, src: URL.createObjectURL(file) }));
    if (files.length > room) setLimitToast(true);
    set({ photos: [...form.photos, ...added] });
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
        left={<IconButton icon="x" label="Discard changes" href="/my-post" />}
        title="Edit post"
      />

      <div className="flex flex-col gap-1 px-2">
        {locked && (
          <Tile>
            <div className="flex items-start gap-3 px-5 py-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-yellow">
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
          <div className="flex items-center px-5 pt-5 pb-2">
            <h2 className="flex-1 text-[18px] font-bold leading-[1.3]">Photos</h2>
            <span className="text-[15px] font-bold leading-[1.3] text-subtle tabular-nums">
              {form.photos.length}/{MAX_PHOTOS}
            </span>
          </div>
          <div className="px-5 pt-3.5 pb-3">
            <PhotoGrid
              photos={form.photos}
              coverId={form.coverId}
              onCover={(coverId) => set({ coverId })}
              onRemove={removePhoto}
              onMove={movePhoto}
              onAdd={form.photos.length < MAX_PHOTOS ? picker.open : undefined}
              addLocked={locked}
              canRemove={form.photos.length > 1}
            />
          </div>
          <p className="px-5 pt-1 pb-5 text-[13px] leading-[1.4] text-muted">
            {locked
              ? "Keep at least 1 photo. To remove everything, delete the post."
              : "Tap a photo to make it the cover · Hold & drag to reorder"}
          </p>
        </Tile>

        <Tile>
          <h2 className="px-5 pt-5 pb-2 text-[18px] font-bold leading-[1.3]">What Koreans will tell you</h2>
          {locked ? (
            <div className="px-5 pt-3 pb-5">
              <div className="flex h-14 items-center gap-3 rounded-full bg-canvas-soft px-4 text-muted">
                <Icon name={getQuestion(form.questionId).icon} size={20} className="text-ink" />
                <span className="flex-1 text-[15px] font-semibold leading-[1.3]">
                  {getQuestion(form.questionId).label}
                </span>
                <Icon name="lock" size={18} className="text-ink" />
              </div>
            </div>
          ) : (
            <>
              <div role="radiogroup" aria-label="Question type" className="flex flex-col gap-1 px-5 pt-3 pb-2">
                {QUESTIONS.map((q) => {
                  const on = q.id === form.questionId;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => set({ questionId: q.id, voteQuestion: q.voteQuestion })}
                      className={`flex h-14 items-center gap-3 rounded-full bg-canvas-soft pl-4 pr-3 text-left ${
                        on ? "border-2 border-ink" : "border-2 border-transparent"
                      }`}
                    >
                      <Icon name={q.icon} size={20} />
                      <span className="flex-1 text-[15px] font-semibold leading-[1.3]">{q.label}</span>
                      {on ? (
                        <span className="flex size-6 items-center justify-center rounded-full bg-night text-white">
                          <Icon name="check" size={12} strokeWidth={3} />
                        </span>
                      ) : (
                        <span className="size-6 rounded-full border-2 border-disabled" />
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="flex items-center gap-1.5 px-5 pt-1 pb-5 text-[13px] font-medium leading-[1.3] text-muted">
                <Icon name="info" size={14} />
                Changing this will rewrite the vote question.
              </p>
            </>
          )}
        </Tile>

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
          <h2 className="px-5 pt-5 pb-2 text-[18px] font-bold leading-[1.3]">
            {locked ? "Vote question (locked)" : "Vote question"}
          </h2>
          <TextField
            label="Question"
            value={form.voteQuestion}
            rows={2}
            locked={locked}
            onChange={(voteQuestion) => set({ voteQuestion })}
          />
          <div className="h-2" />
        </Tile>
      </div>

      <StickyBottom>
        <ArrowCta
          title="Save changes"
          compact
          disabled={!form.title.trim()}
          onClick={() => {
            updateMyPost(form);
            router.push("/my-post");
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
