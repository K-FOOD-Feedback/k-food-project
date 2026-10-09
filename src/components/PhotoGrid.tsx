"use client";

import Image from "next/image";
import { useRef, useState, type PointerEvent } from "react";
import type { Photo } from "@/lib/write-data";
import { Icon } from "./Icon";

/** next/image 래퍼 — 사용자가 올린 blob: 사진은 최적화 없이 그대로 보여 줍니다. */
export function PhotoImage({
  src,
  sizes,
  priority,
  className = "object-cover",
}: {
  src: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      src={src}
      alt=""
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={src.startsWith("blob:")}
      className={className}
    />
  );
}

/** 이만큼 움직이면 바로 끌기 시작 (길게 누를 필요 없음) */
const DRAG_START_PX = 6;

type Drag = { from: number; over: number; dx: number; dy: number };

/**
 * 썸네일 그리드: 끌어서 순서 변경(바로), × = 삭제.
 * 맨 앞 사진이 대표(Cover) — 따로 고르지 않고 맨 앞으로 옮기면 대표가 됨.
 */
export function PhotoGrid({
  photos,
  onRemove,
  onMove,
  onAdd,
  addLocked = false,
  canRemove = true,
  onLockedTap,
}: {
  photos: Photo[];
  onRemove: (id: string) => void;
  onMove: (from: number, to: number) => void;
  onAdd?: () => void;
  addLocked?: boolean;
  canRemove?: boolean;
  /** 잠긴 Add 타일을 눌렀을 때 */
  onLockedTap?: () => void;
}) {
  const [shakeKey, setShakeKey] = useState(0);
  const [drag, setDrag] = useState<Drag | null>(null);
  const press = useRef<{ index: number; x: number; y: number; active: boolean } | null>(null);

  const onPointerDown = (index: number) => (e: PointerEvent<HTMLButtonElement>) => {
    press.current = { index, x: e.clientX, y: e.clientY, active: false };
    try {
      e.currentTarget.setPointerCapture(e.pointerId); // 손가락이 칸 밖으로 나가도 계속 따라가게
    } catch {
      // 캡처를 못 해도 끌기는 동작함
    }
  };

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const p = press.current;
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (!p.active) {
      if (Math.hypot(dx, dy) < DRAG_START_PX) return;
      p.active = true; // 조금만 움직여도 바로 끌기 시작
      navigator.vibrate?.(8);
    }
    const hit = document
      .elementsFromPoint(e.clientX, e.clientY)
      .find((el) => el instanceof HTMLElement && el.dataset.thumbIndex !== undefined) as
      | HTMLElement
      | undefined;
    const over = hit ? Number(hit.dataset.thumbIndex) : p.index;
    setDrag({ from: p.index, over, dx, dy });
  };

  const onPointerUp = () => {
    if (press.current?.active && drag && drag.over !== drag.from) onMove(drag.from, drag.over);
    press.current = null;
    setDrag(null);
  };

  const onPointerCancel = () => {
    press.current = null;
    setDrag(null);
  };

  return (
    <ul className="grid grid-cols-4 gap-2">
      {photos.map((photo, i) => {
        const isCover = i === 0;
        const dragging = drag?.from === i;
        const isTarget = drag && drag.over === i && drag.from !== i;
        return (
          <li
            key={photo.id}
            data-thumb-index={i}
            className={`relative aspect-square animate-pop ${isTarget ? "rounded-[20px] ring-2 ring-secondary ring-offset-2 ring-offset-surface" : ""}`}
          >
            <button
              type="button"
              aria-label={`Photo ${i + 1}${isCover ? " (cover)" : ""}. Drag to reorder`}
              onPointerDown={onPointerDown(i)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
              onContextMenu={(e) => e.preventDefault()}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft" && i > 0) onMove(i, i - 1);
                if (e.key === "ArrowRight" && i < photos.length - 1) onMove(i, i + 1);
              }}
              style={
                dragging
                  ? { transform: `translate(${drag.dx}px, ${drag.dy}px) scale(1.06)`, zIndex: 10 }
                  : undefined
              }
              className={`absolute inset-0 touch-none select-none overflow-hidden rounded-[20px] bg-surface-2 [-webkit-touch-callout:none] ${
                dragging ? "shadow-[0_12px_24px_rgba(0,0,0,0.2)]" : "transition-transform"
              } ${isCover ? "border-[3px] border-on-dark" : ""}`}
            >
              <PhotoImage src={photo.src} sizes="72px" className="pointer-events-none object-cover" />
              {/* 대표 사진 표시 — 썸네일 아래쪽 안에 꽉 찬 띠 */}
              {isCover && (
                <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/80 py-1 text-center text-[11px] font-bold leading-[1.3] text-white">
                  Cover
                </span>
              )}
            </button>
            {!dragging && (
              <button
                type="button"
                aria-label={`Remove photo ${i + 1}`}
                disabled={!canRemove}
                onClick={() => onRemove(photo.id)}
                className="absolute -right-1.5 -top-1.5 z-[5] flex size-6 items-center justify-center rounded-full border-2 border-white bg-background text-white disabled:opacity-30"
              >
                <Icon name="x" size={12} strokeWidth={3} />
              </button>
            )}
          </li>
        );
      })}
      {onAdd && !addLocked && (
        <li className="aspect-square">
          <button
            type="button"
            onClick={onAdd}
            className="flex size-full flex-col items-center justify-center gap-0.5 rounded-[20px] border-[1.5px] border-dashed border-on-dark bg-surface-2"
          >
            <Icon name="plus" size={20} />
            <span className="text-[12px] font-medium leading-[1.2] text-muted">Add</span>
          </button>
        </li>
      )}
      {addLocked && (
        <li className="aspect-square">
          <button
            key={shakeKey}
            type="button"
            aria-label="Adding photos is locked"
            onClick={() => {
              setShakeKey((k) => k + 1);
              onLockedTap?.();
            }}
            className={`flex size-full flex-col items-center justify-center gap-0.5 rounded-[20px] border-[1.5px] border-dashed border-disabled bg-surface-2 opacity-50 ${
              shakeKey ? "animate-shake" : ""
            }`}
          >
            <Icon name="lock" size={20} />
            <span className="text-[12px] font-medium leading-[1.2] text-muted">Locked</span>
          </button>
        </li>
      )}
    </ul>
  );
}
