"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { track } from "@/lib/analytics";
import { cardShapeAt, type CardShape } from "./cardShapes";
import { participantsOf, type HomePost as Post } from "./mockPosts";

/** 화면·글 언어 (버전과 별개 — 버전은 한국인 /home · 외국인 /home?lang=en 로 정해지고, 언어는 지구본으로 바꿈) */
export type Lang = "ko" | "en";

// 카드 크기·위치는 Figma(node 259:7795) 기준이고 가로 가운데 정렬입니다.
// 뒤에 깔린 카드들은 앞 카드를 회전·축소한 것이라, 모든 자리를 앞 카드의 transform으로 표현합니다.
// 투표 주제 칩을 빼면서 사진~제목 사이가 비지 않게 카드 높이를 24px 줄임 (Figma 438.578). 사진은 위에서 같은 자리에 두려고 dy를 절반만큼 내림
const CARD = {
  left: 31.3,
  top: 31.61,
  width: 312.4,
  height: 414.578,
  radius: 34.808,
};
const IMAGE = { width: 402.251, height: 280.106, dx: 0.89, dy: -48 };
const MASK = { x: 64.255, y: 1.914, width: 272.822, height: 271.214 };
/** 사진 요소 안에서 모양 사진이 보이는 영역 (상세 화면 전환에서 사진의 출발 위치로 씀).
    모양 크기(scale)를 반영 — 사진 요소와 모양이 같은 가운데를 두고 함께 커지거나 작아짐 */
/** 메인 카드 사진 = 상세 첫 사진 (상세에서 돌아올 때 같은 사진이 그대로 이어지게) */
export const cardPhotoOf = (post: Post) => post.photos[0] ?? post.cardPhoto;

export const cardMaskBox = (scale: number) => ({
  left: MASK.x * scale,
  top: MASK.y * scale,
  width: MASK.width * scale,
  height: MASK.height * scale,
});
/** 물결 영역을 기준(1 = 물결 영역 크기)으로 본 카드 사진의 위치·크기 — 전환 유령이 카드와 똑같이 사진을 보여 줄 때 씀 */
/** 카드 더미 틀 위끝에서 맨 앞 카드 위끝까지 거리 (틀 위로 뒤 카드가 비져 나올 자리) */
export const CARD_TOP = CARD.top;
/** 맨 앞 카드 폭 */
export const CARD_WIDTH = CARD.width;
/** 카드 더미 틀 위끝에서 맨 앞 카드 아래끝까지 거리 */
export const CARD_BOTTOM = CARD.top + CARD.height;
export const CARD_PHOTO_IN_MASK = {
  left: -MASK.x / MASK.width,
  top: -MASK.y / MASK.height,
  width: IMAGE.width / MASK.width,
  height: IMAGE.height / MASK.height,
};

type Pose = {
  x: number;
  y: number;
  rotate: number;
  scale: number;
  dim: number;
};
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

/** 카드 더미(앞 카드 + 양옆으로 비져 나온 뒤 카드들)의 가운데에서 가장 먼 좌우 끝까지 거리 — 화면 폭 안에 다 들어가게 크기를 정할 때 씀 */
export const DECK_HALF_WIDTH = Math.max(
  ...[FRONT, ...RIGHT, ...LEFT].map((p) => {
    const r = (p.rotate * Math.PI) / 180;
    const halfW = (CARD.width / 2) * p.scale;
    const halfH = (CARD.height / 2) * p.scale;
    return Math.abs(p.x) + halfW * Math.cos(r) + halfH * Math.sin(Math.abs(r));
  }),
);
// 카드가 덱 뒤로 들어가거나 뒤에서 나올 때 잠깐 비켜나는 자리
const ASIDE = "translate(-250px, 28px) rotate(-14deg) scale(0.96)";

// 이만큼 끌거나, 짧아도 빠르게 튕기면(FLICK) 넘어갑니다.
const SWIPE_THRESHOLD = 36;
const FLICK_MIN = 14;
const FLICK_VELOCITY = 0.35; // px/ms
const TAP_TOLERANCE = 6;
const SWING_MS = 260;
const SETTLE_MS = 460;
// 이전 카드: 손을 뗀 자리에서 멈추지 않고 바로 맨 앞으로 (빠르게 출발해 감속)
const PREV_MS = 420;
const PREV_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
// 오른쪽으로 끌 때 맨 뒤 카드가 왼쪽으로 빠져나오는 정도 (이만큼 끌면 다 나옴)
const PREV_PULL = 140;

// out → tuck: 앞 카드가 왼쪽으로 빠졌다가 덱 뒤로 들어감 (왼쪽 스와이프)
// land: 끌어낸 뒤 카드가 그 자리에서 곧장 맨 앞에 놓임 (오른쪽 스와이프)
type Phase = "out" | "tuck" | "land";

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

const toTransform = (p: Pose) =>
  `translate(${p.x}px, ${p.y}px) rotate(${p.rotate}deg) scale(${p.scale})`;

export function CardStack({
  lang = "ko",
  contentLang = lang,
  viewer = "korean",
  posts,
  index,
  votedIds,
  onIndexChange,
  onOpen,
}: {
  /** 화면 문구 언어 (참여·투표 완료 등) */
  lang?: Lang;
  /** 글(제목) 언어 — 자동 번역이 켜져 있으면 화면 언어, 꺼져 있으면 원문 */
  contentLang?: Lang;
  /** 버전 (분석용) */
  viewer?: "korean" | "foreigner";
  posts: Post[];
  index: number;
  /** 내가 이미 투표한 게시글 */
  votedIds: Set<string>;
  onIndexChange: (index: number) => void;
  /** cardEl: 누른 카드 요소 (상세 화면 전환의 출발 위치를 재는 데 씀) */
  onOpen: (post: Post, cardEl: HTMLElement) => void;
}) {
  const n = posts.length;
  const [dragX, setDragX] = useState<number | null>(null);
  const [phases, setPhases] = useState<Record<string, Phase>>({});
  const start = useRef<{
    x: number;
    y: number;
    id: number;
    horizontal: boolean | null;
  } | null>(null);
  // 손을 뗄 때의 속도를 재기 위한 최근 위치
  const lastMove = useRef<{ x: number; t: number; v: number }>({
    x: 0,
    t: 0,
    v: 0,
  });
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
    track("card_swiped", {
      direction: "next",
      post_id: id,
      position: index,
      viewer,
    });
    setPhase(id, "out");
    onIndexChange((index + 1) % n);
    later(SWING_MS, () => setPhase(id, "tuck"));
    later(SWING_MS + SETTLE_MS, () => setPhase(id, null));
  };

  const goPrev = () => {
    if (n < 2) return;
    const prevIndex = (index - 1 + n) % n;
    track("card_swiped", {
      direction: "prev",
      post_id: posts[index].id,
      position: index,
      viewer,
    });
    const id = posts[prevIndex].id;
    // 끌던 자리(또는 덱 뒤 자리)에서 바로 맨 앞으로 — 중간에 멈추는 단계 없이 한 번에 이어집니다.
    setPhase(id, "land");
    onIndexChange(prevIndex);
    later(PREV_MS, () => setPhase(id, null));
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    start.current = {
      x: e.clientX,
      y: e.clientY,
      id: e.pointerId,
      horizontal: null,
    };
    lastMove.current = { x: e.clientX, t: e.timeStamp, v: 0 };
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
    const last = lastMove.current;
    const dt = e.timeStamp - last.t;
    if (dt > 0)
      lastMove.current = {
        x: e.clientX,
        t: e.timeStamp,
        v: (e.clientX - last.x) / dt,
      };
  };

  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    const dx = dragX ?? 0;
    // 손을 떼기 직전 잠깐 멈췄으면 튕긴 것으로 보지 않음
    const v = e.timeStamp - lastMove.current.t < 80 ? lastMove.current.v : 0;
    start.current = null;
    setDragX(null);
    const flick =
      Math.abs(dx) >= FLICK_MIN &&
      Math.abs(v) >= FLICK_VELOCITY &&
      Math.sign(v) === Math.sign(dx);
    if (dx <= -SWIPE_THRESHOLD || (flick && dx < 0)) goNext();
    else if (dx >= SWIPE_THRESHOLD || (flick && dx > 0)) goPrev();
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
        return {
          transform: ASIDE,
          zIndex: top,
          transition: `transform ${SWING_MS}ms ease-out`,
        };
      case "tuck":
        return { transform: toTransform(place), zIndex: place.z };
      case "land":
        return {
          transform: toTransform(FRONT),
          zIndex: top,
          transition: `transform ${PREV_MS}ms ${PREV_EASE}`,
        };
    }

    const zIndex = place.z;
    if (dragX !== null) {
      // 앞 카드는 손가락을 따라 왼쪽으로 움직입니다.
      if (rel === 0 && dragX < 0) {
        return {
          transform: `translate(${dragX}px, 0) rotate(${dragX / 18}deg)`,
          zIndex,
          transition: "none",
        };
      }
      // 오른쪽으로 끌면 맨 뒤 카드가 왼쪽 아래에서 빠져나옵니다.
      if (rel === n - 1 && dragX > 0 && n > 1) {
        const p = Math.min(dragX / PREV_PULL, 1);
        return {
          transform: `translate(${place.x - 150 * p}px, ${place.y + 6 * p}px) rotate(${place.rotate - 12 * p}deg) scale(${place.scale + 0.06 * p})`,
          zIndex,
          transition: "none",
        };
      }
      if (rel === 0 && dragX > 0) {
        return {
          transform: `translate(${dragX * 0.15}px, 0) rotate(${dragX / 60}deg)`,
          zIndex,
          transition: "none",
        };
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
      aria-label={lang === "en" ? "K-food posts" : "K-food 콘텐츠"}
    >
      {posts.map((post, i) => {
        const rel = relOf(i);
        const phase = phases[post.id];
        const isFront = rel === 0 && !phase;
        const dim =
          phase === "out" || phase === "land" ? 0 : placeOf(rel, n).dim;
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
            data-front-card={isFront || undefined}
            aria-label={`${contentLang === "en" ? post.en.title : post.title} (${i + 1}/${n})`}
            onClick={(e) => {
              if (isFront && !moved.current) onOpen(post, e.currentTarget);
            }}
          >
            <CardContent
              lang={lang}
              contentLang={contentLang}
              post={post}
              voted={votedIds.has(post.id)}
              shape={cardShapeAt(i)}
            />
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
function CardContent({
  lang,
  contentLang,
  post,
  voted,
  shape,
}: {
  lang: Lang;
  contentLang: Lang;
  post: Post;
  voted: boolean;
  shape: CardShape;
}) {
  const en = lang === "en";
  const enTitle = contentLang === "en";
  const photo = cardPhotoOf(post);
  const { mask, scale: k } = shape;
  const m = cardMaskBox(k);
  // 사진(모양) 영역의 카드 안 위치 → 투표 완료 표시 자리: 사진 아래끝에 걸치고, 왼쪽 아래와 가운데 사이
  const photoLeft = CARD.width / 2 + IMAGE.dx - (IMAGE.width * k) / 2 + m.left;
  const photoBottom =
    CARD.height / 2 + IMAGE.dy - (IMAGE.height * k) / 2 + m.top + m.height;
  const badge = {
    left: photoLeft + m.width * 0.12 - 16,
    top: photoBottom - 54,
  };
  return (
    <>
      {photo && (
        <span
          data-card-photo
          className="absolute -translate-x-1/2 -translate-y-1/2 [mask-repeat:no-repeat]"
          style={{
            // 모양마다 시각 보정 크기(k)만큼 사진과 모양을 함께 키우거나 줄임 (가운데는 그대로)
            width: IMAGE.width * k,
            height: IMAGE.height * k,
            left: `calc(50% + ${IMAGE.dx}px)`,
            top: `calc(50% + ${IMAGE.dy}px)`,
            maskImage: mask,
            WebkitMaskImage: mask,
            maskPosition: `${m.left}px ${m.top}px`,
            WebkitMaskPosition: `${m.left}px ${m.top}px`,
            maskSize: `${m.width}px ${m.height}px`,
            WebkitMaskSize: `${m.width}px ${m.height}px`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- 업로드한 사진(blob/외부 URL)도 그대로 보여 줘야 해서 img 사용 */}
          <img
            src={photo}
            alt=""
            draggable={false}
            className="pointer-events-none size-full object-cover"
          />
        </span>
      )}

      {/* 참여 인원 스티커 */}
      <span
        data-card-sticker
        className="absolute top-[14px] right-[14px] flex size-[68px] rotate-12 flex-col items-center justify-center gap-0.5 rounded-full bg-background text-white shadow-[0_4px_12px_rgba(0,0,0,0.18)]"
      >
        <span className="text-[20px] leading-none font-extrabold tracking-[-0.4px]">
          {participantsOf(post)}
        </span>
        <span className="text-[11px] leading-none font-semibold">
          {en ? "joined" : "명 참여"}
        </span>
      </span>

      {/* 투표 완료 표시 — 참여 인원 스티커처럼 사진 위에 붙임 (사진 왼쪽 아래 ~ 가운데 사이, 사진 아래 테두리에 걸치게) */}
      {voted && (
        <span
          data-card-badge
          className="absolute flex -rotate-6 items-center gap-1 rounded-full bg-background px-3 py-2 text-[13px] leading-none font-bold whitespace-nowrap text-white shadow-[0_4px_12px_rgba(0,0,0,0.18)]"
          style={{ left: badge.left, top: badge.top }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
          {en ? "Voted" : "투표 완료"}
        </span>
      )}

      <span className="absolute right-5 bottom-5 left-5 flex flex-col items-start gap-2 text-black">
        {/* 제목 — 줄 수 제한(line-clamp)에 g·p 같은 글자 아래가 잘리지 않게 아래 8px 여유(pb-2), 배치는 그대로(-mb-2)
            한국어는 상세 제목과 같은 Paperlogy, 영어는 Gilroy를 한글 크기에 맞춘 font-title-en (행간 0.15 좁게) */}
        <span
          className={`-mb-2 w-full pb-2 text-[23px] font-extrabold tracking-[-0.69px] break-keep text-balance ${
            enTitle
              ? "line-clamp-3 font-title-en leading-[1.03]"
              : "line-clamp-2 font-(family-name:--font-paperlogy) leading-[1.18]"
          }`}
        >
          {enTitle ? post.en.title : post.title}
        </span>
        <span className="flex w-full items-center justify-between text-[13px] font-semibold text-black/60">
          {/* 작성자: 하얀 원 속 국기 + 닉네임 (상세 화면 작성자와 같은 디자인, 언어 상관없이) */}
          <span className="flex min-w-0 items-center gap-1.5 font-sans text-[14px] leading-none font-semibold tracking-[-0.28px] text-[#242424]">
            <span
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-[14px]"
              aria-hidden
            >
              {post.author.flag}
            </span>
            <span className="truncate">{post.author.name}</span>
          </span>
          {/* 한마디 수 — 채워진 말풍선 아이콘 */}
          <span className="flex shrink-0 items-center gap-1">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
            >
              <path d="M12 2C6.48 2 2 6.03 2 11c0 2.38 1.03 4.55 2.72 6.17L4 21.5a.5.5 0 0 0 .7.55l4.34-1.93c.94.25 1.93.38 2.96.38 5.52 0 10-4.03 10-9S17.52 2 12 2Z" />
            </svg>
            <span className="sr-only">{en ? "Comments" : "한마디"}</span>
            {post.commentCount}
          </span>
        </span>
      </span>
    </>
  );
}
