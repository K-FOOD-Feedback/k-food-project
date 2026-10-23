"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { ArrowCta, IconButton } from "@/components/Buttons";
import { Icon } from "@/components/Icon";
import { Chip, Screen, StepProgress, StickyBottom, Tile, Toast, TopBar } from "@/components/Layout";
import { PhotoGrid, PhotoImage } from "@/components/PhotoGrid";
import { usePhotoPicker } from "@/components/PhotoPicker";
import { MAX_PHOTOS } from "@/lib/write-data";
import { currentFrom, withFrom } from "@/lib/back";
import { track } from "@/lib/analytics";
import { coverOf, useFlow } from "@/lib/write-store";
import { AnalyzingView } from "./AnalyzingView";
import { DishCard, useDishFlow } from "./DishCard";
import { PhotoCheckNotice } from "./PhotoCheckNotice";
import { usePhotoActions } from "./usePhotoActions";
import { WriteExit } from "./WriteExit";
import { useWriteCopy } from "@/app/write/copy";

export function PhotosScreen({ backHref = "/home?lang=en" }: { backHref?: string }) {
  const router = useRouter();
  // 로그인은 외국인 메인의 Share 버튼(ShareKfoodButton)에서 사진 선택 전에 끝냅니다.
  const { draft, saveDraftForLater } = useFlow();
  const w = useWriteCopy();
  const photo = usePhotoActions("photos");
  const dishFlow = useDishFlow();
  const [editingDish, setEditingDish] = useState(false);
  const [limitToast, setLimitToast] = useState(false);
  const closeToast = useCallback(() => setLimitToast(false), []);

  const picker = usePhotoPicker((files) => {
    if (photo.add(files)) setLimitToast(true);
  });

  const onAdd = () => {
    if (draft.photos.length >= MAX_PHOTOS) {
      photo.limitHit();
      setLimitToast(true);
      return;
    }
    picker.open();
  };

  const leave = () => {
    saveDraftForLater("photos");
    track("draft_saved", { step: "photos", photos: draft.photos.length });
    router.push(backHref);
  };

  const cover = draft.photos.length ? coverOf(draft) : null;

  return (
    <Screen className="pb-[140px]">
      <TopBar
        left={<IconButton icon="chevron-left" label={w.back} onClick={leave} />}
        title={w.photosTitle}
        right={<WriteExit step="photos" exitHref={backHref} />}
      />
      {/* 진행 막대는 분석 화면에선 숨김 (분석이 끝나고 ① 화면이 보일 때부터) */}
      {!dishFlow.analyzing && <StepProgress step={1} />}

      {/* 사진을 고른 직후: 분석이 끝날 때까지 분석 화면 → 끝나면 결과와 함께 이 화면 */}
      {dishFlow.analyzing ? (
        <AnalyzingView />
      ) : (
        <div className="stagger flex flex-col gap-1 px-2">
          {/* AI가 알아본 음식 — 사용자가 먼저 확인할 정보라 맨 위 */}
          <DishCard onEditingChange={setEditingDish} />
          {cover ? (
            <div className="relative aspect-square w-full overflow-hidden rounded-[32px] bg-surface">
              {/* 대표 사진이 바뀌면 부드럽게 교체 */}
              <div key={cover.id} className="absolute inset-0 animate-fade-in">
                <PhotoImage src={cover.src} sizes="(max-width: 430px) 100vw, 430px" priority />
              </div>
              {/* 대표 사진이 음식이 아니면 크게도 알려 줌 */}
              {cover.check === "not_food" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 text-white">
                  <Icon name="alert" size={32} />
                  <span className="text-[16px] font-bold">{w.notFood}</span>
                </div>
              )}
              <Chip className="absolute left-4 top-4">
                <Icon name="check" size={16} strokeWidth={2.5} />
                {w.cover}
              </Chip>
            </div>
          ) : (
            <button
              type="button"
              onClick={onAdd}
              className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-[32px] border-[1.5px] border-dashed border-on-dark/40 bg-surface text-muted transition active:scale-[0.99]"
            >
              <span className="flex size-16 animate-float items-center justify-center rounded-full bg-primary text-on-light">
                <Icon name="plus" size={32} />
              </span>
              <span className="text-[16px] font-semibold">{w.addPhotos}</span>
              <span className="text-[14px]">{w.upTo(MAX_PHOTOS)}</span>
            </button>
          )}

          {draft.photos.length > 0 && (
            <Tile>
              <div className="px-5 pt-4 pb-3">
                <PhotoGrid
                  photos={draft.photos}
                  onRemove={photo.remove}
                  onMove={photo.move}
                  onAdd={onAdd}
                  labels={w.grid}
                />
              </div>
              <p className="px-5 pt-1 pb-5 text-[14px] leading-[1.4] text-muted">
                {w.photosHint(draft.photos.length, MAX_PHOTOS)}
              </p>
            </Tile>
          )}
          {draft.photos.length > 0 && (
            <div className="px-2 pt-2 empty:hidden">
              <PhotoCheckNotice step="photos" />
            </div>
          )}
        </div>
      )}

      {!dishFlow.analyzing && (
        <StickyBottom>
          <ArrowCta
            // 작성 세 단계 모두 같은 버튼 (위 작은 글 없이 Next/Post만, compact)
            title={w.next}
            compact
            {...(dishFlow.canGo && !editingDish
              ? {
                  // 들어온 곳(?from=)은 누를 때 읽어서 이어 붙임 (그리기 전엔 주소를 몰라서 링크 대신 이동)
                  onClick: () => {
                    track("photos_completed", { count: draft.photos.length });
                    router.push(withFrom("/write/post", currentFrom()));
                  },
                }
              : { disabled: true })}
          />
        </StickyBottom>
      )}

      <Toast
        open={limitToast}
        onClose={closeToast}
        title={w.limitTitle(MAX_PHOTOS)}
        body={w.limitBody}
      />
      {picker.input}
    </Screen>
  );
}
