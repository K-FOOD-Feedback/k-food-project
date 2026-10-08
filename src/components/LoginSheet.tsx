"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { BottomSheet } from "./Layout";

/**
 * 02 Login sheet — 가입·로그인은 Google로만 받습니다 (팀 결정).
 * 버튼은 Google 브랜드 가이드의 밝은 버튼(흰 바탕 + 공식 로고) 기준.
 * OAuth 리다이렉트 때문에 사진 선택 "전에" 로그인합니다.
 * 지금은 실제 OAuth 없이 로그인된 것으로 처리합니다.
 */
const COPY = {
  en: {
    label: "Log in",
    title: "Log in to share your K-food",
    body: "One quick step and Koreans can start judging your dish.",
    google: "Continue with Google",
    terms: "By continuing, you agree to our Terms and Privacy Policy.",
  },
  ko: {
    label: "로그인",
    title: "로그인하고 한마디 보태기",
    body: "투표는 로그인한 한국인만 할 수 있어요. 구글로 3초면 끝나요.",
    google: "Google로 계속하기",
    terms: "계속하면 이용약관과 개인정보처리방침에 동의하게 돼요.",
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
  lang?: "en" | "ko";
  title?: string;
  body?: string;
  /** 제목 위에 들어갈 그림 등 */
  children?: ReactNode;
}) {
  const t = COPY[lang];
  return (
    <BottomSheet open={open} onClose={onClose} label={t.label}>
      {children}
      <div className="flex w-full flex-col gap-2 px-6 break-keep">
        <h2 className={`text-[22px] leading-[1.25] ${lang === "ko" ? "font-extrabold" : "font-display"}`}>
          {title ?? t.title}
        </h2>
        <p className="text-[15px] leading-[1.5] text-muted">{body ?? t.body}</p>
      </div>
      <button
        type="button"
        onClick={onLoggedIn}
        className="flex h-16 w-full items-center justify-center gap-3 rounded-full bg-white font-display text-[20px] leading-none text-on-light transition active:scale-[0.99]"
      >
        <Image src="/logos/google.svg" alt="" width={20} height={20} />
        {t.google}
      </button>
      <p className="w-full break-keep px-6 text-center text-[12px] font-medium leading-[1.4] text-muted">{t.terms}</p>
    </BottomSheet>
  );
}
