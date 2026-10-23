"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { BottomSheet } from "./Layout";

/**
 * 02 Login sheet — 가입·로그인은 Google로만 받습니다 (팀 결정).
 * 버튼은 Google 브랜드 가이드의 밝은 버튼(흰 바탕 + 공식 로고) 기준.
 * OAuth 리다이렉트 때문에 사진 선택 "전에" 로그인합니다.
 * 지금은 실제 OAuth 없이 로그인된 것으로 처리합니다.
 * 약관 동의는 처음 가입 화면(WelcomePopup)에서 전체 동의로 따로 받아서, 여기엔 약관 문구를 두지 않습니다.
 */
const COPY = {
  en: {
    label: "Log in",
    title: "Log in to share your K-food",
    body: "One quick step and Koreans can start judging your dish.",
    google: "Continue with Google",
  },
  ko: {
    label: "로그인",
    title: "로그인하고 한마디 보태기",
    body: "투표는 로그인한 한국인만 할 수 있어요.\n구글로 3초면 끝나요.",
    google: "Google로 계속하기",
  },
  // 중국어·일본어 (지구본으로 고르면 — 송희 확인)
  zh: {
    label: "登录",
    title: "登录后分享你的韩餐",
    body: "只需一步，韩国人就能开始评判你的菜。",
    google: "使用 Google 继续",
  },
  zht: {
    label: "登入",
    title: "登入後分享你的韓餐",
    body: "只需一步，韓國人就能開始評判你的菜。",
    google: "使用 Google 繼續",
  },
  ja: {
    label: "ログイン",
    title: "ログインして韓国料理をシェア",
    body: "ワンステップで、韓国の人があなたの料理をジャッジし始めます。",
    google: "Googleで続ける",
  },
};

export function LoginSheet({
  open,
  onClose,
  onLoggedIn,
  lang = "en",
  title,
  body,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onLoggedIn: () => void;
  /** 외국인(작성) = en, 한국인(투표) = ko */
  lang?: "en" | "ko" | "zh" | "zht" | "ja";
  title?: string;
  body?: string;
  /** 제목 위에 들어갈 그림 등 */
  children?: ReactNode;
}) {
  const t = COPY[lang];
  return (
    <BottomSheet open={open} onClose={onClose} label={t.label}>
      {children}
      {/* 제목·안내는 가운데 정렬 (아래 버튼과 같은 축), 제목과 안내 사이 12px */}
      <div className="flex w-full flex-col items-center gap-3 px-6 pt-3 text-center break-keep">
        <h2 className="font-display text-[24px] leading-[1.2]">
          {title ?? t.title}
        </h2>
        <p className="text-[16px] leading-[1.5] whitespace-pre-line text-muted">{body ?? t.body}</p>
      </div>
      <button
        type="button"
        onClick={onLoggedIn}
        className="flex h-16 w-full items-center justify-center gap-3 rounded-full bg-white font-display text-[20px] leading-none text-on-light transition active:scale-[0.99]"
      >
        <Image src="/logos/google.svg" alt="" width={20} height={20} />
        {t.google}
      </button>
    </BottomSheet>
  );
}
