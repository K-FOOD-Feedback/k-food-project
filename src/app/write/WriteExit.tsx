"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconButton, PillButton } from "@/components/Buttons";
import { BottomSheet } from "@/components/Layout";
import { track } from "@/lib/analytics";
import { useFlow, type DraftStep } from "@/lib/write-store";
import { useWriteCopy } from "@/app/write/copy";

/**
 * 글 작성 어느 단계에서든 바로 나가기 (오른쪽 위 ×) — 담당 송희
 * 뒤로(‹)는 이전 단계로, ×는 작성 자체를 나감 → 저장하고 나갈지 / 지우고 나갈지 묻는 시트
 */
export function WriteExit({ step, exitHref = "/home?lang=en" }: { step: DraftStep; exitHref?: string }) {
  const router = useRouter();
  const { saveDraftForLater, discardDraft } = useFlow();
  const [open, setOpen] = useState(false);
  const w = useWriteCopy();

  return (
    <>
      <IconButton
        icon="x"
        label={w.leave}
        onClick={() => {
          track("write_exit_opened", { step });
          setOpen(true);
        }}
      />
      <BottomSheet open={open} onClose={() => setOpen(false)} label={w.leaveLabel}>
        <div className="flex w-full flex-col gap-2 px-6 pt-2">
          <h2 className="font-display text-[24px] leading-[1.2]">{w.leaveTitle}</h2>
          <p className="text-[16px] leading-[1.5] text-muted">{w.leaveBody}</p>
        </div>
        <div className="flex w-full flex-col gap-1">
          <PillButton
            tone="black"
            className="flex-none"
            onClick={() => {
              saveDraftForLater(step);
              track("draft_saved", { step, from: "exit" });
              router.push(exitHref);
            }}
          >
            {w.saveLeave}
          </PillButton>
          <PillButton
            tone="soft"
            className="flex-none !text-error"
            onClick={() => {
              discardDraft();
              track("draft_discarded", { step, from: "exit" });
              router.push(exitHref);
            }}
          >
            {w.deleteLeave}
          </PillButton>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-12 text-[16px] font-semibold text-neutral-400"
          >
            {w.keepWriting}
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
