"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowCta, IconButton } from "@/components/Buttons";
import { Icon } from "@/components/Icon";
import { Chip, Screen, StepProgress, StickyBottom, TopBar } from "@/components/Layout";
import { QUESTIONS } from "@/lib/write-data";
import { track } from "@/lib/analytics";
import { useFlow } from "@/lib/write-store";

const N = QUESTIONS.length;
const STEP_PX = 90; // 손가락을 이만큼 움직이면 한 칸 이동

/*
  Figma 05-W 슬롯 (휠 높이 380 기준). index = 가운데로부터의 거리 + 3
  -3, +3은 화면 밖으로 사라지는 자리 (드래그 중 부드럽게 들어오고 나가도록)
*/
const KEYS = {
  top: [-36, 12, 60, 124, 240, 304, 352],
  height: [44, 44, 60, 112, 60, 44, 44],
  inset: [50, 36, 22, 8, 22, 36, 50],
  opacity: [0, 0.6, 1, 1, 1, 0.6, 0],
};

function lerpKey(arr: number[], off: number) {
  const x = Math.min(3, Math.max(-3, off)) + 3;
  const i = Math.min(5, Math.floor(x));
  const t = x - i;
  return arr[i] + (arr[i + 1] - arr[i]) * t;
}

/** 가운데 기준 순환 거리 (-2.5 ~ 2.5, 소수 가능) */
function offsetOf(i: number, pos: number) {
  let d = (((i - pos) % N) + N) % N;
  if (d >= N / 2) d -= N;
  return d;
}

const mod = (n: number) => ((Math.round(n) % N) + N) % N;

type Wheel = { pos: number; prev: number; dragging: boolean };

export function QuestionScreen() {
  const router = useRouter();
  const { draft, updateDraft, saveDraftForLater } = useFlow();
  const initial = Math.max(0, QUESTIONS.findIndex((q) => q.id === draft.questionId));

  // pos는 연속값(드래그 중 2.37 같은 값). 놓으면 가장 가까운 정수로 착 붙음
  const [wheel, setWheel] = useState<Wheel>({ pos: initial, prev: initial, dragging: false });
  const selected = mod(wheel.pos);

  // 분석용: 들어올 때 주제, 바꾼 횟수
  const [enteredWith] = useState(draft.questionId);
  const changes = useRef(0);
  const currentId = useRef(draft.questionId);

  const snapTo = useCallback(
    (target: number, method: "drag" | "scroll" | "tap" | "keyboard") => {
      setWheel((w) => ({ pos: target, prev: w.pos, dragging: false }));
      const next = QUESTIONS[mod(target)].id;
      if (next !== currentId.current) {
        changes.current += 1;
        track("topic_changed", { from_topic: currentId.current, to_topic: next, method });
        currentId.current = next;
      }
      updateDraft({ questionId: next });
    },
    [updateDraft],
  );

  // 드래그 (마우스·터치 공통)
  const drag = useRef<{ y: number; pos: number; lastY: number; lastT: number; v: number; moved: boolean } | null>(
    null,
  );
  const posRef = useRef(wheel.pos);
  useEffect(() => {
    posRef.current = wheel.pos;
  }, [wheel.pos]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y: e.clientY, pos: wheel.pos, lastY: e.clientY, lastT: e.timeStamp, v: 0, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dy = e.clientY - d.y;
    if (Math.abs(dy) > 6) d.moved = true;
    const dt = Math.max(1, e.timeStamp - d.lastT);
    d.v = (e.clientY - d.lastY) / dt; // px/ms
    d.lastY = e.clientY;
    d.lastT = e.timeStamp;
    if (d.moved) setWheel((w) => ({ pos: d.pos - dy / STEP_PX, prev: w.pos, dragging: true }));
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.moved) {
      // 탭: 누른 항목을 가운데로
      const hit = (e.target as HTMLElement).closest<HTMLElement>("[data-qi]");
      if (hit) {
        const off = offsetOf(Number(hit.dataset.qi), wheel.pos);
        snapTo(Math.round(wheel.pos + off), "tap");
      }
      return;
    }
    // 던진 속도만큼 조금 더 굴러간 뒤 가장 가까운 칸에 멈춤
    const fling = Math.max(-2, Math.min(2, (-d.v * 160) / STEP_PX));
    snapTo(Math.round(wheel.pos + fling), "drag");
  };

  // 마우스 휠 / 트랙패드
  const wheelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = wheelRef.current;
    if (!el) return;
    let timer = 0;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const next = posRef.current + e.deltaY / (STEP_PX * 1.6);
      posRef.current = next;
      setWheel((w) => ({ pos: next, prev: w.pos, dragging: true }));
      window.clearTimeout(timer);
      timer = window.setTimeout(() => snapTo(Math.round(posRef.current), "scroll"), 140);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      window.clearTimeout(timer);
    };
  }, [snapTo]);

  return (
    <Screen className="pb-[140px]">
      <TopBar
        left={
          <IconButton
            icon="chevron-left"
            label="Back"
            onClick={() => {
              saveDraftForLater("question");
              track("draft_saved", { step: "topic" });
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
          AI sorted these for your dish
        </Chip>
        <h2 className="font-display text-[28px] leading-[1.1] [text-wrap:balance]">
          What should Koreans tell you?
        </h2>
        <p className="text-[15px] leading-[1.4] text-muted">Drag, scroll or tap to pick one.</p>
      </div>

      <div
        ref={wheelRef}
        role="listbox"
        aria-label="Questions"
        aria-activedescendant={`q-${QUESTIONS[selected].id}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            snapTo(Math.round(wheel.pos) + (e.key === "ArrowDown" ? 1 : -1), "keyboard");
          }
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative mt-4 h-[380px] w-full cursor-grab touch-none select-none overflow-hidden outline-none active:cursor-grabbing [perspective:800px]"
      >
        {QUESTIONS.map((q, i) => {
          const off = offsetOf(i, wheel.pos);
          const prevOff = offsetOf(i, wheel.prev);
          const wrapped = Math.abs(off - prevOff) > N / 2; // 위↔아래로 넘어가는 순간은 순간이동
          const dist = Math.abs(off);
          const level = dist < 0.5 ? 0 : dist < 1.5 ? 1 : 2;
          const center = level === 0;
          const inset = lerpKey(KEYS.inset, off);
          return (
            <div
              key={q.id}
              id={`q-${q.id}`}
              data-qi={i}
              role="option"
              aria-selected={i === selected}
              style={{
                top: lerpKey(KEYS.top, off),
                height: lerpKey(KEYS.height, off),
                left: inset,
                right: inset,
                opacity: lerpKey(KEYS.opacity, off),
                transform: `rotateX(${off * -8}deg)`,
                zIndex: 10 - Math.round(dist),
                transition:
                  wrapped || wheel.dragging
                    ? "background-color 150ms, border-color 150ms"
                    : "all 360ms cubic-bezier(0.2, 0.9, 0.25, 1.15)",
              }}
              className={`absolute flex items-center overflow-hidden border-2 ${
                center
                  ? "gap-4 rounded-[32px] border-on-dark bg-surface px-5 shadow-[0_12px_32px_rgba(0,0,0,0.4)]"
                  : level === 1
                    ? "gap-3 rounded-[24px] border-transparent bg-surface/80 px-3.5"
                    : "gap-2.5 rounded-[18px] border-transparent bg-surface/60 px-2.5"
              }`}
            >
              <span
                key={center ? `${q.id}-center` : q.id}
                className={`flex shrink-0 items-center justify-center rounded-full ${
                  center ? "size-14 animate-pop bg-content text-on-light" : level === 1 ? "size-9 bg-surface-2" : "size-7 bg-surface-2"
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
                {center && <span className="truncate text-[13px] leading-[1.4] text-muted">{q.hint}</span>}
              </span>
            </div>
          );
        })}
      </div>

      <StickyBottom>
        {draft.title ? (
          // 이미 글을 써 둔 상태에서 주제만 바꾸러 온 경우: 글은 그대로 두고 투표로 돌아감
          <ArrowCta
            caption="Your post stays the same"
            title="Back to the vote"
            href="/write/vote"
            onClick={() =>
              track("topic_reselected", {
                from_topic: enteredWith,
                to_topic: draft.questionId,
                changed: enteredWith !== draft.questionId,
              })
            }
          />
        ) : (
          <ArrowCta
            caption="AI drafts your post from the photos"
            title="Write with AI"
            href="/write/writing"
            onClick={() =>
              track("topic_selected", {
                topic: draft.questionId,
                is_ai_top_pick: draft.questionId === QUESTIONS[0].id,
                changes: changes.current,
              })
            }
          />
        )}
      </StickyBottom>
    </Screen>
  );
}
