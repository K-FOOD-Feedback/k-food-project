import { TrackView } from "@/components/Track";
import { DraftSwitch, FoodBlob, LandingActions } from "../LandingParts";

/*
  랜딩 시안 A — 3단계 설명형
  "사진 올리기 → 한국인이 참견 → 판정 확인"을 카드 세 장으로 보여 줍니다.
*/
export default function Page() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background pt-[env(safe-area-inset-top)] text-on-dark">
      <DraftSwitch current="a" />
      <TrackView event="landing_viewed" props={{ variant: "a" }} />

      <header className="px-5 pt-[72px]">
        <h1 className="font-display text-[60px] leading-[0.9]">
          {["See what", "Koreans", "think."].map((line, i) => (
            <span key={line} className="block animate-rise" style={{ animationDelay: `${i * 90}ms` }}>
              {line}
            </span>
          ))}
        </h1>
        <p className="mt-4 max-w-[300px] animate-rise text-[16px] leading-[1.5] text-neutral-400 [animation-delay:300ms]">
          Made K-food? Post it, and real Koreans tell you if you nailed it.
        </p>
      </header>

      <ol className="stagger mt-8 flex flex-col gap-2 px-2">
        {/* 1 */}
        <li className="flex animate-rise items-center gap-4 rounded-[32px] bg-content py-5 pl-6 pr-4 text-on-light">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="font-display text-[15px] opacity-50">01</span>
            <p className="font-display text-[26px] leading-[1.05]">Snap your K-food</p>
            <p className="text-[14px] font-medium leading-[1.4] opacity-70">Cooked it, ordered it, tried it — post a photo.</p>
          </div>
          <div className="relative">
            <FoodBlob emoji="🍜" size={92} />
            <span className="absolute -right-1 -top-1 flex size-9 rotate-12 items-center justify-center rounded-full bg-on-light text-[18px]">
              📸
            </span>
          </div>
        </li>

        {/* 2 */}
        <li className="flex animate-rise items-center gap-4 overflow-hidden rounded-[32px] bg-primary py-5 pl-6 pr-4 text-on-light">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="font-display text-[15px] opacity-50">02</span>
            <p className="font-display text-[26px] leading-[1.05]">Koreans weigh in</p>
            <p className="text-[14px] font-medium leading-[1.4] opacity-70">They vote and drop their two cents.</p>
          </div>
          <div className="flex w-[112px] shrink-0 flex-col items-end gap-1.5 text-[13px] font-extrabold leading-none">
            <span className="-rotate-3 rounded-full bg-on-light px-3 py-2 text-on-dark">맛있겠다!</span>
            <span className="rotate-2 rounded-full bg-white px-3 py-2">김치 더 넣어요</span>
            <span className="-rotate-2 rounded-full bg-on-light px-3 py-2 text-on-dark">🇰🇷 +12</span>
          </div>
        </li>

        {/* 3 */}
        <li className="flex animate-rise items-center gap-4 rounded-[32px] bg-secondary py-5 pl-6 pr-5 text-on-light">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="font-display text-[15px] opacity-50">03</span>
            <p className="font-display text-[26px] leading-[1.05]">Get the verdict</p>
            <p className="text-[14px] font-medium leading-[1.4] opacity-70">Does it pass as the real deal?</p>
          </div>
          <div className="flex size-[96px] shrink-0 -rotate-6 flex-col items-center justify-center rounded-full bg-on-light text-on-dark">
            <span className="font-display text-[30px] leading-none">82%</span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.06em] text-content">Korean!</span>
          </div>
        </li>
      </ol>

      {/* 한국인에게 한 줄 */}
      <p className="mx-6 mt-6 mb-2 animate-rise text-center text-[14px] font-semibold leading-[1.5] text-neutral-400 [animation-delay:700ms]">
        한국인이라면? 전 세계의 한식 도전에 <span className="text-on-dark">한마디 보태 주세요</span> 🇰🇷
      </p>

      <LandingActions />
    </main>
  );
}
