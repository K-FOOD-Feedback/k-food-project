"use client";

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import type { HomePost } from "@/app/home/mockPosts";
import { saveVote, useMyVote } from "@/app/home/votes";
import { track } from "@/lib/analytics";

const title = "font-(family-name:--font-paperlogy) text-[24px] leading-[1.3] tracking-[-0.72px]";

/**
  투표 카드 (Figma: VoteCard / Bowl)
  🇰🇷 토큰을 칸으로 끌어다 놓거나 칸을 누르면 투표되고, 바로 결과가 칸 높이로 보입니다.
  투표한 뒤 다른 칸을 누르면 내 선택이 그 칸으로 바뀝니다 (투표 전으로 되돌리지 않음 —
  되돌리면 투표한 사람에게만 보이는 한마디 영역이 사라졌다 다시 나타나기 때문).
*/
export function VoteBowl({ post }: { post: HomePost }) {
  const myVote = useMyVote(post.id);
  const options = post.question.options;
  const columns = useRef<(HTMLButtonElement | null)[]>([]);
  const token = useRef<HTMLDivElement>(null);
  // 토큰이 칸으로 날아가는 애니메이션의 출발점 (투표 직전 위치)
  const flyFrom = useRef<DOMRect | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number; startX: number; startY: number } | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const votes = post.votes.map((n, i) => n + (i === myVote ? 1 : 0));
  const total = votes.reduce((sum, n) => sum + n, 0);
  const pcts = votes.map((n) => (total ? Math.round((n / total) * 100) : 0));

  // 투표 직후: 토큰을 원래 자리에서 새 자리(내 칸)로 날려 보냅니다.
  useLayoutEffect(() => {
    const from = flyFrom.current;
    const el = token.current;
    if (!from || !el || myVote === null) return;
    flyFrom.current = null;
    const to = el.getBoundingClientRect();
    el.animate(
      [{ translate: `${from.left - to.left}px ${from.top - to.top}px`, scale: "1.15" }, { translate: "0 0", scale: "1" }],
      { duration: 520, easing: "cubic-bezier(0.3, 1.3, 0.5, 1)" },
    );
  }, [myVote]);

  // 분석: 화면에 들어와서 투표까지 걸린 시간, 처음 투표인지 선택을 바꾼 건지
  const mountedAt = useRef(0);
  useEffect(() => {
    mountedAt.current = performance.now();
  }, []);

  const vote = (choice: number, method: "drag" | "tap" = "tap") => {
    if (choice === myVote) return; // 이미 고른 칸
    track(myVote === null ? "vote_cast" : "vote_changed", {
      post_id: post.id,
      choice,
      previous: myVote,
      options_count: options.length,
      method,
      seconds_to_vote: Math.round((performance.now() - mountedAt.current) / 100) / 10,
      total_votes_before: total,
    });
    flyFrom.current = token.current?.getBoundingClientRect() ?? null;
    saveVote(post.id, choice);
  };

  const columnAt = (x: number, y: number) =>
    columns.current.findIndex((el) => {
      const r = el?.getBoundingClientRect();
      return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    });

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ x: 0, y: 0, startX: e.clientX, startY: e.clientY });
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    setDrag({ ...drag, x: e.clientX - drag.startX, y: e.clientY - drag.startY });
    const i = columnAt(e.clientX, e.clientY);
    setHover(i < 0 ? null : i);
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const i = columnAt(e.clientX, e.clientY);
    setHover(null);
    if (i >= 0) vote(i, "drag");
    else if (drag && Math.hypot(drag.x, drag.y) > 12) track("vote_drag_missed", { post_id: post.id });
    setDrag(null);
  };

  const voted = myVote !== null;
  const tokenEl = (
    <div
      ref={token}
      className="flex size-16 items-center justify-center rounded-full bg-on-light text-[25px] leading-none shadow-[0_6px_16px_rgba(0,0,0,0.35)]"
    >
      🇰🇷
    </div>
  );

  return (
    <section
      id="vote"
      className="flex scroll-mt-4 flex-col gap-6 rounded-[32px] bg-[#292929] px-7 py-[30px]"
      aria-label="투표"
    >
      <h2 className={`${title} text-center`}>
        {voted ? (
          "투표 완료!"
        ) : (
          <>
            나의 생각을
            <br />
            투표해주세요!
          </>
        )}
      </h2>

      {/* 토큰 자리: 투표 전엔 토큰, 투표 후엔 결과 요약 */}
      <div className="flex h-16 items-center justify-center">
        {voted ? (
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-[15px] leading-[1.4] font-semibold text-neutral-400">
              {total}명 중 <span className="text-on-dark">{pcts[myVote]}%</span>가 같은 생각이에요
            </p>
            <p className="text-[12px] leading-[1.4] font-medium text-neutral-400/70">다른 칸을 누르면 선택을 바꿀 수 있어요</p>
          </div>
        ) : (
          <div
            className={`relative z-10 touch-none select-none ${drag ? "cursor-grabbing" : "cursor-grab transition-transform duration-300"}`}
            style={{ transform: drag ? `translate(${drag.x}px, ${drag.y}px) scale(1.1)` : undefined }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              setDrag(null);
              setHover(null);
            }}
            role="img"
            aria-label="투표 토큰 — 원하는 칸으로 끌어다 놓거나 칸을 눌러 투표하세요"
          >
            {tokenEl}
          </div>
        )}
      </div>

      <div className="flex gap-1.5">
        {options.map((label, i) => {
          const mine = i === myVote;
          return (
            <button
              key={label}
              ref={(el) => {
                columns.current[i] = el;
              }}
              type="button"
              onClick={() => vote(i)}
              aria-pressed={mine}
              aria-label={
                voted
                  ? `${label.replace("\n", " ")} ${pcts[i]}%${mine ? " (내 선택)" : " — 눌러서 선택 바꾸기"}`
                  : `${label.replace("\n", " ")}에 투표`
              }
              className={`relative h-[230px] min-w-0 flex-1 overflow-hidden rounded-[20px] text-left transition-[background-color,scale] ${
                hover === i ? "bg-[#2e2e2e]" : "bg-[#1e1e1e]"
              } ${mine ? "cursor-default" : "active:scale-[0.98]"}`}
            >
              {voted && (
                <span
                  className={`absolute inset-x-0 bottom-0 transition-[height] duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] starting:h-0 ${
                    mine ? "bg-primary" : "bg-white/10"
                  }`}
                  style={{ height: `${pcts[i]}%` }}
                />
              )}
              <span
                className={`absolute top-0 left-0 w-full pt-4 pr-2 pl-4 text-[14px] leading-[1.25] font-medium tracking-[-0.42px] whitespace-pre-line transition-opacity ${
                  mine || hover === i ? "opacity-100" : "opacity-40"
                }`}
              >
                {label}
              </span>
              {voted && (
                <span
                  className={`${title} absolute bottom-3 left-4 ${mine ? "text-on-light" : "text-on-dark"}`}
                >
                  {pcts[i]}%
                </span>
              )}
              {mine && (
                <span className="absolute left-1/2 -translate-x-1/2" style={{ bottom: `min(calc(${pcts[i]}% + 8px), 110px)` }}>
                  {tokenEl}
                </span>
              )}
            </button>
          );
        })}
      </div>

    </section>
  );
}
