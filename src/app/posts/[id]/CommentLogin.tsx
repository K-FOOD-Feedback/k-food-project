"use client";

import { useState } from "react";
import { LoginSheet } from "@/components/LoginSheet";
import { isOnboarded } from "@/app/my/profile";
import { openWelcome, WelcomePopup } from "@/app/my/WelcomePopup";
import { track } from "@/lib/analytics";
import { useFlow } from "@/lib/write-store";
import { COMMENTS_COPY, type CommentsLang } from "./copy";

/**
  외국인은 투표 없이 한마디를 볼 수 있지만, 한마디·답글을 남기려면 로그인해야 합니다.
  로그인 전에 입력칸·이모지·답글 칸을 누르면 로그인 시트(송희 LoginSheet)가 뜨고,
  처음 가입이면 환영 화면(닉네임·약관)까지 마친 뒤 바로 쓸 수 있게 됩니다.

  사용: const login = useCommentLogin(...) → CommentPile에 writeLocked={login.locked} onLockedWrite={login.ask},
  화면 아래에 {login.sheet}
*/
export function useCommentLogin({
  enabled,
  lang,
  postId,
  screen,
}: {
  /** 외국인 화면일 때만 (한국인은 투표하면서 이미 로그인함) */
  enabled: boolean;
  lang: CommentsLang;
  postId: string;
  screen: "detail" | "comments";
}) {
  const { loggedIn, logIn } = useFlow();
  const [open, setOpen] = useState(false);
  const t = COMMENTS_COPY[lang];
  const locked = enabled && !loggedIn;

  const ask = () => {
    track("login_sheet_opened", { from: "comment", screen, post_id: postId, viewer: "foreigner" });
    setOpen(true);
  };

  const sheet = enabled ? (
    <>
      <LoginSheet
        // 로그인 시트는 아직 한국어·영어만 (중국어·일본어는 영어로)
        lang={lang === "ko" ? "ko" : "en"}
        open={open}
        title={t.loginTitle}
        body={t.loginBody}
        onClose={() => {
          track("login_cancelled", { from: "comment", stage: "sheet", post_id: postId });
          setOpen(false);
        }}
        onLoggedIn={() => {
          track("login_completed", { from: "comment", method: "google" });
          logIn();
          setOpen(false);
          if (!isOnboarded("en")) {
            track("signup_shown", { viewer: "foreigner", from: "comment" });
            openWelcome();
          }
        }}
      >
        <div className="flex items-center gap-2 pt-2" aria-hidden="true">
          <span className="flex size-14 animate-pop items-center justify-center rounded-full bg-on-dark text-[24px] shadow-[0_6px_16px_rgba(0,0,0,0.35)]">
            💬
          </span>
        </div>
      </LoginSheet>
      {/* 가입 환영 — 주소 ?welcome 로 열림 */}
      <WelcomePopup lang="en" onDone={() => {}} />
    </>
  ) : null;

  return { locked, ask, sheet };
}
