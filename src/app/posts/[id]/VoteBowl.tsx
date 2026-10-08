"use client";

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import type { HomePost } from "@/app/home/mockPosts";
import { clearVote, saveVote, useMyVote } from "@/app/home/votes";
import { LoginSheet } from "@/components/LoginSheet";
import { track } from "@/lib/analytics";
import { useFlow } from "@/lib/write-store";

const title = "font-(family-name:--font-paperlogy) text-[24px] leading-[1.3] tracking-[-0.72px]";

/**
  투표 카드 (Figma: VoteCard / Bowl)
  🇰🇷 토큰을 칸으로 끌어다 놓거나 칸을 누르면 투표되고, 바로 결과가 칸 높이로 보입니다.
  로그인 안 했으면 투표 대신 로그인 시트가 뜨고, 로그인하면 고른 칸에 바로 투표됩니다. (송희)
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

  // 분석: 화면에 들어와서 투표까지 걸린 시간, 다시 투표인지
  const mountedAt = useRef(0);
  const previousVote = useRef<number | null>(null);
  useEffect(() => {
    mountedAt.current = performance.now();
  }, []);

  // 로그인 전에 고른 칸 — 로그인하면 바로 투표
  const { loggedIn, logIn } = useFlow();
  const [pending, setPending] = useState<{ choice: number; method: "drag" | "tap" } | null>(null);

  const vote = (choice: number, method: "drag" | "tap" = "tap") => {
    if (!loggedIn) {
      track("login_sheet_opened", { from: "vote", post_id: post.id, method });
      setPending({ choice, method });
      return;
    }
    castVote(choice, method);
  };

  const castVote = (choice: number, method: "drag" | "tap") => {
    track(previousVote.current === null ? "vote_cast" : "vote_changed", {
      post_id: post.id,
      choice,
      previous: previousVote.current,
      options_count: options.length,
      method,
      seconds_to_vote: Math.round((performance.now() - mountedAt.current) / 100) / 10,
      total_votes_before: total,
    });
    previousVote.current = null;
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
          <p className="text-center text-[15px] leading-[1.4] font-semibold text-neutral-400">
            {total}명 중 <span className="text-on-dark">{pcts[myVote]}%</span>가 같은 생각이에요
          </p>
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
              disabled={voted}
              onClick={() => vote(i)}
              aria-pressed={mine}
              aria-label={voted ? `${label.replace("\n", " ")} ${pcts[i]}%` : `${label.replace("\n", " ")}에 투표`}
              className={`relative h-[230px] min-w-0 flex-1 overflow-hidden rounded-[20px] text-left transition-colors ${
                hover === i ? "bg-[#2e2e2e]" : "bg-[#1e1e1e]"
              }`}
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

      {voted && (
        <button
          type="button"
          onClick={() => {
            // 다음 투표는 vote_changed 로 기록
            previousVote.current = myVote;
            clearVote(post.id);
          }}
          className="-mt-2 self-center text-[14px] font-semibold text-neutral-400 underline underline-offset-4"
        >
          다시 투표하기
        </button>
      )}

      <LoginSheet
        lang="ko"
        open={pending !== null}
        title={pending ? `‘${options[pending.choice].replace("\n", " ")}’에 투표할까요?` : undefined}
        onClose={() => {
          track("login_cancelled", { from: "vote", stage: "sheet", post_id: post.id });
          setPending(null);
        }}
        onLoggedIn={() => {
          track("login_completed", { from: "vote", method: "google" });
          logIn();
          if (pending) castVote(pending.choice, pending.method);
          setPending(null);
        }}
      >
        <div className="flex items-center gap-2 pt-2" aria-hidden="true">
          <span className="flex size-14 animate-pop items-center justify-center rounded-full bg-on-dark text-[24px] shadow-[0_6px_16px_rgba(0,0,0,0.35)]">
            🇰🇷
          </span>
          <span className="flex size-14 animate-pop items-center justify-center rounded-full bg-primary text-on-light [animation-delay:120ms]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
        </div>
      </LoginSheet>
    </section>
  );
}
