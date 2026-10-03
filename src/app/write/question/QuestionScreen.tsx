"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowCta, IconButton } from "@/components/Buttons";
import { Icon } from "@/components/Icon";
import { Chip, Screen, StepProgress, StickyBottom, TopBar } from "@/components/Layout";
import { QUESTIONS } from "@/lib/write-data";
import { useFlow } from "@/lib/write-store";

const N = QUESTIONS.length;

// Figma 05-W 슬롯 위치 (휠 높이 380 기준). offset = 가운데로부터의 거리
const SLOTS: Record<number, CSSProperties & { level: 0 | 1 | 2 }> = {
  [-2]: { level: 2, top: 12, height: 44, left: 36, right: 36, opacity: 0.6 },
  [-1]: { level: 1, top: 60, height: 60, left: 22, right: 22, opacity: 1 },
  0: { level: 0, top: 124, height: 112, left: 8, right: 8, opacity: 1 },
  1: { level: 1, top: 240, height: 60, left: 22, right: 22, opacity: 1 },
  2: { level: 2, top: 304, height: 44, left: 36, right: 36, opacity: 0.6 },
};

/** 가운데 기준 순환 거리 (-2 ~ 2) */
function offsetOf(i: number, selected: number) {
  let d = (i - selected) % N;
  if (d > N / 2) d -= N;
  if (d < -N / 2) d += N;
  return d;
}

export function QuestionScreen() {
  const router = useRouter();
  const { draft, updateDraft, saveDraftForLater } = useFlow();
  const selected = Math.max(0, QUESTIONS.findIndex((q) => q.id === draft.questionId));

  // 마지막 이동 칸 수. 한 바퀴 넘어가는 항목은 반대편으로 날아가지 않도록 애니메이션 없이 옮깁니다.
  const [lastDelta, setLastDelta] = useState(0);
  const offsets = QUESTIONS.map((_, i) => offsetOf(i, selected));
  const jumps = offsets.map((o, i) => Math.abs(o - offsetOf(i, selected - lastDelta)) > 2);

  const move = useCallback(
    (from: number, delta: number) => {
      if (!delta) return;
      setLastDelta(delta);
      updateDraft({ questionId: QUESTIONS[(((from + delta) % N) + N) % N].id });
    },
    [updateDraft],
  );

  // 휠 스크롤 · 스와이프 (preventDefault를 위해 passive: false로 직접 등록)
  const wheelRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef(selected);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    const el = wheelRef.current;
    if (!el) return;
    let acc = 0;
    let lock = 0;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const now = Date.now();
      if (now < lock) return;
      acc += e.deltaY;
      if (Math.abs(acc) > 30) {
        move(selectedRef.current, Math.sign(acc));
        acc = 0;
        lock = now + 180;
      }
    };
    let startY: number | null = null;
    const onTouchStart = (e: TouchEvent) => (startY = e.touches[0].clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (startY === null) return;
      e.preventDefault();
      const dy = e.touches[0].clientY - startY;
      if (Math.abs(dy) > 40) {
        move(selectedRef.current, -Math.sign(dy));
        startY = e.touches[0].clientY;
      }
    };
    const onTouchEnd = () => (startY = null);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [move]);

  return (
    <Screen className="pb-[140px]">
      <TopBar
        left={
          <IconButton
            icon="chevron-left"
            label="Back"
            onClick={() => {
              saveDraftForLater("question");
              router.push("/write");
            }}
          />
        }
        title="Pick a question"
      />
      <StepProgress step={2} />

      <div className="flex flex-col items-start gap-2 px-8 pt-3">
        <Chip tone="yellow" className="py-1.5 text-[12px]">
          <Icon name="sparkle" size={14} />
          AI picked {N} for your dish
        </Chip>
        <h2 className="font-display text-[28px] leading-[1.1] [text-wrap:balance]">
          What should Koreans tell you?
        </h2>
        <p className="text-[15px] leading-[1.4] text-muted">Scroll or tap to pick one.</p>
      </div>

      <div
        ref={wheelRef}
        role="listbox"
        aria-label="Questions"
        aria-activedescendant={`q-${QUESTIONS[selected].id}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            move(selected, 1);
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            move(selected, -1);
          }
        }}
        className="relative mt-4 h-[380px] w-full touch-none select-none outline-none [perspective:800px]"
      >
        {QUESTIONS.map((q, i) => {
          const off = offsets[i];
          const { level, ...slot } = SLOTS[off];
          const center = level === 0;
          return (
            <div
              key={q.id}
              id={`q-${q.id}`}
              role="option"
              aria-selected={center}
              onClick={() => move(selected, off)}
              style={{
                ...slot,
                transform: `rotateX(${off * -8}deg)`,
                transition: jumps[i] ? "none" : "all 320ms cubic-bezier(0.2, 0.8, 0.2, 1)",
                zIndex: 10 - Math.abs(off),
              }}
              className={`absolute flex cursor-pointer items-center overflow-hidden ${
                center
                  ? "gap-4 rounded-[32px] border-2 border-on-light bg-white px-5 shadow-[0_12px_32px_rgba(0,0,0,0.12)]"
                  : level === 1
                    ? "gap-3 rounded-[24px] bg-white/80 px-3.5"
                    : "gap-2.5 rounded-[18px] bg-white/60 px-2.5"
              }`}
            >
              <span
                className={`flex shrink-0 items-center justify-center rounded-full transition-all ${
                  center ? "size-14 bg-content" : level === 1 ? "size-9 bg-canvas-soft" : "size-7 bg-canvas-soft"
                }`}
              >
                <Icon name={q.icon} size={center ? 24 : level === 1 ? 16 : 13} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span
                  className={`truncate leading-[1.3] ${
                    center ? "text-[18px] font-bold" : level === 1 ? "text-[15px] font-semibold" : "text-[13px] font-medium"
                  }`}
                >
                  {q.label}
                </span>
                {center && <span className="text-[13px] leading-[1.4] text-muted">{q.hint}</span>}
              </span>
            </div>
          );
        })}
      </div>

      <StickyBottom fade="from-canvas via-canvas to-canvas">
        <ArrowCta
          caption="AI drafts your post from the photos"
          title="Write with AI"
          href="/write/writing"
        />
      </StickyBottom>
    </Screen>
  );
}
