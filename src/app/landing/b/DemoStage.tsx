"use client";

import { useEffect, useState } from "react";
import { FoodBlob } from "../LandingParts";

/*
  랜딩 시안 B의 데모 — 가짜 글에 한국인 반응이 톡톡 붙고, 투표가 차오르고, 판정 도장 쾅.
  0.7초마다 한 단계, 11단계를 돌고 처음부터 반복합니다.
*/
const TICK = 700;
const STEPS = 11;

const BUBBLES = [
  // 말풍선은 사진 위쪽과 카드 아래에만 — 제목·투표 글자는 가리지 않게
  { at: 1, text: "맛있겠다!", className: "left-2 top-[52px] -rotate-6 bg-primary" },
  { at: 2, text: "치즈 조합 인정 👍", className: "right-1 top-[104px] rotate-3 bg-on-dark" },
  { at: 3, text: "면 좀 더 익혀요 ㅋㅋ", className: "left-1 top-[160px] rotate-2 bg-on-dark" },
  { at: 4, text: "이건 찐 한식!", className: "right-6 top-[352px] -rotate-3 bg-secondary" },
];
const VOTES = [0, 3, 7, 12, 18, 24, 24, 24, 24, 24, 24];
const PCT = [0, 67, 71, 75, 78, 82, 82, 82, 82, 82, 82];

export function DemoStage() {
  const [tick, setTick] = useState(0);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = window.setTimeout(() => setTick(6), 0);
      return () => window.clearTimeout(t);
    }
    const id = window.setInterval(() => {
      setTick((t) => {
        if (t + 1 >= STEPS) {
          setCycle((c) => c + 1);
          return 0;
        }
        return t + 1;
      });
    }, TICK);
    return () => window.clearInterval(id);
  }, []);

  const pct = PCT[tick];

  return (
    <div className="relative mx-auto h-[400px] w-full max-w-[375px]" aria-label="A foreigner's post getting votes and comments from Koreans" role="img">
      {/* 글 카드 */}
      <div className={`absolute left-1/2 top-4 w-[236px] -translate-x-1/2 ${tick >= STEPS - 1 ? "opacity-0" : "opacity-100"} transition-opacity duration-500`}>
        <div className="flex flex-col items-center gap-3 rounded-[30px] bg-content px-5 pt-5 pb-5 text-on-light">
          <FoodBlob emoji="🍜" size={150} />
          <div className="flex w-full flex-col gap-2">
            <p className="font-display text-[20px] leading-[1.1]">My first Buldak Carbonara</p>
            <div className="flex items-center gap-1.5">
              <span className="size-5 rounded-full bg-lilac" aria-hidden="true" />
              <span className="text-[12px] font-bold">Sam · Canada</span>
            </div>
            {/* 투표 막대 */}
            <div className="mt-1 flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between text-[12px] font-bold">
                <span>Is it Korean?</span>
                <span className="tabular-nums">
                  {pct}% · 🇰🇷 {VOTES[tick]}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-on-light/15">
                <div
                  className="h-full rounded-full bg-on-light transition-[width] duration-500 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 한국인 반응 */}
      {BUBBLES.map((b) =>
        tick >= b.at && tick < STEPS - 1 ? (
          <span
            key={`${b.text}-${cycle}`}
            className={`absolute animate-pop rounded-full px-4 py-2.5 text-[15px] font-extrabold leading-none text-on-light shadow-[0_8px_20px_rgba(0,0,0,0.4)] ${b.className}`}
          >
            {b.text}
          </span>
        ) : null,
      )}

      {/* 판정 도장 */}
      {tick >= 6 && tick < STEPS - 1 && (
        <span
          key={`stamp-${cycle}`}
          className="absolute right-3 top-0 -rotate-12 animate-stamp whitespace-nowrap rounded-full bg-on-dark px-4 py-2.5 font-display text-[17px] leading-none text-on-light shadow-[0_10px_28px_rgba(0,0,0,0.5)]"
        >
          Korean-approved ✓
        </span>
      )}
    </div>
  );
}
