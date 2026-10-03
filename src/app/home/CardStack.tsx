"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { QUESTION_LABELS, participantsOf, type HomePost as Post } from "./mockPosts";

// 카드 크기·위치는 Figma(node 259:7795) 기준이고 가로 가운데 정렬입니다.
// 뒤에 깔린 카드들은 앞 카드를 회전·축소한 것이라, 모든 자리를 앞 카드의 transform으로 표현합니다.
const CARD = { left: 31.3, top: 31.61, width: 312.4, height: 438.578, radius: 34.808 };
const IMAGE = { width: 402.251, height: 280.106, dx: 0.89, dy: -60 };
const MASK = { x: 64.255, y: 1.914, width: 272.822, height: 271.214 };

type Pose = { x: number; y: number; rotate: number; scale: number; dim: number };
type Place = Pose & { z: number };

const FRONT: Pose = { x: 0, y: 0, rotate: 0, scale: 1, dim: 0 };
// 다음 카드들은 오른쪽 위로 살짝 보입니다.
const RIGHT: Pose[] = [
  { x: 19.3, y: 0.07, rotate: 2.89, scale: 0.9215, dim: 0.2 },
  { x: 34.57, y: 11.14, rotate: 4.45, scale: 0.8709, dim: 0.32 },
];
// 이미 본 카드(덱의 맨 아래)는 왼쪽 아래로 보입니다. 0번이 맨 마지막 카드라 가장 바깥에 있습니다.
const LEFT: Pose[] = [
  { x: -30, y: 20, rotate: 5.2, scale: 0.8709, dim: 0.32 },
  { x: -16, y: 9, rotate: 3.2, scale: 0.9215, dim: 0.2 },
];
const HIDDEN: Pose = { x: 0, y: 8, rotate: 0, scale: 0.85, dim: 0.32 };
// 카드가 덱 뒤로 들어가거나 뒤에서 나올 때 잠깐 비켜나는 자리
const ASIDE = "translate(-250px, 28px) rotate(-14deg) scale(0.96)";

const SWIPE_THRESHOLD = 70;
const TAP_TOLERANCE = 6;
const SWING_MS = 260;
const SETTLE_MS = 460;

// out → tuck: 앞 카드가 왼쪽으로 빠졌다가 덱 뒤로 들어감 (왼쪽 스와이프)
// emerge → land: 뒤 카드가 빠져나왔다가 맨 앞에 놓임 (오른쪽 스와이프)
type Phase = "out" | "tuck" | "emerge" | "land";

/** 맨 앞에서 rel번째 아래 카드가 n장 덱에서 놓이는 자리. 겹침 순서는 항상 덱 순서를 따릅니다. */
function placeOf(rel: number, n: number): Place {
  const z = n - rel + 1;
  if (rel === 0) return { ...FRONT, z };
  const rightCount = Math.min(RIGHT.length, Math.ceil((n - 1) / 2));
  const leftCount = Math.min(LEFT.length, Math.floor((n - 1) / 2));
  if (rel <= rightCount) return { ...RIGHT[rel - 1], z };
  const fromBack = n - 1 - rel;
  if (fromBack < leftCount) return { ...LEFT[fromBack], z };
  return { ...HIDDEN, z };
}

const toTransform = (p: Pose) => `translate(${p.x}px, ${p.y}px) rotate(${p.rotate}deg) scale(${p.scale})`;

export function CardStack({
  posts,
  index,
  votedIds,
  onIndexChange,
  onOpen,
}: {
  posts: Post[];
  index: number;
  /** 내가 이미 투표한 게시글 */
  votedIds: Set<string>;
  onIndexChange: (index: number) => void;
  onOpen: (post: Post) => void;
}) {
  const n = posts.length;
  const [dragX, setDragX] = useState<number | null>(null);
  const [phases, setPhases] = useState<Record<string, Phase>>({});
  const start = useRef<{ x: number; y: number; id: number; horizontal: boolean | null } | null>(null);
  const moved = useRef(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const setPhase = (id: string, phase: Phase | null) =>
    setPhases((prev) => {
      const next = { ...prev };
      if (phase) next[id] = phase;
      else delete next[id];
      return next;
    });

  const relOf = (i: number) => (((i - index) % n) + n) % n;

  const goNext = () => {
    if (n < 2) return;
    const id = posts[index].id;
    setPhase(id, "out");
    onIndexChange((index + 1) % n);
    later(SWING_MS, () => setPhase(id, "tuck"));
    later(SWING_MS + SETTLE_MS, () => setPhase(id, null));
  };

  const goPrev = () => {
    if (n < 2) return;
    const prevIndex = (index - 1 + n) % n;
    const id = posts[prevIndex].id;
    setPhase(id, "emerge");
    later(SWING_MS, () => {
      setPhase(id, "land");
      onIndexChange(prevIndex);
    });
    later(SWING_MS + SETTLE_MS, () => setPhase(id, null));
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId, horizontal: null };
    moved.current = false;
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (s.horizontal === null && Math.hypot(dx, dy) > TAP_TOLERANCE) {
      s.horizontal = Math.abs(dx) > Math.abs(dy);
      moved.current = true;
      if (s.horizontal) e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (s.horizontal) setDragX(dx);
  };

  const onPointerEnd = () => {
    const dx = dragX ?? 0;
    start.current = null;
    setDragX(null);
    if (dx <= -SWIPE_THRESHOLD) goNext();
    else if (dx >= SWIPE_THRESHOLD) goPrev();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") goNext();
    if (e.key === "ArrowLeft") goPrev();
  };

  const styleFor = (rel: number, phase: Phase | undefined): CSSProperties => {
    const place = placeOf(rel, n);
    const top = n + 5;
    switch (phase) {
      case "out":
        return { transform: ASIDE, zIndex: top, transition: `transform ${SWING_MS}ms ease-out` };
      case "tuck":
        return { transform: toTransform(place), zIndex: place.z };
      case "emerge":
        return { transform: ASIDE, zIndex: place.z, transition: `transform ${SWING_MS}ms ease-out` };
      case "land":
        return { transform: toTransform(FRONT), zIndex: top };
    }

    const zIndex = place.z;
    if (dragX !== null) {
      // 앞 카드는 손가락을 따라 왼쪽으로 움직입니다.
      if (rel === 0 && dragX < 0) {
        return { transform: `translate(${dragX}px, 0) rotate(${dragX / 18}deg)`, zIndex, transition: "none" };
      }
      // 오른쪽으로 끌면 맨 뒤 카드가 왼쪽 아래에서 빠져나옵니다.
      if (rel === n - 1 && dragX > 0 && n > 1) {
        const p = Math.min(dragX / 200, 1);
        return {
          transform: `translate(${place.x - 110 * p}px, ${place.y + 8 * p}px) rotate(${place.rotate - 12 * p}deg) scale(${place.scale + 0.04 * p})`,
          zIndex,
          transition: "none",
        };
      }
      if (rel === 0 && dragX > 0) {
        return { transform: `translate(${dragX * 0.15}px, 0) rotate(${dragX / 60}deg)`, zIndex, transition: "none" };
      }
    }
    return { transform: toTransform(place), zIndex };
  };

  return (
    <div
      className="relative mx-auto h-[480px] w-[375px] touch-pan-y select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onKeyDown={onKeyDown}
      role="region"
      aria-roledescription="carousel"
      aria-label="K-food 콘텐츠"
    >
      {posts.map((post, i) => {
        const rel = relOf(i);
        const phase = phases[post.id];
        const isFront = rel === 0 && !phase;
        const dim = phase === "out" || phase === "land" ? 0 : placeOf(rel, n).dim;
        return (
          <button
            key={post.id}
            type="button"
            className="absolute block origin-center overflow-hidden text-left transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform [-webkit-touch-callout:none] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-white"
            style={{
              left: CARD.left,
              top: CARD.top,
              width: CARD.width,
              height: CARD.height,
              borderRadius: CARD.radius,
              background: post.color,
              ...styleFor(rel, phase),
            }}
            tabIndex={isFront ? 0 : -1}
            aria-hidden={!isFront}
            aria-label={`${post.title} (${i + 1}/${n})`}
            onClick={() => {
              if (isFront && !moved.current) onOpen(post);
            }}
          >
            <CardContent post={post} voted={votedIds.has(post.id)} />
            <span
              className="pointer-events-none absolute inset-0 bg-black/32 transition-opacity duration-[420ms]"
              style={{ opacity: dim / 0.32 }}
            />
          </button>
        );
      })}
    </div>
  );
}

/** 카드 한 장 (Figma: KF/Feed Card) */
function CardContent({ post, voted }: { post: Post; voted: boolean }) {
  const photo = post.cardPhoto;
  const mask = 'url("/images/card-mask.svg")';
  return (
    <>
      {photo && (
        <span
          className="absolute -translate-x-1/2 -translate-y-1/2 [mask-repeat:no-repeat]"
          style={{
            width: IMAGE.width,
            height: IMAGE.height,
            left: `calc(50% + ${IMAGE.dx}px)`,
            top: `calc(50% + ${IMAGE.dy}px)`,
            maskImage: mask,
            WebkitMaskImage: mask,
            maskPosition: `${MASK.x}px ${MASK.y}px`,
            WebkitMaskPosition: `${MASK.x}px ${MASK.y}px`,
            maskSize: `${MASK.width}px ${MASK.height}px`,
            WebkitMaskSize: `${MASK.width}px ${MASK.height}px`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- 업로드한 사진(blob/외부 URL)도 그대로 보여 줘야 해서 img 사용 */}
          <img src={photo} alt="" draggable={false} className="pointer-events-none size-full object-cover" />
        </span>
      )}

      {/* 참여 인원 스티커 */}
      <span className="absolute top-[14px] right-[14px] flex size-[68px] rotate-12 flex-col items-center justify-center gap-0.5 rounded-full bg-background text-white shadow-[0_4px_12px_rgba(0,0,0,0.18)]">
        <span className="text-[20px] leading-none font-extrabold tracking-[-0.4px]">{participantsOf(post)}</span>
        <span className="text-[11px] leading-none font-semibold">명 참여</span>
      </span>

      <span className="absolute right-5 bottom-5 left-5 flex flex-col items-start gap-2 text-black">
        <span className="flex max-w-full gap-1">
          {voted && (
            <span className="shrink-0 rounded-full bg-background px-2.5 py-[5px] text-[12px] leading-[1.2] font-semibold whitespace-nowrap text-white">
              ✓ 투표 완료
            </span>
          )}
          <span className="max-w-full min-w-0 truncate rounded-full bg-black/8 px-2.5 py-[5px] text-[12px] leading-[1.2] font-semibold">
            {QUESTION_LABELS[post.question.id]}
          </span>
        </span>
        <span className="line-clamp-2 w-full text-[23px] leading-[1.18] font-extrabold tracking-[-0.69px] break-keep text-balance">
          {post.title}
        </span>
        <span className="flex w-full items-center justify-between text-[13px] font-semibold text-black/60">
          <span className="flex min-w-0 items-center gap-[5px] truncate">
            <span className="text-[15px]">{post.author.flag}</span>
            {post.author.country}의 {post.author.name}
          </span>
          <span className="shrink-0">💬 {post.commentCount}</span>
        </span>
      </span>
    </>
  );
}
