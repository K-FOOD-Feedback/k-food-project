"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
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
  const story = useRef<HTMLElement>(null);
  const [p, setP] = useState(0);
  const seen = useRef(0);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = story.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const next = clamp(-r.top / (r.height - window.innerHeight));
      setP(next);
      const step = STEP_AT.filter((s) => next >= s + 0.02).length;
      if (step > seen.current) {
        seen.current = step;
        track("landing_scrolled", { step });
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  const step = STEP_AT.filter((s) => p >= s).length - 1;

  // 마지막에 버튼이 올라오면, 게시물은 버튼 위에 딱 들어갈 만큼만 작아짐 (최대 85%)
  const cardRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const postRef = useRef<HTMLDivElement>(null);
  const [endScale, setEndScale] = useState(0.85);
  // 가운데 정렬용: 제목 아래 남는 높이, 게시물만의 높이, 투표·답글까지 붙은 높이
  const [box, setBox] = useState({ room: 0, post: 0, full: 0, endRoom: 0 });
  useEffect(() => {
    const measure = () => {
      const card = cardRef.current;
      const cta = ctaRef.current;
      const post = postRef.current;
      const stage = card?.parentElement;
      if (!card || !cta || !post || !stage) return;
      const top = card.offsetTop;
      const room = cta.offsetTop + 24 - top; // 버튼 영역 위쪽 그라데이션까지는 겹쳐도 됨
      const full = card.offsetHeight + 44; // 아래로 삐져나온 글쓴이 답글
      setEndScale(clamp(room / full, 0.6, 0.85));
      setBox({ room: stage.clientHeight - top - 64, post: post.offsetHeight, full, endRoom: room });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [lang]);
  const done = p >= 0.86;
  // 제목: 0 소개(=글 올리기) · 1 투표 · 2 한마디 · 3 답글 · 4 마지막
  const scene = done ? 4 : step;
  const shrink = seg(p, 0.84, 0.94);
  // 처음엔 게시물이 조금 아래, 투표가 붙을수록 위로 올라감 (마지막엔 제목 바로 아래)
  const shown = box.post + (box.full - box.post) * seg(p, 0.06, 0.2);
  // 수학적 가운데는 눈에 낮아 보여서, 남는 공간의 35% 지점(최대 120px)에 둡니다
  const startOffset = Math.min(120, Math.max(0, (box.room - shown) * 0.35));
  // 마지막: 제목과 버튼 사이에서도 같은 방식으로 (작아진 크기 기준)
  const endOffset = Math.max(0, (box.endRoom - box.full * endScale) * 0.4);
  const centerOffset = startOffset + (endOffset - startOffset) * shrink;
  // 사연은 들어오자마자 저절로 타이핑 (첫 화면이 비어 보이지 않게)
  const [clock, setClock] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setClock((c) => (c > 120 ? (window.clearInterval(id), c) : c + 1)), 45);
    return () => window.clearInterval(id);
  }, []);
  const typed = Math.min(t.story.length, Math.max(clock - 30, 0));

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
        <div className="sticky top-0 flex h-[100svh] flex-col overflow-hidden px-5 pt-[calc(100px+env(safe-area-inset-top))]">
          {/* 제목 — 스크롤 단계마다 바뀜 (첫 화면은 서비스 한 줄 소개) */}
          <h1
            key={`${lang}-${scene}`}
            aria-live="polite"
            className="min-h-[2.3em] break-keep font-display text-[clamp(26px,8vw,32px)] leading-[1.15]"
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
            style={{ scale: `${1 - (1 - endScale) * shrink}`, translate: `0 ${centerOffset}px` }}
          >
          <div className="relative w-full animate-card-enter [animation-delay:350ms]">
            <div ref={postRef} className="overflow-hidden rounded-[28px] bg-content text-on-light shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
              <div className="relative h-[min(230px,27svh)]">
                <Image
                  src="/images/buldak-skillet.jpg"
                  alt={lang === "ko" ? "치즈를 듬뿍 올린 불닭볶음면" : "Buldak noodles with lots of cheese"}
                  fill
                  sizes="400px"
                  priority
                  className="animate-photo-in object-cover object-[50%_65%] [animation-delay:350ms]"
                />
              </div>
              <div className="flex flex-col gap-1.5 px-4 pt-3 pb-4">
                <div className="flex animate-pop items-center gap-1.5 text-[12px] font-bold [animation-delay:1000ms]">
                  <span aria-hidden="true">🇨🇦</span>
                  {t.author}
                </div>
                <p className="min-h-[2.8em] break-keep text-[15px] font-semibold leading-[1.4]">
                  “{t.story.slice(0, typed)}
                  {typed < t.story.length && <span className="ml-px inline-block h-[1em] w-0.5 translate-y-[2px] animate-pulse bg-on-light" />}
                  {typed >= t.story.length && "”"}
                </p>
              </div>
            </div>

            {/* 투표 */}
            <div className="relative -mt-3 rounded-[24px] bg-surface px-4 pt-4 pb-4 shadow-[0_16px_40px_rgba(0,0,0,0.5)]" style={fly(p, 0.1, 0.17, { x: -260, r: -12 })}>
              <p className="text-[14px] font-bold">{t.question}</p>
              <ul className="mt-3 flex flex-col gap-1.5">
                {t.options.map((opt, i) => {
                  const fill = seg(p, 0.24 + i * 0.02, 0.34) * SAMPLE_PCTS[i];
                  return (
                    <li
                      key={opt}
                      className="relative flex h-9 items-center overflow-hidden rounded-full bg-surface-2 px-3.5 text-[13px] font-semibold"
                      style={fly(p, 0.15 + i * 0.03, 0.22 + i * 0.03, { x: 280, r: 8 })}
                    >
                      <span className={`absolute inset-y-0 left-0 rounded-full ${i === 0 ? "bg-primary" : "bg-white/15"}`} style={{ width: `${fill}%` }} />
                      <span className={`relative flex-1 ${i === 0 && fill > 20 ? "text-on-light" : ""}`}>{opt}</span>
                      <span className="relative tabular-nums text-neutral-400">{Math.round(fill)}%</span>
                    </li>
                  );
                })}
              </ul>
              {/* 🇰🇷 토큰이 위에서 떨어져 칸에 들어감 */}
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  className="absolute flex size-8 items-center justify-center rounded-full bg-on-dark text-[15px] shadow-[0_4px_10px_rgba(0,0,0,0.4)]"
                  style={{
                    right: 18 + i * 30,
                    top: -14,
                    ...fly(p, 0.26 + i * 0.025, 0.33 + i * 0.025, { y: -340, r: 90, s: 0.5 }),
                  }}
                >
                  🇰🇷
                </span>
              ))}
            </div>

            {/* 한국인 반응 — 사진 가장자리에 걸치게 */}
            <Bubble
              lang={lang}
              r={REACTIONS[0]}
              className="-left-2 top-[7%]"
              style={fly(p, 0.42, 0.49, { x: -300, y: -40, r: -30 }, -5)}
            />
            <Bubble
              lang={lang}
              r={REACTIONS[1]}
              className="-right-2 top-[19%] max-w-[190px]"
              style={fly(p, 0.48, 0.55, { x: 300, y: 20, r: 25 }, 4)}
            />
            <Bubble
              lang={lang}
              r={REACTIONS[2]}
              className="-left-1 top-[33%]"
              style={fly(p, 0.54, 0.61, { x: -300, y: 60, r: -20 }, 3)}
            />
            <Emoji emoji="🧀" className="right-4 -top-5" style={fly(p, 0.58, 0.64, { y: -300, r: 180, s: 0.3 }, 12)} />
            <Emoji emoji="🔥" className="left-[40%] -top-6" style={fly(p, 0.62, 0.68, { y: -300, r: -180, s: 0.3 }, -8)} />

            {/* 글쓴이 답글 */}
            <div
              className="absolute right-2 bottom-[-38px] flex max-w-[230px] items-start gap-2 rounded-[20px] bg-content px-3.5 py-2.5 text-on-light shadow-[0_12px_30px_rgba(0,0,0,0.5)]"
              style={fly(p, 0.74, 0.82, { y: 220, s: 0.6 }, -2)}
            >
              <span aria-hidden="true" className="text-[16px] leading-[1.3]">
                🇨🇦
              </span>
              <span className="break-keep text-[13px] font-bold leading-[1.35]">{t.reply}</span>
            </div>
          </div>
          </div>

          {/* 스크롤 안내 — 조금 내리면 사라짐 */}
          <span
            aria-hidden="true"
            className="absolute bottom-[calc(20px+env(safe-area-inset-bottom))] left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-surface px-4 py-2 text-[13px] font-semibold text-neutral-400 transition-opacity duration-500"
            style={{ opacity: clock > 45 && p < 0.03 ? 1 : 0 }}
          >
            <span className="animate-float">↓</span>
            {t.scroll}
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
      className={`absolute z-10 flex flex-col rounded-[20px] bg-primary px-4 py-2.5 text-on-light shadow-[0_10px_26px_rgba(0,0,0,0.45)] ${className}`}
      style={style}
    >
      <span className="break-keep text-[15px] font-extrabold leading-[1.3]">{r.ko}</span>
      {lang === "en" && <span className="text-[11px] font-semibold leading-[1.3] opacity-60">{r.en}</span>}
    </div>
  );
}

function Emoji({ emoji, className, style }: { emoji: string; className: string; style: CSSProperties }): ReactNode {
  return (
    <span
      aria-hidden="true"
      className={`absolute z-10 flex size-12 items-center justify-center rounded-full bg-on-dark text-[24px] shadow-[0_8px_20px_rgba(0,0,0,0.4)] ${className}`}
      style={style}
    >
      {emoji}
    </span>
  );
}
