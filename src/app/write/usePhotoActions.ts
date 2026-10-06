"use client";

import { track } from "@/lib/analytics";
import { useFlow } from "@/lib/write-store";

/** 작성 중 사진 조작 + Mixpanel 기록 (사진 단계 · 글 단계 공용) */
export function usePhotoActions(from: "photos" | "post") {
  const { draft, addPhotos, removePhoto, setCover, movePhoto } = useFlow();
  return {
    /** 고른 파일 추가. 10장을 넘었으면 true */
    add: (files: FileList) => {
      const { added, overflow } = addPhotos(files);
      track("photos_added", { count: added, total: draft.photos.length + added, from });
      if (overflow) track("photo_limit_hit", { from });
      return overflow;
    },
    remove: (id: string) => {
      removePhoto(id);
      track("photo_removed", { total: draft.photos.length - 1, from });
    },
    cover: (id: string) => {
      if (id === draft.coverId) return;
      setCover(id);
      track("cover_changed", { position: draft.photos.findIndex((p) => p.id === id), from });
    },
    move: (fromIndex: number, toIndex: number) => {
      movePhoto(fromIndex, toIndex);
      track("photos_reordered", { from_index: fromIndex, to_index: toIndex, from });
    },
    limitHit: () => track("photo_limit_hit", { from }),
  };
}
