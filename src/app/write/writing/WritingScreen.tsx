"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { IconButton } from "@/components/Buttons";
import { BlobPhoto } from "@/components/FeedCard";
import { Icon } from "@/components/Icon";
import { Screen, Tile, TopBar } from "@/components/Layout";
import { SAMPLE_PHOTOS } from "@/lib/write-data";
import { coverOf, useFlow } from "@/lib/write-store";

const STEPS = ["Reading your photos", "Writing title & story", "Making the vote question"];
const STEP_MS = 1300;

export function WritingScreen() {
  const router = useRouter();
  const { draft, applyAiDraft, saveDraftForLater } = useFlow();
  const [done, setDone] = useState(0); // 끝난 단계 수
  const cover = draft.photos.length ? coverOf(draft) : SAMPLE_PHOTOS[0];

  // 실제 AI 연동 전까지는 단계별로 시간을 두고 목업 초안을 채웁니다.
  useEffect(() => {
    if (done < STEPS.length) {
      const t = window.setTimeout(() => setDone((d) => d + 1), STEP_MS);
      return () => window.clearTimeout(t);
    }
    applyAiDraft();
    const t = window.setTimeout(() => router.replace("/write/review"), 400);
    return () => window.clearTimeout(t);
  }, [done, applyAiDraft, router]);

  return (
    <Screen>
      <TopBar
        left={
          <IconButton
            icon="x"
            label="Stop and save draft"
            onClick={() => {
              saveDraftForLater("question");
              router.push("/home");
            }}
          />
        }
      />

      <div className="relative mx-auto mt-2 h-[280px] w-full max-w-[375px]">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 animate-pop">
          <BlobPhoto src={cover.src} size={272} priority className="relative animate-float" />
        </div>
        <Sticker className="left-10 top-[12px] size-14 bg-primary" size={28} delay="0s" />
        <Sticker className="left-[292px] top-[42px] size-10 bg-content" size={20} delay=".4s" />
        <Sticker className="left-[300px] top-[232px] size-12 bg-secondary" size={24} delay=".8s" />
      </div>

      <div className="stagger mx-8 mt-10 flex flex-col items-center gap-2 text-center" aria-live="polite">
        <h1 className="font-display text-[28px] leading-[1.1]">Cooking up your post…</h1>
        <p className="text-[15px] leading-[1.5] text-muted">
          AI is looking at your photos and writing a draft. You can edit everything next.
        </p>
      </div>

      <div className="mt-8 animate-rise px-2 pb-[calc(24px+env(safe-area-inset-bottom))] [animation-delay:200ms]">
        <Tile as="div">
          <ol>
            {STEPS.map((label, i) => {
              const state = i < done ? "done" : i === done ? "active" : "todo";
              return (
                <li key={label} className="flex items-center gap-3 px-5 py-3.5">
                  {state === "done" && (
                    <span className="flex size-6 animate-pop items-center justify-center rounded-full bg-on-dark text-on-light">
                      <Icon name="check" size={14} strokeWidth={3} />
                    </span>
                  )}
                  {state === "active" && (
                    <span className="size-6 animate-spin rounded-full border-[3px] border-dashed border-on-dark [animation-duration:2.4s]" />
                  )}
                  {state === "todo" && <span className="size-6 rounded-full border-2 border-on-dark/70" />}
                  <span
                    className={`text-[15px] leading-[1.5] transition-colors duration-300 ${
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
    </Screen>
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
