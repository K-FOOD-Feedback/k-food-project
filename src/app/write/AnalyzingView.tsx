"use client";

import { BlobPhoto } from "@/components/FeedCard";
import { Icon } from "@/components/Icon";
import { Tile } from "@/components/Layout";
import { coverOf, useFlow } from "@/lib/write-store";
import { usePhotoCheck } from "./PhotoCheckNotice";
import { useWriteCopy } from "@/app/write/copy";

/**
 * 사진을 고른 직후 분석 화면 (① 사진 화면이 열리기 전, 담당 송희)
 * 업로드 → 음식 사진인지 확인 → 음식 알아보기가 끝나면 ① 화면이 결과와 함께 열림
 */

export function AnalyzingView() {
  const { draft, ai } = useFlow();
  const w = useWriteCopy();
  const STEPS = w.analyzingSteps;
  const { checking } = usePhotoCheck();
  const cover = coverOf(draft);
  // 끝난 단계 수 — 업로드는 바로 끝, 검사가 끝나면 2, 음식을 알아보면 3
  const done = checking ? 1 : ai.dish === "ready" ? 3 : 2;

  return (
    <div className="flex flex-col" aria-live="polite">
      <div className="mx-8 mt-1 flex animate-rise flex-col items-center gap-2 text-center">
        <h1 className="font-display text-[32px] leading-[1.2]">{w.analyzingTitle}</h1>
        <p className="text-[16px] leading-[1.5] text-muted">{w.analyzingBody}</p>
      </div>

      <div className="relative mx-auto mt-8 h-[280px] w-full max-w-[375px]">
        {cover && (
          <div className="absolute left-1/2 top-0 -translate-x-1/2 animate-pop">
            <BlobPhoto src={cover.src} size={272} priority className="relative animate-float" />
          </div>
        )}
        <Sticker className="left-10 top-[12px] size-14 bg-primary" size={28} delay="0s" />
        <Sticker className="left-[292px] top-[42px] size-10 bg-content" size={20} delay=".4s" />
        <Sticker className="left-[300px] top-[232px] size-12 bg-secondary" size={24} delay=".8s" />
      </div>

      <div className="mt-8 animate-rise px-2 [animation-delay:200ms]">
        <Tile as="div">
          <ol>
            {STEPS.map((label, i) => {
              const state = i < done ? "done" : i === done ? "active" : "todo";
              return (
                <li key={label} className="flex items-center gap-3 px-5 py-4">
                  {state === "done" && (
                    <span className="flex size-6 animate-pop items-center justify-center rounded-full bg-on-dark text-on-light">
                      <Icon name="check" size={16} strokeWidth={3} />
                    </span>
                  )}
                  {state === "active" && (
                    <span className="size-6 animate-spin rounded-full border-2 border-dashed border-on-dark [animation-duration:2.4s]" />
                  )}
                  {state === "todo" && <span className="size-6 rounded-full border-2 border-on-dark/70" />}
                  <span
                    className={`text-[16px] leading-[1.5] transition-colors duration-300 ${
                      state === "active" ? "font-bold" : state === "todo" ? "font-medium text-neutral-400" : "font-medium"
                    }`}
                  >
                    {label}
                    {state === "active" && <span className="sr-only"> (in progress)</span>}
                  </span>
                </li>
              );
            })}
          </ol>
        </Tile>
      </div>
    </div>
  );
}

function Sticker({ className, size, delay }: { className: string; size: number; delay: string }) {
  return (
    <span
      className={`absolute flex animate-bounce items-center justify-center rounded-full text-on-light [animation-duration:2.2s] ${className}`}
      style={{ animationDelay: delay }}
      aria-hidden="true"
    >
      <Icon name="sparkle" size={size} />
    </span>
  );
}
