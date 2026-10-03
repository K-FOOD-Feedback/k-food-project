"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { COMMENT_MAX, QUICK_EMOJIS, useComments, type Comment } from "./comments";
import { estimateWidth, GravityPile, type PileHandle } from "./GravityPile";

/** 날아가는 원의 지름. 실제 말풍선보다 작게 날아가서, 떨어질 때 본래 크기로 커집니다. */
const CIRCLE = 32;
/** 원이 도착하는 높이: 댓글 칸 맨 위 경계. 여기서부터 본래 크기로 커지며 더미까지 떨어집니다. */
const ARRIVE_Y = 0;

type Flight = {
  id: number;
  kind: Comment["kind"];
  text: string;
  color: string;
  /** 출발: 한마디 카드 또는 누른 이모지 버튼 */
  from: DOMRect;
  /** 도착: 화면 좌표 */
  to: { x: number; y: number };
  /** 도착 자리 x (댓글 칸 기준) */
  dropX: number;
};

/** 댓글 영역 (Figma: Tile/한마디 참견 + 한마디 입력 + 이모지 키) */
export function CommentPile({ postId, commentCount, authorFlag }: { postId: string; commentCount: number; authorFlag: string }) {
  const { comments, addedCount, add, nextColor } = useComments(postId, authorFlag);
  const [draft, setDraft] = useState("");
  const card = useRef<HTMLSpanElement>(null);
  const zone = useRef<HTMLDivElement>(null);
  const pile = useRef<PileHandle>(null);
  // 보내기·이모지를 누른 뒤 댓글 칸으로 날아가는 중인 원들 (도착하면 댓글로 추가)
  const [flights, setFlights] = useState<Flight[]>([]);
  const nextId = useRef(0);

  /** 출발 요소에서 원으로 바뀌어 댓글 칸으로 날아간 뒤 댓글이 됩니다. */
  const launch = async (kind: Comment["kind"], text: string, fromEl: HTMLElement | null) => {
    const zoneEl = zone.current;
    if (!fromEl || !zoneEl || !pile.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      add(kind, text);
      return;
    }
    // 댓글창 윗부분이 화면 밖이면 먼저 보이게 올려 줍니다 (떨어지는 모습이 보이도록).
    if (zoneEl.getBoundingClientRect().top < 16) {
      zoneEl.scrollIntoView({ behavior: "smooth", block: "center" });
      await new Promise((r) => setTimeout(r, 380));
    }
    const z = zoneEl.getBoundingClientRect();
    // 더미가 가장 낮은 곳을 미리 정해, 원이 바로 그 위로 날아가게 합니다.
    const dropX = pile.current.planDrop(estimateWidth(kind, text));
    const flight: Flight = {
      id: nextId.current++,
      kind,
      text,
      color: nextColor(flights.length),
      from: fromEl.getBoundingClientRect(),
      to: { x: z.left + dropX, y: z.top + ARRIVE_Y },
      dropX,
    };
    setFlights((list) => [...list, flight]);
  };

  const arrive = (flight: Flight) => {
    pile.current?.setNextDrop({ x: flight.dropX, y: ARRIVE_Y, d: CIRCLE });
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

  return (
    <div className="flex flex-col items-center gap-8">
      <section className="relative flex w-full flex-col gap-1 overflow-hidden rounded-[32px] bg-white/10 p-1" aria-label="댓글">
        <div className="flex h-16 items-center gap-10 pl-5">
          <h2 className="flex flex-1 items-center gap-1.5 text-[18px] leading-[1.3] font-bold tracking-[-0.54px]">
            댓글 <span className="text-neutral-400">{commentCount + addedCount}</span>
          </h2>
          <Link
            href={`/posts/${postId}/comments`}
            aria-label="댓글 전체 보기"
            className="flex size-16 items-center justify-center rounded-full bg-[#242424]"
          >
            <ArrowUpRightIcon />
          </Link>
        </div>

        <div ref={zone}>
          <GravityPile ref={pile} comments={comments} />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[92px] bg-linear-to-b from-[#292929]/0 to-[#292929]" />
      </section>

      {/* 한마디 입력 카드 + 보내기 */}
      <form onSubmit={onSubmit} className="relative h-[181px] w-[270px]">
        <label className="absolute inset-x-0 top-0 flex h-[152px] items-center justify-center">
          <span className="sr-only">한마디 남기기</span>
          <span ref={card} className="relative flex h-[130px] w-[260px] -rotate-[4.91deg] items-center justify-center rounded-[26px] bg-[#292929] p-4">
            <textarea
              value={draft}
              onChange={(e) => setDraft(limitDraft(e.target.value))}
              onKeyDown={(e) => {
                // Enter는 줄바꿈만 합니다 (최대 2줄). 보내기는 버튼으로만.
                if (e.key === "Enter" && draft.includes("\n")) e.preventDefault();
              }}
              rows={2}
              placeholder={"떠오른 한마디를\n남겨보세요"}
              className="w-full resize-none bg-transparent text-center text-[20px] leading-[1.45] font-bold tracking-[-0.4px] text-on-dark outline-none placeholder:text-white/70"
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

      {flights.map((f) => (
        <FlyingCircle key={f.id} flight={f} onArrive={() => arrive(f)} />
      ))}

      <div className="flex w-full gap-0.5">
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
    </div>
  );
}

/**
  날아가는 원. 출발 요소(한마디 카드·이모지 버튼) 모양에서 시작해 새 댓글 색의 원으로 바뀌고,
  살짝 포물선을 그리며 도착 자리로 날아갑니다.
*/
function FlyingCircle({ flight, onArrive }: { flight: Flight; onArrive: () => void }) {
  const el = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const node = el.current;
    if (!node) return;
    const { from, to, kind, color } = flight;
    const dx = to.x - (from.left + from.width / 2);
    const dy = to.y - (from.top + from.height / 2);
    const isText = kind === "text";
    const start = isText
      ? { width: "260px", height: "130px", borderRadius: "26px", backgroundColor: "#292929", rotate: "-4.91deg" }
      : { width: `${from.width}px`, height: `${from.height}px`, borderRadius: "999px", backgroundColor: "rgb(255 255 255 / 0.1)", rotate: "0deg" };
    const circle = { width: `${CIRCLE}px`, height: `${CIRCLE}px`, borderRadius: "999px", backgroundColor: color, rotate: "0deg" };
    const at = (fx: number, fy: number) => `calc(-50% + ${fx}px) calc(-50% + ${fy}px)`;
    const animation = node.animate(
      [
        { ...start, translate: at(0, 0) },
        // 제자리에서 원으로 바뀐 뒤
        { ...circle, translate: at(0, -6), offset: isText ? 0.3 : 0.2 },
        // 위로 솟구쳤다가
        { ...circle, translate: at(dx * 0.7, dy * 1.1), offset: 0.75 },
        // 댓글창 맨 위(떨어질 자리 바로 위)에 도착
        { ...circle, translate: at(dx, dy) },
      ],
      { duration: isText ? 720 : 560, easing: "cubic-bezier(0.45, 0, 0.25, 1)", fill: "forwards" },
    );
    // 한마디 글자는 원으로 바뀌면서 사라집니다.
    if (isText) label.current?.animate([{ opacity: 1 }, { opacity: 0, offset: 0.18 }, { opacity: 0 }], { duration: 720, fill: "forwards" });
    animation.onfinish = onArrive;
    return () => animation.cancel();
    // 원 하나당 한 번만 날아갑니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { from, kind, text } = flight;
  return (
    <div
      ref={el}
      aria-hidden
      className="pointer-events-none fixed z-30 flex items-center justify-center overflow-hidden text-center shadow-[0_10px_24px_rgba(0,0,0,0.35)]"
      style={{ left: from.left + from.width / 2, top: from.top + from.height / 2, translate: "-50% -50%" }}
    >
      {kind === "text" ? (
        <span ref={label} className="px-4 text-[20px] leading-[1.45] font-bold tracking-[-0.4px] whitespace-pre text-on-dark">
          {text}
        </span>
      ) : (
        <span className="text-[16px]">{text}</span>
      )}
    </div>
  );
}

const MAX_LINES = 2;

/** 줄바꿈은 글자 수에 세지 않습니다. */
const charCount = (text: string) => text.replace(/\n/g, "").length;

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
