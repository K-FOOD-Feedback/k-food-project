"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { ArrowCta, IconButton } from "@/components/Buttons";
import { Icon } from "@/components/Icon";
import { Chip, Screen, StepProgress, StickyBottom, Tile, Toast, TopBar } from "@/components/Layout";
import { PhotoGrid, PhotoImage } from "@/components/PhotoGrid";
import { usePhotoPicker } from "@/components/PhotoPicker";
import { MAX_PHOTOS } from "@/lib/data";
import { coverOf, useFlow } from "@/lib/flow-store";

export function PhotosScreen() {
  const router = useRouter();
  const { draft, addPhotos, removePhoto, setCover, movePhoto, saveDraftForLater } = useFlow();
  const [limitToast, setLimitToast] = useState(false);
  const closeToast = useCallback(() => setLimitToast(false), []);

  const picker = usePhotoPicker((files) => {
    const { overflow } = addPhotos(files);
    if (overflow) setLimitToast(true);
  });

  const onAdd = () => {
    if (draft.photos.length >= MAX_PHOTOS) {
      setLimitToast(true);
      return;
    }
    picker.open();
  };

  const leave = () => {
    saveDraftForLater("photos");
    router.push("/home");
  };

  const cover = draft.photos.length ? coverOf(draft) : null;

  return (
    <Screen className="pb-[140px]">
      <TopBar
        left={<IconButton icon="chevron-left" label="Back" onClick={leave} />}
        title="Your photos"
        right={
          <span className="pr-2 font-display text-[20px] leading-none text-muted tabular-nums">
            {draft.photos.length}/{MAX_PHOTOS}
          </span>
        }
      />
      <StepProgress step={1} />

      <div className="flex flex-col gap-1 px-2">
        {cover ? (
          <div className="relative aspect-square w-full overflow-hidden rounded-[32px] bg-white">
            <PhotoImage src={cover.src} sizes="(max-width: 430px) 100vw, 430px" priority />
            <Chip className="absolute left-4 top-4">
              <Icon name="check" size={14} strokeWidth={2.5} />
              Cover
            </Chip>
          </div>
        ) : (
          <button
            type="button"
            onClick={onAdd}
            className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-[32px] border-[1.5px] border-dashed border-ink/40 bg-white text-muted"
          >
            <span className="flex size-16 items-center justify-center rounded-full bg-canvas-soft text-ink">
              <Icon name="plus" size={28} />
            </span>
            <span className="text-[15px] font-semibold">Add photos of your dish</span>
            <span className="text-[13px]">Up to {MAX_PHOTOS} photos</span>
          </button>
        )}

        {draft.photos.length > 0 && (
          <Tile>
            <div className="px-5 pt-4 pb-3">
              <PhotoGrid
                photos={draft.photos}
                coverId={draft.coverId}
                onCover={setCover}
                onRemove={removePhoto}
                onMove={movePhoto}
                onAdd={onAdd}
              />
            </div>
            <p className="px-5 pt-1 pb-5 text-[13px] leading-[1.4] text-muted">
              Tap a photo to make it the cover · Hold &amp; drag to reorder
            </p>
          </Tile>
        )}
      </div>

      <StickyBottom>
        <ArrowCta
          title="Next"
          compact
          {...(draft.photos.length ? { href: "/upload/question" } : { disabled: true })}
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
