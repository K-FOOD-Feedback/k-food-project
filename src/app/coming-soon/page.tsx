import type { Metadata } from "next";
import { Screen } from "@/components/Layout";

/*
  곧 공개 화면 — 출시 전 toppytippy.com 에서만 보입니다 (src/proxy.ts 의 PRELAUNCH 스위치).
  문구는 고정이라 넘칠 일은 없음.
*/
export const metadata: Metadata = {
  title: "Toppy Tippy — Coming soon",
  robots: { index: false },
};

export default function ComingSoonPage() {
  return (
    <Screen className="items-center justify-center px-6 text-center">
      <p className="animate-rise font-display text-[40px] leading-[1.1] text-primary">
        Coming soon
      </p>
      <p className="mt-4 animate-rise text-base text-neutral-400 [animation-delay:120ms]">
        곧 만나요!
      </p>
    </Screen>
  );
}
