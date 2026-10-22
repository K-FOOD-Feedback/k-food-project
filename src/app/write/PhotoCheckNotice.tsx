"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { Toast } from "@/components/Layout";
import { track } from "@/lib/analytics";
import { useFlow } from "@/lib/write-store";
import { useWriteCopy } from "@/app/write/copy";

/**
 * 사진 검사 상태 (작성 ①사진 · ②글 공용, 담당 송희)
 * - checking: 검사 중이면 다음으로 못 감
 * - blocked: 음식이 아닌 사진이 있으면 다음으로 못 감 (빼면 풀림)
 */
export function usePhotoCheck() {
  const { draft } = useFlow();
  const notFood = draft.photos.filter((p) => p.check === "not_food").length;
  const checking = draft.photos.some((p) => p.check === "checking");
  const unsure = draft.photos.some((p) => p.check === "unsure");
  return { notFood, checking, unsure, canGo: !checking && notFood === 0 };
}

/** 사진 아래 안내 + 혐오·선정 사진을 뺐을 때 토스트 */
export function PhotoCheckNotice({ step }: { step: "photos" | "post" }) {
  const { unsafeRemoved } = useFlow();
  const w = useWriteCopy();
  const { notFood, checking, unsure } = usePhotoCheck();

  // 검사에서 걸려 사진을 뺐으면 한 번 알려 줌 (사진은 다시 보여 주지 않음)
  const [toast, setToast] = useState(false);
  const [seen, setSeen] = useState(unsafeRemoved);
  if (unsafeRemoved !== seen) {
    setSeen(unsafeRemoved);
    if (unsafeRemoved > seen) setToast(true);
  }
  const close = useCallback(() => setToast(false), []);

  // 분석: 안내가 보일 때 한 번
  const shown = useRef(0);
  useEffect(() => {
    if (notFood > 0 && notFood !== shown.current) track("photo_blocked_shown", { count: notFood, step });
    shown.current = notFood;
  }, [notFood, step]);

  return (
    <>
      {notFood > 0 ? (
        <p className="flex items-start gap-2 rounded-[20px] bg-error/15 px-4 py-3 text-[14px] font-semibold leading-[1.4] text-error">
          <Icon name="alert" size={18} className="mt-px shrink-0" />
          {notFood === 1 ? w.notFoodOne : w.notFoodMany(notFood)}
        </p>
      ) : checking ? (
        <p className="flex items-center gap-2 px-1 text-[13px] font-medium text-muted">
          <Icon name="sparkle" size={14} className="animate-spin [animation-duration:1.4s]" />
          {w.checking}
        </p>
      ) : unsure ? (
        <p className="flex items-start gap-2 px-1 text-[13px] leading-[1.4] text-muted">
          <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-content text-[10px] font-bold text-on-light">
            !
          </span>
          {w.unsure}
        </p>
      ) : null}
      <Toast
        open={toast}
        onClose={close}
        title={w.removedTitle}
        body={w.removedBody}
      />
    </>
  );
}
