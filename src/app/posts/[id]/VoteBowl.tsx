"use client";

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import type { HomePost } from "@/app/home/mockPosts";
import { saveVote, useMyVote } from "@/app/home/votes";
import { LoginSheet } from "@/components/LoginSheet";
import { track } from "@/lib/analytics";
import { useFlow } from "@/lib/write-store";

const title = "font-(family-name:--font-paperlogy) text-[24px] leading-[1.3] tracking-[-0.72px]";

/*
  랜딩 화면 투표 장면과 같은 움직임 (src/app/landing/LandingScreen.tsx)
  - 🇰🇷 토큰: 120° 돌며 내 칸(칸 이름과 % 사이)으로 떨어지고, 살짝 지나쳤다가 제자리 (랜딩의 backOut, c = 1.9)
  - 칸 결과: 토큰이 반쯤 왔을 때부터 칸마다 조금씩 늦게 아래에서 차오르고, %는 그때 나타남
  랜딩 마지막 "당신은 누구인가요?" 칸과 같은 움직임
  - 투표 영역이 처음 보이면 토큰이 위에서 톡 떨어지고, 투표하기 전까지 🇰🇷가 계속 손 흔들듯 흔들림 (token-drop · wave)
  - 내 칸의 색은 윗변이 물결 모양으로 옆으로 흐르며 차오름 (wave-fill), 토큰을 끌어다 대면 살짝 차오름
*/
const BACK_OUT =
  "linear(0, 0.228, 0.425, 0.592, 0.731, 0.845, 0.936, 1.006, 1.058, 1.092, 1.112, 1.12, 1.118, 1.108, 1.093, 1.073, 1.053, 1.033, 1.016, 1.004, 1)";
const TOKEN_MS = 600;
const FILL_DELAY_MS = 300;
const FILL_STAGGER_MS = 80;

/**
  투표 카드 (Figma: VoteCard / Bowl)
  🇰🇷 토큰을 칸으로 끌어다 놓거나 칸을 누르면 투표되고, 바로 결과가 칸 높이로 보입니다.
  투표한 뒤 다른 칸을 누르면 내 선택이 그 칸으로 바뀝니다 (투표 전으로 되돌리지 않음 —
  되돌리면 투표한 사람에게만 보이는 한마디 영역이 사라졌다 다시 나타나기 때문).
  로그인 안 했으면 투표 대신 로그인 시트가 뜨고, 로그인하면 고른 칸에 바로 투표됩니다. (송희)
*/
export function VoteBowl({ post }: { post: HomePost }) {
  const myVote = useMyVote(post.id);
  const options = post.question.options;
  const columns = useRef<(HTMLButtonElement | null)[]>([]);
  const token = useRef<HTMLDivElement>(null);
  // 내 칸에 들어가 앉은 토큰 (칸 이름과 % 사이, 차오른 색 바로 위)
  const landed = useRef<HTMLSpanElement>(null);
  // 토큰이 칸으로 날아가는 애니메이션의 출발점 (투표 직전 위치)
  const flyFrom = useRef<DOMRect | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number; startX: number; startY: number } | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  // 투표 영역이 처음 화면에 들어왔는지 (그때 토큰 떨어지기·흔들기 연출)
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setInView(true);
        observer.disconnect();
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const votes = post.votes.map((n, i) => n + (i === myVote ? 1 : 0));
  const total = votes.reduce((sum, n) => sum + n, 0);
  const pcts = votes.map((n) => (total ? Math.round((n / total) * 100) : 0));

  // 투표 직후: 토큰을 원래 자리에서 새 자리(내 칸)로 날려 보냅니다.
  useLayoutEffect(() => {
    const from = flyFrom.current;
    const el = landed.current;
    if (!from || !el || myVote === null) return;
    flyFrom.current = null;
    const to = el.getBoundingClientRect();
    // 출발: 원래 토큰 자리(가운데 맞춤) → 도착: 내 칸 차오른 색 바로 위, 돌면서 떨어짐
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    el.animate(
      [
        { translate: `${dx}px ${dy}px`, rotate: "120deg", scale: `${from.width / to.width}` },
        { translate: "0 0", rotate: "0deg", scale: "1" },
      ],
      { duration: TOKEN_MS, easing: BACK_OUT },
    );
  }, [myVote]);

  // 분석: 화면에 들어와서 투표까지 걸린 시간, 처음 투표인지 선택을 바꾼 건지
  const mountedAt = useRef(0);
  useEffect(() => {
    mountedAt.current = performance.now();
  }, []);

  // 로그인 전에 고른 칸 — 로그인하면 바로 투표
  const { loggedIn, logIn } = useFlow();
  const [pending, setPending] = useState<{ choice: number; method: "drag" | "tap" } | null>(null);

  const vote = (choice: number, method: "drag" | "tap" = "tap") => {
    if (choice === myVote) return; // 이미 고른 칸
    if (!loggedIn) {
      track("login_sheet_opened", { from: "vote", post_id: post.id, method });
      setPending({ choice, method });
      return;
    }
    castVote(choice, method);
  };

  const castVote = (choice: number, method: "drag" | "tap") => {
    track(myVote === null ? "vote_cast" : "vote_changed", {
      post_id: post.id,
      choice,
      previous: myVote,
      options_count: options.length,
      method,
      seconds_to_vote: Math.round((performance.now() - mountedAt.current) / 100) / 10,
      total_votes_before: total,
    });
    flyFrom.current = (landed.current ?? token.current)?.getBoundingClientRect() ?? null;
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
      <span className={`inline-block origin-[50%_85%] ${inView ? "animate-[wave_1.2s_ease-in-out_650ms_infinite]" : ""}`}>🇰🇷</span>
    </div>
  );

  return (
    <section
      ref={sectionRef}
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
            style={{
              transform: drag ? `translate(${drag.x}px, ${drag.y}px) scale(1.1)` : undefined,
              animation: inView ? "token-drop 700ms cubic-bezier(0.3, 1.4, 0.5, 1) both" : undefined,
              opacity: inView ? undefined : 0,
            }}
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
              className={`relative h-[230px] min-w-0 flex-1 rounded-[20px] text-left transition-[background-color,scale] ${
                hover === i ? "bg-[#2e2e2e]" : "bg-[#1e1e1e]"
              } ${mine ? "cursor-default" : "active:scale-[0.98]"}`}
            >
              {/* 투표 전: 토큰을 끌어다 대면 그 칸이 물결치며 살짝 차오름 */}
              {!voted && (
                <span className="absolute inset-0 overflow-hidden rounded-[20px]">
                  <span
                    className="wave-fill absolute inset-x-0 bottom-0 bg-primary transition-[height] duration-700 ease-[cubic-bezier(0.3,1.15,0.5,1)]"
                    style={{ height: hover === i ? "38%" : "0%" }}
                  />
                </span>
              )}
              {/* 차오르는 결과는 칸 모양으로 잘라 냄 (칸 자체는 잘라 내지 않아야 날아오는 토큰이 칸 밖에서도 보임) */}
              {voted && (
                <span className="absolute inset-0 overflow-hidden rounded-[20px]">
                  <span
                    className={`absolute inset-x-0 bottom-0 transition-[height] duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] starting:h-0 ${
                      mine ? "wave-fill bg-primary" : "bg-white/10"
                    }`}
                    style={{ height: `${pcts[i]}%`, transitionDelay: `${FILL_DELAY_MS + i * FILL_STAGGER_MS}ms` }}
                  />
                </span>
              )}
              <span
                className={`absolute top-0 left-0 w-full pr-2 pl-4 text-[14px] leading-[1.25] font-medium tracking-[-0.42px] whitespace-pre-line pt-4 transition-opacity ${
                  mine || hover === i ? "opacity-100" : "opacity-40"
                }`}
              >
                {label}
              </span>
              {voted && (
                <span
                  className={`${title} absolute bottom-3 left-4 transition-opacity duration-300 starting:opacity-0 ${mine ? "text-on-light" : "text-on-dark"}`}
                  style={{ transitionDelay: `${FILL_DELAY_MS + i * FILL_STAGGER_MS}ms` }}
                >
                  {pcts[i]}%
                </span>
              )}
              {/* 투표하면 토큰은 칸 이름과 % 사이, 차오른 색 바로 위 가운데에 앉음 (투표 전 토큰과 같은 회색 원) */}
              {mine && (
                <span
                  ref={landed}
                  aria-hidden="true"
                  className="absolute left-[calc(50%-32px)] flex size-16 items-center justify-center rounded-full bg-on-light text-[25px] leading-none shadow-[0_6px_16px_rgba(0,0,0,0.35)]"
                  style={{ bottom: `min(calc(${pcts[i]}% + 8px), 110px)` }}
                >
                  {/* 칸에 들어가 앉으면 한 번 손 흔들기 */}
                  <span className="inline-block origin-[50%_85%] animate-[wave_1s_ease-in-out_450ms_both]">🇰🇷</span>
                </span>
              )}
            </button>
          );
        })}
      </div>

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
