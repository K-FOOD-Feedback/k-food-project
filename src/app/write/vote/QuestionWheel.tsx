"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Icon } from "@/components/Icon";
import { getQuestion, type QuestionId } from "@/lib/write-data";

/*
  질문 고르기 휠 (iOS 알람 시간 고르기처럼 위아래로 굴림) — 담당 송희
  - 가운데 줄(회색 띠)에 온 질문이 선택됨. 처음엔 AI 추천 1순위가 가운데 (끝없이 돎)
  - 끌기 · 던지기 · 마우스 휠 · 탭 · ↑↓ 키보드
  - 멈춰서 칸에 착 붙을 때만 onChange (굴리는 중엔 투표를 다시 만들지 않음)
*/
const ROW = 44; // 한 줄 높이
const VISIBLE = 5; // 보이는 줄 수 (가운데 1 + 위아래 2씩)

type Method = "drag" | "scroll" | "tap" | "keyboard";

export function QuestionWheel({
  items,
  value,
  onChange,
  disabled = false,
}: {
  items: QuestionId[];
  value: QuestionId;
  onChange: (id: QuestionId, method: Method) => void;
  disabled?: boolean;
}) {
  const n = items.length;
  // 끝없이 도는 휠 (iOS 알람 분처럼) — 칸 번호는 n으로 나눈 나머지
  const mod = (v: number) => ((Math.round(v) % n) + n) % n;
  /** 가운데(pos)로부터 i번 칸까지의 가장 가까운 거리 (위가 -, 아래가 +) */
  const offsetOf = (i: number, p: number) => {
    let d = (((i - p) % n) + n) % n;
    if (d >= n / 2) d -= n;
    return d;
  };
  const index = Math.max(0, items.indexOf(value));

  // pos는 연속값(굴리는 중 2.37 같은 값). 놓으면 가장 가까운 칸에 착 붙음
  const [pos, setPos] = useState(index);
  const [moving, setMoving] = useState(false);
  const posRef = useRef(pos);
  useEffect(() => {
    posRef.current = pos;
  }, [pos]);

  // 바깥에서 값이 바뀌면(처음 AI 추천 등) 그 칸으로 — 그리는 중에 맞춤 (React 권장 방식)
  const [prevIndex, setPrevIndex] = useState(index);
  if (index !== prevIndex) {
    setPrevIndex(index);
    if (!moving) setPos(Math.round(pos) + offsetOf(index, pos));
  }

  const snap = useCallback(
    (target: number, method: Method) => {
      const i = mod(target);
      setPos(Math.round(target));
      setMoving(false);
      if (items[i] !== value) onChange(items[i], method);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mod는 n에만 의존
    [items, value, onChange, n],
  );

  // 끌기 · 던지기
  const drag = useRef<{ y: number; pos: number; lastY: number; lastT: number; v: number; moved: boolean } | null>(null);
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // 캡처를 못 해도 굴리기는 동작함
    }
    drag.current = { y: e.clientY, pos: posRef.current, lastY: e.clientY, lastT: e.timeStamp, v: 0, moved: false };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dy = e.clientY - d.y;
    if (Math.abs(dy) > 4) d.moved = true;
    const dt = Math.max(1, e.timeStamp - d.lastT);
    d.v = (e.clientY - d.lastY) / dt;
    d.lastY = e.clientY;
    d.lastT = e.timeStamp;
    if (d.moved) {
      setMoving(true);
      setPos(d.pos - dy / ROW);
    }
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.moved) {
      const hit = (e.target as HTMLElement).closest<HTMLElement>("[data-qi]");
      if (hit) snap(posRef.current + offsetOf(Number(hit.dataset.qi), posRef.current), "tap");
      return;
    }
    const fling = Math.max(-3, Math.min(3, (-d.v * 180) / ROW));
    snap(posRef.current + fling, "drag");
  };

  // 마우스 휠 / 트랙패드
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el || disabled) return;
    let timer = 0;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const next = posRef.current + e.deltaY / (ROW * 1.5);
      posRef.current = next;
      setMoving(true);
      setPos(next);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => snap(posRef.current, "scroll"), 140);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      window.clearTimeout(timer);
    };
  }, [snap, disabled]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      snap(Math.round(posRef.current) + 1, "keyboard");
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      snap(Math.round(posRef.current) - 1, "keyboard");
    }
  };

  const height = ROW * VISIBLE;
  const selected = mod(pos);

  return (
    <div
      ref={box}
      role="listbox"
      aria-label="Question"
      aria-activedescendant={`qw-${items[selected]}`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        drag.current = null;
        snap(posRef.current, "drag");
      }}
      className={`relative touch-none select-none overflow-hidden outline-none [perspective:600px] ${disabled ? "opacity-60" : "cursor-grab"}`}
      style={{ height, maskImage: "linear-gradient(transparent, black 30%, black 70%, transparent)" }}
    >
      {/* 가운데 선택 띠 */}
      <div className="pointer-events-none absolute inset-x-0 rounded-[16px] bg-surface-2" style={{ top: (height - ROW) / 2, height: ROW }} />

      {items.map((id, i) => {
        const off = offsetOf(i, pos);
        if (Math.abs(off) > VISIBLE / 2 + 1) return null;
        const q = getQuestion(id);
        const on = i === selected;
        return (
          <div
            key={id}
            id={`qw-${id}`}
            role="option"
            aria-selected={on}
            data-qi={i}
            className={`absolute inset-x-0 flex items-center justify-center gap-2 px-4 ${moving ? "" : "transition-[transform,opacity] duration-300 ease-out"}`}
            style={{
              top: (height - ROW) / 2,
              height: ROW,
              transform: `translateY(${off * ROW}px) rotateX(${-off * 18}deg)`,
              opacity: Math.max(0, 1 - Math.abs(off) * 0.32),
            }}
          >
            <Icon name={q.icon} size={on ? 18 : 16} className={on ? "" : "text-neutral-400"} />
            <span
              className={`truncate ${on ? "text-[17px] font-bold text-on-dark" : "text-[15px] font-medium text-neutral-400"}`}
            >
              {q.label}
            </span>
            {i === 0 && (
              <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-content px-1.5 py-0.5 text-[10px] font-bold text-on-light">
                <Icon name="sparkle" size={10} />
                AI
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
