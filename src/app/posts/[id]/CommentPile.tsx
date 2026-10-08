"use client";

import { TrackedLink } from "@/components/Track";
import { track } from "@/lib/analytics";
import { useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { COMMENT_MAX, QUICK_EMOJIS, useComments, type Comment } from "./comments";
import { estimateWidth, GravityPile, type PileHandle } from "./GravityPile";

/** 날아가는 원의 지름. 실제 말풍선보다 작게 날아가서, 떨어질 때 본래 크기로 커집니다. */
const CIRCLE = 20;
/** 원은 도착 지점보다 이만큼 위까지 솟았다가 내려오며 도착합니다 (그 낙하 속도 그대로 말풍선이 이어서 떨어짐). */
const RISE = 40;
/** 원이 날아가는 시간 (한마디·이모지 같음) */
const FLIGHT_MS = 300;

type Flight = {
  id: number;
  kind: Comment["kind"];
  text: string;
  color: string;
  /** 출발: 한마디 카드(상세)·입력칸(전체 화면) 또는 누른 이모지 버튼 */
  from: DOMRect;
  /** 한마디 출발 모양: 기울어진 카드(상세) 또는 알약 입력칸(전체 화면) */
  fromField: boolean;
  /** 도착: 화면 좌표 */
  to: { x: number; y: number };
  /** 도착 자리 (댓글 칸 기준) */
  dropX: number;
  dropY: number;
};

/**
  댓글 영역 (Figma: Tile/한마디 참견 + 한마디 입력 + 이모지 키)
  variant "preview": 상세 화면 — 댓글 칸 286px, ↗ 버튼으로 댓글 전체 화면 이동
  variant "full": 댓글 전체 화면 (Figma 332:3245) — 카드 없이 제목 + 게시글 제목, 남는 높이를 다 쓰고,
    칸을 스크롤해서 묻힌 댓글까지 볼 수 있음. 입력은 한 줄 알약 입력칸 + 보내기 원 버튼
*/
export function CommentPile({
  postId,
  commentCount,
  authorFlag,
  postTitle,
  variant = "preview",
}: {
  postId: string;
  commentCount: number;
  authorFlag: string;
  /** 전체 화면 제목 아래에 보이는 게시글 제목 */
  postTitle?: string;
  variant?: "preview" | "full";
}) {
  const full = variant === "full";
  const scrolledOld = useRef(false); // 분석: 전체 화면에서 예전 댓글까지 스크롤했는지
  const { comments, addedCount, add, nextColor, ready } = useComments(postId, authorFlag);
  const [draft, setDraft] = useState("");
  const card = useRef<HTMLElement>(null);
  const zone = useRef<HTMLDivElement>(null);
  const titleRow = useRef<HTMLDivElement>(null);
  const pile = useRef<PileHandle>(null);
  // 보내기·이모지를 누른 뒤 댓글 칸으로 날아가는 중인 원들 (도착하면 댓글로 추가)
  const [flights, setFlights] = useState<Flight[]>([]);
  // 전체 화면: 더미가 칸의 3/4를 넘었을 때만 아래 그라데이션을 보여 줍니다.
  const [overflowing, setOverflowing] = useState(false);
  const nextId = useRef(0);

  /** 출발 요소에서 원으로 바뀌어 댓글 칸으로 날아간 뒤 댓글이 됩니다. */
  const launch = async (kind: Comment["kind"], text: string, fromEl: HTMLElement | null) => {
    track("comment_sent", {
      post_id: postId,
      type: kind,
      length: kind === "emoji" ? 0 : text.length,
      emoji: kind === "emoji" ? text : undefined,
      lines: text.split("\n").length,
      screen: full ? "comments" : "detail",
    });
    const zoneEl = zone.current;
    if (!fromEl || !zoneEl || !pile.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      add(kind, text);
      return;
    }
    // 댓글창 윗부분이 화면 밖이면 먼저 보이게 올려 줍니다 (떨어지는 모습이 보이도록).
    // 전체 화면: 댓글 칸을 아래로 스크롤해 둔 상태면 맨 위로 올려서 떨어지는 모습이 보이게
    const scrollBox = zoneEl.firstElementChild;
    if (full && scrollBox && scrollBox.scrollTop > 0) {
      pile.current.scrollToTop();
      await new Promise((r) => setTimeout(r, 300));
    }
    if (zoneEl.getBoundingClientRect().top < 16) {
      zoneEl.scrollIntoView({ behavior: "smooth", block: "center" });
      await new Promise((r) => setTimeout(r, 380));
    }
    const z = zoneEl.getBoundingClientRect();
    // "댓글 N" 제목 줄 높이로 날아가서, 거기서부터 떨어집니다.
    const title = titleRow.current?.getBoundingClientRect();
    const arriveY = title ? title.top + title.height / 2 : z.top;
    // 더미가 가장 낮은 곳을 미리 정해, 원이 바로 그 위로 날아가게 합니다.
    const dropX = pile.current.planDrop(estimateWidth(kind, text));
    const flight: Flight = {
      id: nextId.current++,
      kind,
      text,
      color: nextColor(flights.length),
      from: fromEl.getBoundingClientRect(),
      fromField: full,
      to: { x: z.left + dropX, y: arriveY },
      dropX,
      dropY: arriveY - z.top,
    };
    setFlights((list) => [...list, flight]);
  };

  /** vy: 원이 도착할 때의 낙하 속도 (물리 한 걸음 = 1/60초당 px) */
  const arrive = (flight: Flight, vy: number) => {
    pile.current?.setNextDrop({ x: flight.dropX, y: flight.dropY, d: CIRCLE, vy });
    add(flight.kind, flight.text);
    setFlights((list) => list.filter((f) => f.id !== flight.id));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n");
    if (!text) return;
    setDraft("");
    launch("text", text, card.current);
  };

  const emojiKeys = (
    <div className={`flex w-full gap-0.5 ${full ? "px-2" : ""}`}>
      {QUICK_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={(e) => launch("emoji", emoji, e.currentTarget)}
          aria-label={`${emoji} 남기기`}
          className="flex aspect-square min-w-0 flex-1 items-center justify-center rounded-full bg-white/10 text-[20px] transition-transform active:scale-90"
        >
          {emoji}
        </button>
      ))}
    </div>
  );

  const flying = flights.map((f) => <FlyingCircle key={f.id} flight={f} onArrive={(vy) => arrive(f, vy)} />);

  if (full) {
    const count = commentCount + addedCount;
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div ref={titleRow} className="flex flex-col gap-3 px-5">
          <h2 className="flex items-center gap-1.5 text-[18px] leading-[1.3] font-bold tracking-[-0.54px]">
            한마디 <span className="text-neutral-400">{count}</span>
          </h2>
          {postTitle && (
            <p className="font-(family-name:--font-paperlogy) text-[24px] leading-[1.4] tracking-[-0.48px] break-keep text-neutral-400">
              {postTitle}
            </p>
          )}
        </div>

        <section aria-label="댓글" className="relative flex min-h-0 flex-1 flex-col">
          <div
            ref={zone}
            className="flex min-h-0 flex-1 flex-col"
            onScrollCapture={() => {
              if (!scrolledOld.current) {
                scrolledOld.current = true;
                track("old_comments_scrolled", { post_id: postId });
              }
            }}
          >
            <GravityPile
              ref={pile}
              comments={comments}
              ready={ready}
              className="min-h-0 flex-1"
              scrollable
              rainOnOpen
              onOverflowChange={setOverflowing}
            />
          </div>
          <div
            className={`pointer-events-none absolute inset-x-0 bottom-0 h-[92px] bg-linear-to-b from-background/0 to-background transition-opacity duration-300 ${
              overflowing ? "opacity-100" : "opacity-0"
            }`}
          />
        </section>

        {emojiKeys}

        {/* 한마디 입력칸 + 보내기 */}
        <form onSubmit={onSubmit} className="flex items-center gap-0.5 px-2">
          <label
            ref={(el) => {
              card.current = el;
            }}
            className="flex h-16 min-w-0 flex-1 items-center gap-2 rounded-full border-[1.5px] border-white/40 px-5 font-medium focus-within:border-white/70"
          >
            <span className="sr-only">한마디 남기기</span>
            <input
              value={draft}
              onChange={(e) => setDraft(limitDraft(e.target.value.replace(/\n/g, "")))}
              placeholder="한마디를 남겨보세요"
              enterKeyHint="send"
              className="min-w-0 flex-1 bg-transparent text-[16px] text-on-dark outline-none placeholder:text-white/40"
            />
            <span className="shrink-0 text-[12px] text-white/40">
              {charCount(draft)}/{COMMENT_MAX}
            </span>
          </label>
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label="보내기"
            className="flex size-16 shrink-0 items-center justify-center rounded-full bg-white transition-transform active:scale-90"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- 작은 SVG 아이콘 */}
            <img src="/images/icon-send.svg" width={22} height={22} alt="" className="-rotate-30" />
          </button>
        </form>

        {flying}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <section
        className="relative flex w-full flex-col gap-1 overflow-hidden rounded-[32px] bg-white/10 p-1"
        aria-label="댓글"
      >
        <div ref={titleRow} className="flex h-16 items-center gap-10 pl-5">
          <h2 className="flex flex-1 items-center gap-1.5 text-[18px] leading-[1.3] font-bold tracking-[-0.54px]">
            한마디 <span className="text-neutral-400">{commentCount + addedCount}</span>
          </h2>
          <TrackedLink
              href={`/posts/${postId}/comments`}
              event="comments_opened"
              props={{ post_id: postId, comment_count: commentCount + addedCount }}
              aria-label="댓글 전체 보기"
              className="flex size-16 items-center justify-center rounded-full bg-[#242424]"
            >
              <ArrowUpRightIcon />
            </TrackedLink>
        </div>

        <div ref={zone}>
          <GravityPile ref={pile} comments={comments} ready={ready} />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[92px] bg-linear-to-b from-[#292929]/0 to-[#292929]" />
      </section>

      {/* 이모지 키 → 한마디 입력 카드 순서 (Figma 332:3426) */}
      {emojiKeys}

      {/* 한마디 입력 카드 + 보내기 */}
      <form onSubmit={onSubmit} className="relative h-[181px] w-[270px]">
        <label className="absolute inset-x-0 top-0 flex h-[152px] items-center justify-center">
          <span className="sr-only">한마디 남기기</span>
          <span ref={card} className="relative flex h-[130px] w-[260px] -rotate-[4.91deg] items-center justify-center rounded-[26px] bg-[#292929] px-6 py-[30px]">
            <textarea
              value={draft}
              onChange={(e) => setDraft(fitTwoLines(e.target, limitDraft(e.target.value)))}
              onKeyDown={(e) => {
                // Enter는 줄바꿈만 합니다 (최대 2줄). 보내기는 버튼으로만.
                if (e.key === "Enter" && draft.includes("\n")) e.preventDefault();
              }}
              rows={2}
              placeholder={"한마디를\n남겨보세요"}
              className="w-full resize-none overflow-hidden bg-transparent text-center text-[20px] leading-[1.45] font-bold tracking-[-0.4px] text-on-dark outline-none placeholder:text-white/70"
            />
            <span className="absolute right-4 bottom-[26px] text-[10px] font-bold text-white/70">
              {charCount(draft)}/{COMMENT_MAX}
            </span>
          </span>
        </label>
        <span className="absolute top-[123px] left-[84px] flex h-[58px] w-[112px] items-center justify-center">
          <button
            type="submit"
            disabled={!draft.trim()}
            className="flex rotate-[4.89deg] items-center gap-1.5 rounded-full bg-white px-3.5 py-2.5 text-[20px] leading-[1.45] font-bold tracking-[-0.4px] text-black"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- 작은 SVG 아이콘 */}
            <img src="/images/icon-send.svg" width={22} height={22} alt="" />
            보내기
          </button>
        </span>
      </form>

      {flying}
    </div>
  );
}

/**
  날아가는 원. 출발 요소(한마디 카드·이모지 버튼) 모양에서 시작해, 안이 빈 작은 색 원으로 바뀌고,
  도착 지점 위로 솟구쳤다가 내려오는 속도 그대로 도착합니다 (도착해서 멈칫하지 않도록).
*/
function FlyingCircle({ flight, onArrive }: { flight: Flight; onArrive: (vy: number) => void }) {
  const outer = useRef<HTMLDivElement>(null);
  const el = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const node = el.current;
    if (!node || !outer.current) return;
    const { from, to, kind, color } = flight;
    const dx = to.x - (from.left + from.width / 2);
    const dy = to.y - (from.top + from.height / 2);
    const isText = kind === "text";
    const duration = FLIGHT_MS;
    const morphAt = isText ? 0.22 : 0.16;
    // 던진 공처럼 같은 중력으로 오르고 내립니다: 오르는 거리 : 내리는 거리 = 시간² 비율.
    // 그래서 꼭대기 근처에 머무는 시간이 짧고 자연스럽습니다.
    const riseDist = Math.max(RISE, -(dy - RISE) - 6);
    const flyMs = duration * (1 - morphAt);
    const fallMs = (flyMs * Math.sqrt(RISE)) / (Math.sqrt(riseDist) + Math.sqrt(RISE));
    const apexAt = 1 - fallMs / duration;
    const start = isText && flight.fromField
      ? { width: `${from.width}px`, height: `${from.height}px`, borderRadius: "999px", backgroundColor: "rgb(255 255 255 / 0)", rotate: "0deg" }
      : isText
      ? { width: "260px", height: "130px", borderRadius: "26px", backgroundColor: "#292929", rotate: "-4.91deg" }
      : { width: `${from.width}px`, height: `${from.height}px`, borderRadius: "999px", backgroundColor: "rgb(255 255 255 / 0.1)", rotate: "0deg" };
    const circle = { width: `${CIRCLE}px`, height: `${CIRCLE}px`, borderRadius: "999px", backgroundColor: color, rotate: "0deg" };
    // 가로와 세로를 따로 움직입니다. 세로는 꼭대기에서 잠깐 멈추지만(던진 공처럼) 가로는 계속 움직여서
    // 멈칫하는 대신 매끄러운 포물선으로 보입니다.
    outer.current.animate(
      [
        { translate: "0px 0px", offset: 0 },
        { translate: "0px 0px", offset: morphAt, easing: "cubic-bezier(0.4, 0, 0.6, 1)" },
        { translate: `${dx}px 0px` },
      ],
      { duration, fill: "forwards" },
    );
    const y = (v: number) => `-50% calc(-50% + ${v}px)`;
    const animation = node.animate(
      [
        // 제자리에서 작은 원으로 바뀌고
        { ...start, translate: y(0), easing: "ease-out" },
        // 도착 지점 위쪽으로 솟구쳤다가 (점점 느려지며 = ease-out quad)
        { ...circle, translate: y(-6), offset: morphAt, easing: "cubic-bezier(0.333, 0.667, 0.667, 1)" },
        // 아래로 떨어지며 (점점 빨라지며 = ease-in quad)
        { ...circle, translate: y(dy - RISE), offset: apexAt, easing: "cubic-bezier(0.333, 0, 0.667, 0.333)" },
        // 도착 — 이 속도를 말풍선이 이어받아 계속 떨어집니다.
        { ...circle, translate: y(dy) },
      ],
      { duration, fill: "forwards" },
    );
    // 한마디 글자는 원으로 바뀌기 전에 바로 사라집니다 (날아가는 원은 빈 원).
    if (isText) label.current?.animate([{ opacity: 1 }, { opacity: 0, offset: 0.1 }, { opacity: 0 }], { duration, fill: "forwards" });
    // ease-in quad의 끝 속도 = 2 × 거리 ÷ 시간 → 물리 한 걸음(1/60초)당 px
    animation.onfinish = () => onArrive(((2 * RISE) / fallMs) * (1000 / 60));
    return () => animation.cancel();
    // 원 하나당 한 번만 날아갑니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { from, kind, text } = flight;
  return (
    <div
      ref={outer}
      aria-hidden
      className="pointer-events-none fixed z-30 size-0"
      style={{ left: from.left + from.width / 2, top: from.top + from.height / 2 }}
    >
      <div ref={el} className="absolute top-0 left-0 flex items-center justify-center overflow-hidden text-center">
        {kind === "text" && (
          <span ref={label} className="px-4 text-[20px] leading-[1.45] font-bold tracking-[-0.4px] whitespace-pre text-on-dark">
            {text}
          </span>
        )}
      </div>
    </div>
  );
}

const MAX_LINES = 2;

/** 줄바꿈은 글자 수에 세지 않습니다. */
const charCount = (text: string) => text.replace(/\n/g, "").length;

/**
  화면에 보이는 줄도 2줄까지만: 한 줄이 카드 폭을 넘어 저절로 줄바꿈되면 3줄이 될 수 있어서,
  넣어 보고 2줄 높이를 넘으면 넘치지 않을 때까지 끝에서부터 글자를 뺍니다.
  (타이핑은 그 글자가 안 들어가고, 붙여넣기는 들어갈 만큼만 들어갑니다)
*/
function fitTwoLines(el: HTMLTextAreaElement, value: string) {
  let text = value;
  el.value = text;
  // rows={2}라 칸 높이(clientHeight)가 곧 2줄 높이입니다.
  while (text && el.scrollHeight > el.clientHeight + 1) {
    text = Array.from(text).slice(0, -1).join("");
    el.value = text;
  }
  return text;
}

/** 입력값을 최대 2줄, 20자로 자릅니다 (붙여넣기 포함). */
function limitDraft(value: string) {
  let left = COMMENT_MAX;
  return value
    .split("\n")
    .slice(0, MAX_LINES)
    .map((line) => {
      const kept = line.slice(0, Math.max(left, 0));
      left -= kept.length;
      return kept;
    })
    .join("\n");
}

// Lucide arrow-up-right (MIT)
function ArrowUpRightIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 7h10v10" />
      <path d="M7 17 17 7" />
    </svg>
  );
}
