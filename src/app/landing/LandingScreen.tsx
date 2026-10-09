"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { TrackedLink } from "@/components/Track";
import { track, useTrackOnce } from "@/lib/analytics";
import { COPY, REACTIONS, SAMPLE_PCTS, type LandingLang } from "./copy";

/*
  랜딩 — "한 접시를 둘러싼 참견" (6. 랜딩, 담당 송희)

  제목은 맨 위에 고정, 첫 화면부터 게시물(사진 + 사연 타이핑)이 보입니다.
  스크롤할수록 투표 → 한마디 → 글쓴이 답글이 차례로 날아와 붙고,
  장면이 끝나면 게시물이 작아지며 역할 버튼이 아래에서 올라옵니다.
*/

// 스크롤 이야기 구간 (0~1)
const STEP_AT = [0, 0.1, 0.42, 0.74];
// 스크롤이 멈추는 자리 (진행도). 섹션 높이 400svh - 화면 100svh = 300svh 기준
const SNAP_AT = [0, 0.345, 0.66, 0.83, 1];

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
/** p가 a→b 사이에서 0→1 */
const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
/** 살짝 지나쳤다가 돌아오는 (통통 튀는) 곡선 */
const backOut = (t: number) => {
  const c = 1.9;
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
};

const noMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** 화면 밖에서 날아와 자리에 붙는 스타일 */
function fly(p: number, a: number, b: number, from: { x?: number; y?: number; r?: number; s?: number }, rest = 0): CSSProperties {
  const raw = seg(p, a, b);
  const t = noMotion() ? (raw > 0 ? 1 : 0) : backOut(raw);
  const k = 1 - t;
  return {
    opacity: clamp(raw * 3),
    translate: `${(from.x ?? 0) * k}px ${(from.y ?? 0) * k}px`,
    rotate: `${(from.r ?? 0) * k + rest}deg`,
    scale: `${1 - (1 - (from.s ?? 1)) * k}`,
  };
}

const subscribeNone = () => () => {};
/** 글쓴이 답글 말풍선 기울기 (작성자 표시도 들어가면서 같이 기울어짐) */
const REPLY_TILT = -3;

export function LandingScreen() {
  // 언어: 처음엔 브라우저 언어, 이후엔 고른 언어
  const browserLang = useSyncExternalStore<LandingLang>(
    subscribeNone,
    () => (navigator.language.toLowerCase().startsWith("ko") ? "ko" : "en"),
    () => "ko",
  );
  const [chosen, setChosen] = useState<LandingLang | null>(null);
  const lang = chosen ?? browserLang;
  const t = COPY[lang];

  useTrackOnce("landing_viewed", { variant: "story", lang });

  // 스크롤 진행도
  // - 화면에 쓰는 값(p)은 실제 스크롤 위치를 부드럽게 따라감 → 휙 내려도 연출이 다 보임
  // - 단계마다 스크롤이 멈추는 자리(스냅)가 있어서, 세게 넘겨도 한 단계씩 넘어감
  const story = useRef<HTMLElement>(null);
  const [p, setP] = useState(0);
  const seen = useRef(0);
  useEffect(() => {
    // 새로고침하면 맨 위에서 시작
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    const root = document.documentElement;
    const prevSnap = root.style.scrollSnapType;
    root.style.scrollSnapType = "y mandatory";

    let target = 0;
    let shown = 0;
    let frame = 0;
    const read = () => {
      const el = story.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      target = clamp(-r.top / (r.height - window.innerHeight));
      const step = STEP_AT.filter((s) => target >= s + 0.02).length;
      if (step > seen.current) {
        seen.current = step;
        track("landing_scrolled", { step });
      }
    };
    const tick = () => {
      const gap = target - shown;
      if (Math.abs(gap) < 0.0005) {
        shown = target;
        setP(shown);
        frame = 0;
        return;
      }
      // 천천히 따라감: 남은 거리의 6%씩, 한 프레임 최대 0.005 (한 단계 ≈ 1초)
      shown += noMotion() ? gap : clamp(gap * 0.06, -0.005, 0.005);
      setP(shown);
      frame = requestAnimationFrame(tick);
    };
    const onScroll = () => {
      read();
      if (!frame) frame = requestAnimationFrame(tick);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
      root.style.scrollSnapType = prevSnap;
    };
  }, []);

  const step = STEP_AT.filter((s) => p >= s).length - 1;

  // 마지막에 버튼이 올라오면, 게시물은 버튼 위에 딱 들어갈 만큼만 작아짐 (최대 85%)
  const cardRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const postRef = useRef<HTMLDivElement>(null);
  const authorRef = useRef<HTMLSpanElement>(null);
  const replyRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLSpanElement>(null);
  const [endScale, setEndScale] = useState(0.85);
  // 가운데 정렬용: 제목 아래 남는 높이, 게시물만의 높이, 투표·답글까지 붙은 높이
  const [box, setBox] = useState({
    room: 0,
    post: 0,
    full: 0,
    last: 0,
    endRoom: 0,
    overhang: 0,
    fit: 1,
    // 작성자 표시: 카드 안 자리 → 답글 위 자리 (게시물 카드 기준 좌표)
    author: { x: 0, y: 0 },
    slot: { x: 0, y: 0 },
  });
  useEffect(() => {
    const measure = () => {
      const card = cardRef.current;
      const cta = ctaRef.current;
      const post = postRef.current;
      const stage = card?.parentElement;
      if (!card || !cta || !post || !stage) return;
      const top = card.offsetTop;
      const room = cta.offsetTop - 8 - top; // 버튼과 40px 정도 띄움 (버튼 영역 위쪽 32px은 그라데이션)
      const full = card.offsetHeight; // 게시물 + 투표
      // 마지막 장면: 게시물 + 아래로 삐져나온 글쓴이 답글
      const overhang = Math.max(0, (authorRef.current?.offsetTop ?? 0) - 2 + (replyRef.current?.offsetHeight ?? 0) - post.offsetHeight + 6);
      const last = post.offsetHeight + overhang;
      const author = authorRef.current;
      const reply = replyRef.current;
      const slot = slotRef.current;
      setEndScale(clamp(room / last, 0.6, 0.9));
      setBox({
        room: stage.clientHeight - top - 64,
        post: post.offsetHeight,
        full,
        last,
        endRoom: room,
        // 투표가 붙어 있을 때 화면 안에 다 들어오게 하는 크기
        overhang,
        fit: clamp((stage.clientHeight - top - 40) / full, 0.6, 1),
        author: { x: author?.offsetLeft ?? 0, y: author?.offsetTop ?? 0 },
        slot: {
          x: (reply?.offsetLeft ?? 0) + (slot?.offsetLeft ?? 0),
          // 답글 묶음은 작성자 원래 줄(author.y)에 맞춰 놓으므로 그 기준으로
          y: (author?.offsetTop ?? 0) - 2 + (slot?.offsetTop ?? 0),
        },
      });
    };
    measure();
    // 첫 진입 연출(사진 크기 변화)이 끝난 뒤, 글꼴이 다 불러와진 뒤, 크기가 바뀔 때마다 다시 잼
    const later = window.setTimeout(measure, 2000);
    document.fonts?.ready.then(measure);
    const observer = new ResizeObserver(measure);
    if (postRef.current) observer.observe(postRef.current);
    if (replyRef.current) observer.observe(replyRef.current);
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(later);
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [lang]);
  const done = p >= 0.86;
  // 제목: 0 소개(=글 올리기) · 1 투표 · 2 한마디 · 3 답글 · 4 마지막
  const scene = done ? 4 : step;
  const shrink = seg(p, 0.84, 0.94);
  // 처음엔 게시물이 조금 아래, 투표가 붙을수록 위로 올라감 (마지막엔 제목 바로 아래)
  // 한 번에 하나만: 투표는 다음 단계(한마디)가 오면 내려가며 사라짐
  const voteOut = seg(p, 0.36, 0.43);
  const voteShown = seg(p, 0.06, 0.2) * (1 - voteOut);
  const shown = box.post + (box.full - box.post) * voteShown + box.overhang * seg(p, 0.72, 0.82);
  // 답글 단계: 작성자 표시가 카드에서 답글 자리로 이동 (부드럽게 출발·도착)
  const moveRaw = seg(p, 0.75, 0.82);
  const move = moveRaw < 0.5 ? 2 * moveRaw * moveRaw : 1 - (-2 * moveRaw + 2) ** 2 / 2;
  // 수학적 가운데는 눈에 낮아 보여서, 남는 공간의 35% 지점(최대 120px)에 둡니다
  const stepScale = 1 - (1 - box.fit) * voteShown;
  const startOffset = Math.min(120, Math.max(0, (box.room - shown * stepScale) * 0.35));
  // 마지막: 제목과 버튼 사이에서도 같은 방식으로 (작아진 크기 기준)
  const endOffset = Math.max(0, (box.endRoom - box.last * endScale) * 0.4);
  const centerOffset = startOffset + (endOffset - startOffset) * shrink;
  // 사연은 들어오자마자 저절로 타이핑 (첫 화면이 비어 보이지 않게)
  const [clock, setClock] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setClock((c) => (c > 120 ? (window.clearInterval(id), c) : c + 1)), 45);
    return () => window.clearInterval(id);
  }, []);
  const typed = Math.min(t.story.length, Math.max(clock - 36, 0));

  return (
    <main className="mx-auto w-full max-w-[430px] bg-background text-on-dark">
      {/* 상단: 로고 · 언어 */}
      <header className="fixed inset-x-0 top-0 z-40 mx-auto flex h-[calc(56px+env(safe-area-inset-top))] w-full max-w-[430px] items-center justify-between bg-background px-5 pt-[env(safe-area-inset-top)]">
        <span className="font-display text-[19px] leading-none">{t.brand}</span>
        <div className="flex rounded-full bg-surface p-1 text-[13px] font-bold" role="group" aria-label="Language">
          {(["ko", "en"] as const).map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={lang === l}
              onClick={() => {
                setChosen(l);
                track("language_clicked", { from: "landing", to: l });
              }}
              className={`rounded-full px-3 py-1.5 uppercase transition ${lang === l ? "bg-on-dark text-on-light" : "text-neutral-400"}`}
            >
              {l}
            </button>
          ))}
        </div>
      </header>

      {/* 첫 화면부터 장면이 보이고, 스크롤하면 이어집니다 */}
      <section ref={story} className="relative h-[400svh]" aria-label={t.scroll}>
        {/* 스크롤이 멈추는 자리: 첫 화면 · 투표 · 한마디 · 답글 · 마지막 (각 장면이 다 그려진 지점) */}
        {SNAP_AT.map((at) => (
          <span
            key={at}
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 h-px snap-start snap-always"
            style={{ top: `${at * 300}svh` }}
          />
        ))}
        <div className="sticky top-0 flex h-[100svh] flex-col overflow-hidden px-5 pt-[calc(100px+env(safe-area-inset-top))]">
          {/* 제목 — 스크롤 단계마다 바뀜 (첫 화면은 서비스 한 줄 소개) */}
          <h1
            key={`${lang}-${scene}`}
            aria-live="polite"
            className="min-h-[2.4em] break-keep text-center font-display text-[32px] leading-[1.2]"
          >
            {t.titles[scene].map((line, i) => (
              <span key={line} className="block animate-rise" style={{ animationDelay: `${i * 80}ms` }}>
                {line}
              </span>
            ))}
          </h1>

          {/* 게시물 — 마지막에 버튼이 올라오면 작아지며 위로 */}
          <div
            ref={cardRef}
            className="mt-6 origin-top"
            style={{ scale: `${stepScale + (endScale - stepScale) * shrink}`, translate: `0 ${centerOffset}px` }}
          >
          <div className="relative mx-auto w-full" style={{ maxWidth: `calc(300px + (100% - 300px) * ${voteShown})` }}>
            {/* 피드 카드 (앱 메인과 같은 모양: 물결 사진 + 질문 칩 + 제목 + 작성자)
                첫 진입: 사진이 크게 "올라왔다가" 삐죽한 물결 모양으로 오므라들고, 그 둘레로 카드가 생김 */}
            <div ref={postRef} className="relative isolate rounded-[32px] px-5 pt-7 pb-6 text-on-dark">
              <span
                aria-hidden="true"
                className="absolute inset-0 -z-10 animate-[fade-in_500ms_ease-out_1300ms_both] rounded-[32px] bg-surface"
              />
              <div
                className="relative mx-auto animate-photo-frame overflow-hidden [animation-delay:250ms]"
                style={
                  {
                    "--s": "min(200px, 23svh)",
                    "--big": "min(280px, 32svh)",
                    width: "var(--s)",
                    height: "var(--s)",
                    maskImage: "url(/images/card-mask.svg)",
                    WebkitMaskImage: "url(/images/card-mask.svg)",
                    maskSize: "100% 100%",
                    WebkitMaskSize: "100% 100%",
                    maskPosition: "center",
                    WebkitMaskPosition: "center",
                    maskRepeat: "no-repeat",
                    WebkitMaskRepeat: "no-repeat",
                  } as CSSProperties
                }
              >
                <Image
                  src="/images/buldak-skillet.jpg"
                  alt={lang === "ko" ? "치즈를 듬뿍 올린 불닭볶음면" : "Buldak noodles with lots of cheese"}
                  fill
                  sizes="220px"
                  priority
                  className="animate-photo-in object-cover object-[50%_70%] [animation-delay:350ms]"
                />
              </div>
              <div className="mt-6 flex flex-col items-start gap-2">
                <span className="animate-pop rounded-full bg-white/10 px-2.5 py-[5px] text-[12px] font-semibold leading-[1.2] mb-1.5 text-neutral-400 [animation-delay:1500ms]">
                  {t.question}
                </span>
                {/* 완성된 글 크기만큼 자리를 먼저 잡고, 그 위에 타이핑 (아래가 비거나 들썩이지 않게) */}
                <p className="relative w-full whitespace-pre-line break-keep font-display text-[22px] leading-[1.25]">
                  <span className="invisible">{t.story}</span>
                  <span className="absolute inset-0">
                    {t.story.slice(0, typed)}
                    {clock >= 34 && typed < t.story.length && (
                      <span className="ml-0.5 inline-block h-[0.9em] w-[3px] translate-y-[2px] animate-pulse bg-on-dark" />
                    )}
                  </span>
                </p>
                {/* 자리만 잡아 둠 — 실제 작성자 표시는 아래 traveler (답글 단계에서 답글 자리로 옮겨 감) */}
                <span ref={authorRef} className="invisible flex items-center gap-[5px] text-[13px] font-semibold" aria-hidden="true">
                  <span className="text-[15px]">🇨🇦</span>
                  {t.author}
                </span>
              </div>

              {/* 작성자: 카드에서 → 답글 작성자 자리로 이동 */}
              <span
                className="absolute z-20 flex animate-pop items-center gap-[5px] whitespace-nowrap text-[13px] font-semibold text-neutral-400 [animation-delay:1650ms]"
                style={{
                  left: box.author.x,
                  top: box.author.y,
                  translate: `${(box.slot.x - box.author.x) * move}px ${(box.slot.y - box.author.y) * move}px`,
                  rotate: `${REPLY_TILT * move}deg`,
                  transformOrigin: "0 50%",
                }}
              >
                <span className="text-[15px]" aria-hidden="true">
                  🇨🇦
                </span>
                {t.author}
              </span>
              {/* 글쓴이 답글 — 말풍선이 먼저 붙고, 카드의 작성자(Sam)가 말풍선 안 맨 위로 들어감 (같이 기울어짐) */}
              <div
                ref={replyRef}
                className="absolute right-0 z-10"
                style={{ top: box.author.y - 2, rotate: `${REPLY_TILT}deg`, transformOrigin: "16px 19px" }}
              >
                <span
                  className="flex max-w-[240px] flex-col gap-1 rounded-[24px] bg-surface-2 px-4 pt-2.5 pb-3 text-on-dark ring-1 ring-white/10"
                  style={fly(p, 0.72, 0.79, { y: 40, s: 0.6 })}
                >
                  <span ref={slotRef} className="invisible flex items-center gap-[5px] whitespace-nowrap text-[13px] font-semibold" aria-hidden="true">
                    <span className="text-[15px]">🇨🇦</span>
                    {t.author}
                  </span>
                  <span className="break-keep text-[14px] font-bold leading-[1.35]">{t.reply}</span>
                </span>
              </div>
            </div>

            {/* 투표 (앱 상세와 같은 모양: 세로 칸이 아래에서 차오름) */}
            <div className="mt-3" style={{ opacity: 1 - voteOut, translate: `0 ${voteOut * 60}px` }} aria-hidden={voteOut >= 1}>
            <div className="relative rounded-[32px] bg-surface-2 px-4 pt-5 pb-4" style={fly(p, 0.1, 0.17, { y: 260, r: -6 })}>
              <p className="text-center font-display text-[18px] leading-[1.3]">{t.voteTitle}</p>
              <div className="mt-3 flex h-[min(128px,15svh)] gap-1.5">
                {t.options.map((opt, i) => {
                  const fill = seg(p, 0.24 + i * 0.02, 0.34) * SAMPLE_PCTS[i];
                  const mine = i === 0;
                  return (
                    <div
                      key={opt}
                      className="relative min-w-0 flex-1 rounded-[20px] bg-surface"
                      style={fly(p, 0.14 + i * 0.03, 0.21 + i * 0.03, { y: 120 })}
                    >
                      <span
                        className={`absolute inset-x-0 bottom-0 rounded-b-[20px] ${mine ? "bg-primary" : "bg-white/10"}`}
                        style={{ height: `${fill}%` }}
                      />
                      {/* 🇰🇷 토큰이 위에서 떨어져 내가 고른 칸으로 */}
                      {mine && (
                        <span
                          aria-hidden="true"
                          className="absolute right-1.5 top-1.5 flex size-9 items-center justify-center rounded-full bg-on-dark text-[16px]"
                          style={fly(p, 0.2, 0.27, { y: -420, r: 120, s: 0.6 })}
                        >
                          🇰🇷
                        </span>
                      )}
                      <span className="absolute left-3 top-2.5 whitespace-pre-line pr-1 text-[12px] font-medium leading-[1.25] opacity-60">
                        {opt}
                      </span>
                      <span
                        className={`absolute bottom-2 left-3 font-display text-[18px] tabular-nums ${mine ? "text-on-light" : "text-on-dark"}`}
                        style={{ opacity: seg(p, 0.24, 0.28) }}
                      >
                        {Math.round(fill)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            </div>

            {/* 한국인 반응 — 앱 댓글 더미처럼 알약 모양, 사진 가장자리에 걸치게 */}
            <Bubble
              lang={lang}
              r={REACTIONS[0]}
              className="-left-2 top-[5%] bg-primary"
              style={fly(p, 0.42, 0.49, { x: -300, y: -40, r: -30 }, -6)}
            />
            <Bubble
              lang={lang}
              r={REACTIONS[1]}
              className="-right-2 top-[17%] max-w-[200px] bg-content"
              style={fly(p, 0.48, 0.55, { x: 300, y: 20, r: 25 }, 5)}
            />
            <Bubble
              lang={lang}
              r={REACTIONS[2]}
              className="-left-1 top-[30%] bg-lilac"
              style={fly(p, 0.54, 0.61, { x: -300, y: 60, r: -20 }, 3)}
            />
          </div>
          </div>

          {/* 스크롤 안내 — 조금 내리면 사라짐 */}
          <span
            aria-hidden="true"
            className="absolute bottom-[calc(20px+env(safe-area-inset-bottom))] left-1/2 flex size-11 -translate-x-1/2 items-center justify-center rounded-full bg-surface text-[16px] font-semibold text-neutral-400 transition-opacity duration-500"
            style={{ opacity: clock > 45 && p < 0.03 ? 1 : 0 }}
          >
            <span className="animate-float">↓</span>
          </span>

          {/* 장면이 다 끝나면 역할 버튼 */}
          <div
            ref={ctaRef}
            inert={!done}
            className="absolute inset-x-0 bottom-0 bg-gradient-to-b from-background/0 via-background via-25% to-background px-5 pt-8 pb-[calc(20px+env(safe-area-inset-bottom))]"
            style={fly(p, 0.86, 0.94, { y: 260 })}
          >
            <RoleButtons lang={lang} />
          </div>
        </div>
      </section>

    </main>
  );
}

function RoleButtons({ lang }: { lang: LandingLang }) {
  const t = COPY[lang];
  return (
    <div className="flex flex-col gap-2">
      <RoleButton href="/home" tone="bg-primary" role={t.korean.role} action={t.korean.action} kind="korean" />
      <RoleButton href="/home/en" tone="bg-content" role={t.foreigner.role} action={t.foreigner.action} kind="foreigner" />
      <TrackedLink
        href="/home"
        event="landing_login_clicked"
        className="py-1 text-center text-[14px] font-bold leading-[1.3] text-neutral-400"
      >
        {t.login}
      </TrackedLink>
    </div>
  );
}

function RoleButton({
  href,
  tone,
  role,
  action,
  kind,
}: {
  href: string;
  tone: string;
  role: string;
  action: string;
  kind: "korean" | "foreigner";
}) {
  return (
    <TrackedLink
      href={href}
      event="role_selected"
      props={{ role: kind }}
      superProps={{ user_type: kind }}
      className={`flex h-[72px] items-center gap-3 rounded-full py-2 pl-7 pr-2 text-on-light transition active:scale-[0.99] ${tone}`}
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-display text-[20px] leading-[1.15]">{role}</span>
        <span className="text-[13px] font-semibold opacity-70">{action}</span>
      </span>
      <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-background text-on-dark" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </span>
    </TrackedLink>
  );
}

function Bubble({
  lang,
  r,
  className,
  style,
}: {
  lang: LandingLang;
  r: { ko: string; en: string };
  className: string;
  style: CSSProperties;
}) {
  return (
    <div
      className={`absolute z-10 flex flex-col items-center rounded-[32px] px-5 py-3 text-center text-on-light ${className}`}
      style={style}
    >
      <span className="break-keep text-[15px] font-bold leading-[1.35] tracking-[-0.3px]">{r.ko}</span>
      {lang === "en" && <span className="text-[11px] font-semibold leading-[1.3] opacity-60">{r.en}</span>}
    </div>
  );
}
