import { TrackView } from "@/components/Track";
import { DraftSwitch, LandingActions } from "../LandingParts";
import { DemoStage } from "./DemoStage";

/*
  랜딩 시안 B — 데모 애니메이션형
  설명 대신, 외국인의 글에 한국인 반응이 붙고 판정이 나는 장면을 반복 재생합니다.
*/
export default function Page() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col overflow-x-hidden bg-background pt-[env(safe-area-inset-top)] text-on-dark">
      <DraftSwitch current="b" />
      <TrackView event="landing_viewed" props={{ variant: "b" }} />

      <h1 className="px-5 pt-[68px] font-display text-[46px] leading-[0.95]">
        {["See what", "Koreans think."].map((line, i) => (
          <span key={line} className="block animate-rise" style={{ animationDelay: `${i * 90}ms` }}>
            {line}
          </span>
        ))}
      </h1>

      <div className="mt-4 animate-rise [animation-delay:250ms]">
        <DemoStage />
      </div>

      {/* 한 줄 흐름 */}
      <div className="mx-5 mt-2 flex animate-rise flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[13px] font-bold text-neutral-400 [animation-delay:450ms]">
        <span>📸 Post your K-food</span>
        <span aria-hidden="true">→</span>
        <span>🇰🇷 Koreans vote</span>
        <span aria-hidden="true">→</span>
        <span>✅ Get the verdict</span>
      </div>

      <LandingActions />
    </main>
  );
}
