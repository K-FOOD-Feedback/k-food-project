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

const LONG_PRESS_MS = 250;

type Drag = { from: number; over: number; dx: number; dy: number };

/**
 * 썸네일 그리드: 탭 = 대표 사진, 길게 눌러 끌기 = 순서 변경, × = 삭제.
 */
export function PhotoGrid({
  photos,
  coverId,
  onCover,
  onRemove,
  onMove,
  onAdd,
  addLocked = false,
  canRemove = true,
  coverChip = false,
  onLockedTap,
}: {
  photos: Photo[];
  coverId: string | null;
  onCover: (id: string) => void;
  onRemove: (id: string) => void;
  onMove: (from: number, to: number) => void;
  onAdd?: () => void;
  addLocked?: boolean;
  canRemove?: boolean;
  /** 대표 사진 썸네일 위에 "Cover" 칩 표시 (07 Review) */
  coverChip?: boolean;
  /** 잠긴 Add 타일을 눌렀을 때 */
  onLockedTap?: () => void;
}) {
  const [shakeKey, setShakeKey] = useState(0);
  const [drag, setDrag] = useState<Drag | null>(null);
  const press = useRef<{ index: number; x: number; y: number; timer: number; active: boolean } | null>(
    null,
  );

  const clearPress = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
  };

  const onPointerDown = (index: number) => (e: PointerEvent<HTMLButtonElement>) => {
    const el = e.currentTarget;
    const pointerId = e.pointerId;
    const start = { x: e.clientX, y: e.clientY };
    clearPress();
    press.current = {
      index,
      ...start,
      active: false,
      timer: window.setTimeout(() => {
        if (!press.current) return;
        press.current.active = true;
        el.setPointerCapture(pointerId);
        navigator.vibrate?.(10); // 들렸다는 느낌 (지원하는 폰만)
        setDrag({ from: index, over: index, dx: 0, dy: 0 });
      }, LONG_PRESS_MS),
    };
  };

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const p = press.current;
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (!p.active) {
      // 길게 누르기 전에 움직이면 스크롤로 보고 취소
      if (Math.hypot(dx, dy) > 12) clearPress();
      return;
    }
    const hit = document
      .elementsFromPoint(e.clientX, e.clientY)
      .find((el) => el instanceof HTMLElement && el.dataset.thumbIndex !== undefined) as
      | HTMLElement
      | undefined;
    const over = hit ? Number(hit.dataset.thumbIndex) : p.index;
    setDrag({ from: p.index, over, dx, dy });
  };

  const onPointerUp = (id: string) => () => {
    const p = press.current;
    if (p?.active && drag) {
      if (drag.over !== drag.from) onMove(drag.from, drag.over);
    } else if (p) {
      onCover(id);
    }
    clearPress();
    setDrag(null);
  };

  const onPointerCancel = () => {
    clearPress();
    setDrag(null);
  };

  return (
    <ul className="grid grid-cols-4 gap-2">
      {photos.map((photo, i) => {
        const isCover = photo.id === coverId;
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
              aria-label={`Photo ${i + 1}${isCover ? " (cover)" : ""}. Tap to make it the cover`}
              aria-pressed={isCover}
              onPointerDown={onPointerDown(i)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp(photo.id)}
              onPointerCancel={onPointerCancel}
              onContextMenu={(e) => e.preventDefault()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onCover(photo.id);
                }
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
            </button>
            {coverChip && isCover && !dragging && (
              <span className="pointer-events-none absolute -left-px top-[21px] z-[5] flex items-center gap-1.5 rounded-full bg-surface px-3 py-[7px] text-[13px] font-semibold leading-[1.3]">
                <Icon name="check" size={14} strokeWidth={2.5} />
                Cover
              </span>
            )}
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
