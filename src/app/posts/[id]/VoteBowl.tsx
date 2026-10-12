"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import type { HomePost } from "@/app/home/mockPosts";
import { saveVote, useMyVote } from "@/app/home/votes";
import { LoginSheet } from "@/components/LoginSheet";
import { track } from "@/lib/analytics";
import { useFlow } from "@/lib/write-store";
import { burstConfetti } from "./confetti";

const title = "font-(family-name:--font-paperlogy) text-[24px] leading-[1.3] tracking-[-0.72px]";

/*
  랜딩 화면 투표 장면과 같은 움직임 (src/app/landing/LandingScreen.tsx)
  - 🇰🇷 토큰: 120° 돌며 내 칸(칸 이름과 % 사이)으로 떨어지고, 살짝 지나쳤다가 제자리 (랜딩의 backOut, c = 1.9)
  - 칸 결과: 토큰이 반쯤 왔을 때부터 칸마다 조금씩 늦게 아래에서 차오르고, %는 그때 나타남
  랜딩 마지막 "당신은 누구인가요?" 칸과 같은 움직임
  - 투표 영역이 처음 보이면 토큰이 위에서 톡 떨어지고, 투표하기 전까지 🇰🇷가 계속 손 흔들듯 흔들림 (token-drop · wave)
  - 내 칸의 색은 윗변이 물결 모양으로 옆으로 흐르며 차오름 (wave-fill), 토큰을 끌어다 대면 살짝 차오름
  - 투표 전에는 토큰이 칸마다 차례로 살짝 들어갔다 나오며 투표를 유도 (들어간 칸은 물결치며 살짝 차오름, 토큰을 만지면 멈춤)
*/
const BACK_OUT =
  "linear(0, 0.228, 0.425, 0.592, 0.731, 0.845, 0.936, 1.006, 1.058, 1.092, 1.112, 1.12, 1.118, 1.108, 1.093, 1.073, 1.053, 1.033, 1.016, 1.004, 1)";
const TOKEN_MS = 600;
const FILL_DELAY_MS = 300;
const FILL_STAGGER_MS = 80;
// 투표 유도 힌트: 토큰이 떨어지고 나서 시작까지, 칸 하나 다녀오는 시간, 칸 안으로 들어가는 깊이(칸 윗변에서 토큰 가운데까지)
const HINT_DELAY_MS = 1500;
const HINT_STEP_MS = 1500;
const HINT_DIP = -22; // 음수: 토큰 가운데는 칸 위에 있고 아랫부분만 칸에 살짝 걸침 (칸 이름을 가리지 않게)
const HINT_LIFT = 28; // 곡선이 위로 떠오르는 정도
const HINT_SAMPLES = 12; // 곡선을 나누는 점 개수 (많을수록 매끈)

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
    // 투표할 때마다(선택을 바꿀 때도) 토큰이 내 칸에 앉을 즈음 그 칸에서 폭죽이 터짐
    const col = columns.current[choice];
    if (col) {
      window.setTimeout(() => {
        const r = col.getBoundingClientRect();
        burstConfetti(r.left + r.width / 2, r.top + r.height * 0.45);
      }, TOKEN_MS * 0.5);
    }
  };

  const columnAt = (x: number, y: number) =>
    columns.current.findIndex((el) => {
      const r = el?.getBoundingClientRect();
      return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    });

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    setTokenTouched(true);
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

  // 투표 유도 (랜딩 "당신은 누구인가요?"와 같은 힌트): 토큰이 칸마다 차례로 살짝 들어갔다 나오고,
  // 들어간 칸은 물결치며 살짝 차오름. 토큰을 만지면 멈춥니다.
  const peeks = useRef<(HTMLSpanElement | null)[]>([]);
  const [tokenTouched, setTokenTouched] = useState(false);
  useEffect(() => {
    if (!inView || voted || tokenTouched) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const anims: Animation[] = [];
    // 토큰이 떨어져 자리 잡은 뒤에 시작
    const timer = window.setTimeout(() => {
      const el = token.current;
      if (!el) return;
      const t = el.getBoundingClientRect();
      const n = options.length;
      const seg = 1 / (n + 1); // 칸 하나에 한 구간 + 마지막은 쉬는 구간
      const duration = HINT_STEP_MS * (n + 1);
      const ease = "ease-in-out";
      const tokenFrames: Keyframe[] = [{ offset: 0, translate: "0 0", rotate: "0deg" }];
      columns.current.forEach((col, k) => {
        if (!col) return;
        const c = col.getBoundingClientRect();
        const dx = c.left + c.width / 2 - (t.left + t.width / 2);
        const dy = c.top + HINT_DIP - (t.top + t.height / 2);
        const a = k * seg;
        const mid = a + seg / 2;
        const b = a + seg;
        // 직선 대신 위로 살짝 떠올랐다 내려앉는 완만한 곡선(2차 베지어)을 따라 갔다가 같은 길로 돌아옴
        const tilt = Math.abs(dx) < 1 ? 0 : Math.sign(dx) * 10;
        const at = (u: number) => {
          const s = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2; // 천천히 출발·도착
          const cx = dx / 2;
          const cy = Math.min(0, dy) - HINT_LIFT;
          const x = 2 * (1 - s) * s * cx + s * s * dx;
          const y = 2 * (1 - s) * s * cy + s * s * dy;
          return { translate: `${x}px ${y}px`, rotate: `${tilt * s}deg` };
        };
        for (let j = 1; j <= HINT_SAMPLES; j++) {
          tokenFrames.push({ offset: a + (seg / 2) * (j / HINT_SAMPLES), ...at(j / HINT_SAMPLES) });
        }
        for (let j = HINT_SAMPLES - 1; j >= 0; j--) {
          tokenFrames.push({ offset: b - (seg / 2) * (j / HINT_SAMPLES), ...at(j / HINT_SAMPLES) });
        }
        const peek = peeks.current[k];
        if (peek) {
          anims.push(
            peek.animate(
              [
                { offset: 0, height: "0%" },
                { offset: a, height: "0%", easing: ease },
                { offset: mid, height: "36%", easing: ease },
                { offset: b, height: "0%" },
                { offset: 1, height: "0%" },
              ],
              { duration, iterations: Infinity },
            ),
          );
        }
      });
      tokenFrames.push({ offset: 1, translate: "0 0", rotate: "0deg" });
      anims.push(el.animate(tokenFrames, { duration, iterations: Infinity }));
    }, HINT_DELAY_MS);
    return () => {
      clearTimeout(timer);
      anims.forEach((a) => a.cancel());
    };
  }, [inView, voted, tokenTouched, options.length]);

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
                    ref={(el) => {
                      peeks.current[i] = el;
                    }}
                    className="wave-fill absolute inset-x-0 bottom-0 bg-primary transition-[height] duration-700 ease-[cubic-bezier(0.3,1.15,0.5,1)]"
                    style={{ height: hover === i ? "38%" : "0%" }}
                  />
                </span>
              )}
              {/* 차오르는 결과는 칸 모양으로 잘라 냄 (칸 자체는 잘라 내지 않아야 날아오는 토큰이 칸 밖에서도 보임) */}
              {/* 내 칸은 색이 글자 위를 덮고(z-1), 그 안에 같은 글자를 어두운 색으로 다시 그림 →
                  물결 아래는 어두운 글자, 물결 위는 흰 글자 (인스타 투표처럼 경계에서 글자색이 갈림) */}
              {voted && (
                <span className={`absolute inset-0 overflow-hidden rounded-[20px] ${mine ? "z-[1]" : ""}`}>
                  {/* 높이는 CSS 변수로 줘야 starting:h-0(처음 그려질 때 0에서 시작)이 먹어서 아래에서 차오름.
                      내 칸이 바뀌면 새로 그려서 새 내 칸도 바닥부터 물결치며 차오르게 (key) */}
                  <span
                    key={mine ? "mine" : "other"}
                    className={`absolute inset-x-0 bottom-0 h-(--fill) transition-[height] duration-700 starting:h-0 ${
                      mine
                        ? "wave-fill bg-primary ease-[cubic-bezier(0.3,1.15,0.5,1)]"
                        : "bg-white/10 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
                    }`}
                    style={
                      {
                        "--fill": `${pcts[i]}%`,
                        transitionDelay: `${FILL_DELAY_MS + i * FILL_STAGGER_MS}ms`,
                      } as CSSProperties
                    }
                  >
                    {mine && (
                      <>
                        {/* 칸 맨 위 기준 자리 = 색 영역 맨 위에서 (칸 높이 - 색 높이)만큼 위 */}
                        <span aria-hidden className="absolute left-0 w-full pt-4 pr-2 pl-4 font-(family-name:--font-paperlogy) text-[16px] leading-[1.3] tracking-[-0.32px] whitespace-pre-line text-on-light" style={{ top: "calc(100% - 230px)" }}>
                          {label}
                        </span>
                        <span aria-hidden className={`${title} absolute bottom-3 left-4 text-on-light`}>
                          {pcts[i]}%
                        </span>
                      </>
                    )}
                  </span>
                </span>
              )}
              <span
                className="absolute top-0 left-0 w-full pt-4 pr-2 pl-4 font-(family-name:--font-paperlogy) text-[16px] leading-[1.3] tracking-[-0.32px] whitespace-pre-line text-on-dark"
              >
                {label}
              </span>
              {voted && (
                <span
                  className={`${title} absolute bottom-3 left-4 text-on-dark transition-opacity duration-300 starting:opacity-0`}
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
                  className="absolute left-[calc(50%-32px)] z-[2] flex size-16 items-center justify-center rounded-full bg-on-light text-[25px] leading-none shadow-[0_6px_16px_rgba(0,0,0,0.35)]"
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
