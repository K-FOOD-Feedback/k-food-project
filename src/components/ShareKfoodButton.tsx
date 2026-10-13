"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { isOnboarded } from "@/app/my/profile";
import { openWelcome, WelcomePopup } from "@/app/my/WelcomePopup";
import { track } from "@/lib/analytics";
import { coverOf, useFlow, type DraftStep } from "@/lib/write-store";
import { PillButton } from "./Buttons";
import { BottomSheet } from "./Layout";
import { LoginSheet } from "./LoginSheet";
import { PhotoImage } from "./PhotoGrid";
import { usePhotoPicker } from "./PhotoPicker";

/**
 * 외국인 메인의 "Share your K-food" 버튼 (6. 콘텐츠 작성의 시작점, 담당 송희)
 * 로그인 전 → 로그인 시트 → (처음이면) 가입 환영 화면 → (쓰다 만 글이 있으면) 이어 쓸지 묻는 시트 → 사진 고르기
 * - 사진을 고르면 /write(① Your photos)로 이동 — 음식 인식은 고른 순간부터
 * - 사진 고르기는 버튼 누르는 동작 안에서 열어야 브라우저가 막지 않아서, 각 단계의 버튼에서 바로 엶
 * 모양은 className으로 메인 화면에서 정합니다.
 */
const STEP_HREF: Record<DraftStep, string> = { photos: "/write", post: "/write/post", vote: "/write/vote" };
const STEP_LABEL: Record<DraftStep, string> = { photos: "Photos", post: "Your post", vote: "Ask Koreans" };

export function ShareKfoodButton({ className, children }: { className?: string; children: ReactNode }) {
  const router = useRouter();
  const { loggedIn, logIn, addPhotos, draft, discardDraft } = useFlow();
  const [sheet, setSheet] = useState<"login" | "resume" | null>(null);
  const hasDraft = draft.savedStep !== null && draft.photos.length > 0;

  const picker = usePhotoPicker((files) => {
    const { added, overflow } = addPhotos(files, { fresh: true });
    track("photos_added", { count: added, total: added, from: "share" });
    if (overflow) track("photo_limit_hit", { from: "share" });
    router.push("/write");
  });

  /** 로그인·가입이 끝난 뒤: 쓰다 만 글이 있으면 묻고, 없으면 바로 사진 고르기 */
  const start = () => {
    if (hasDraft) {
      track("draft_resume_shown", { step: draft.savedStep });
      setSheet("resume");
    } else {
      setSheet(null);
      picker.open();
    }
  };

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => {
          track("share_clicked", { logged_in: loggedIn });
          if (!loggedIn) {
            track("login_sheet_opened", { from: "share" });
            setSheet("login");
          } else if (!isOnboarded("en")) {
            track("signup_shown", { viewer: "foreigner", from: "share" });
            setSheet(null);
            openWelcome();
          } else start();
        }}
      >
        {children}
      </button>
      {picker.input}

      <LoginSheet
        open={sheet === "login"}
        onClose={() => {
          track("login_cancelled", { from: "share", stage: "sheet" });
          setSheet(null);
        }}
        onLoggedIn={() => {
          track("login_completed", { from: "share", method: "google" });
          logIn();
          if (!isOnboarded("en")) {
            track("signup_shown", { viewer: "foreigner", from: "share" });
            setSheet(null);
            openWelcome();
          } else start();
        }}
      />

      {/* 가입 환영 — 주소 ?welcome 로 열림 (/home?lang=en&welcome 로 바로 열기도 됨) */}
      <WelcomePopup lang="en" onDone={start} />

      {/* 쓰다 만 글이 있으면 이어 쓸지 */}
      <BottomSheet open={sheet === "resume"} onClose={() => setSheet(null)} label="Continue your post">
        <div className="flex w-full flex-col gap-2 px-6 pt-2">
          <h2 className="font-display text-[22px] leading-[1.25]">Continue your post?</h2>
          <p className="text-[15px] leading-[1.5] text-muted">You have a post you didn&apos;t finish.</p>
        </div>
        {hasDraft && draft.savedStep && (
          <div className="flex w-full items-center gap-3.5 rounded-[24px] bg-surface-2 p-3">
            <span className="relative size-14 shrink-0 overflow-hidden rounded-[16px] bg-surface">
              {coverOf(draft) && <PhotoImage src={coverOf(draft).src} sizes="56px" className="object-cover" />}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-[15px] font-semibold">{draft.title || draft.dish || "Untitled post"}</span>
              <span className="text-[13px] text-muted">
                Saved at {STEP_LABEL[draft.savedStep]} · {draft.photos.length} {draft.photos.length === 1 ? "photo" : "photos"}
              </span>
            </span>
          </div>
        )}
        <div className="flex w-full flex-col gap-1">
          <PillButton
            tone="primary"
            className="flex-none"
            onClick={() => {
              track("draft_resumed", { step: draft.savedStep });
              setSheet(null);
              if (draft.savedStep) router.push(STEP_HREF[draft.savedStep]);
            }}
          >
            Continue writing
          </PillButton>
          <PillButton
            tone="soft"
            className="flex-none"
            onClick={() => {
              track("draft_discarded", { step: draft.savedStep, from: "resume" });
              discardDraft();
              setSheet(null);
              picker.open(); // 새로 시작 — 바로 사진 고르기
            }}
          >
            Start a new post
          </PillButton>
        </div>
      </BottomSheet>
    </>
  );
}
