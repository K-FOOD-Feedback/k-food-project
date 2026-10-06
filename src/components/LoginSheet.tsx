"use client";

import Image from "next/image";
import { BottomSheet } from "./Layout";

/**
 * 02 Login sheet — 가입·로그인은 Google로만 받습니다 (팀 결정).
 * 버튼은 Google 브랜드 가이드의 밝은 버튼(흰 바탕 + 공식 로고) 기준.
 * OAuth 리다이렉트 때문에 사진 선택 "전에" 로그인합니다.
 * 지금은 실제 OAuth 없이 로그인된 것으로 처리합니다.
 */
export function LoginSheet({
  open,
  onClose,
  onLoggedIn,
}: {
  open: boolean;
  onClose: () => void;
  onLoggedIn: () => void;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} label="Log in">
      <div className="flex w-full flex-col gap-2 px-6">
        <h2 className="font-display text-[22px] leading-[1.2]">Log in to share your K-food</h2>
        <p className="text-[15px] leading-[1.5] text-muted">
          One quick step and Koreans can start judging your dish.
        </p>
      </div>
      <button
        type="button"
        onClick={onLoggedIn}
        className="flex h-16 w-full items-center justify-center gap-3 rounded-full bg-white font-display text-[20px] leading-none text-on-light transition active:scale-[0.99]"
      >
        <Image src="/logos/google.svg" alt="" width={20} height={20} />
        Continue with Google
      </button>
      <p className="w-full px-6 text-center text-[12px] font-medium leading-[1.4] text-muted">
        By continuing, you agree to our Terms and Privacy Policy.
      </p>
    </BottomSheet>
  );
}
