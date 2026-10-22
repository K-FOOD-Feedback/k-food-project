import type { Metadata } from "next";
import { Screen } from "@/components/Layout";

/*
  곧 공개 화면 — 출시 전 toppytippy.com 에서만 보입니다 (src/proxy.ts 의 PRELAUNCH 스위치).
  완전 검정 바탕에 Gilroy "Coming soon" 을 화면 폭에 맞춰 두 줄로 크게.
  문구는 고정이고 글자 크기가 화면 폭을 따라가서(최대 430px 기준) 넘칠 일은 없음.
*/
export const metadata: Metadata = {
  title: "Toppy Tippy — Coming soon",
  robots: { index: false },
};

export default function ComingSoonPage() {
  return (
    // 화면 전체를 덮어 430px 칸 바깥까지 검정, 작업용 한국인/외국인 토글(z-60)도 가림
    <div className="fixed inset-0 z-[70] overflow-hidden bg-black">
      <Screen bg="bg-black" className="justify-center px-5">
        <h1 className="animate-rise font-display text-[min(24vw,104px)] leading-[0.88] tracking-[-0.03em] text-on-dark">
          Coming
          <br />
          soon
        </h1>
      </Screen>
    </div>
  );
}
