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
  const [box, setBox] = useState({ room: 0, post: 0, full: 0, last: 0, endRoom: 0, fit: 1 });
  useEffect(() => {
    const measure = () => {
      const card = cardRef.current;
      const cta = ctaRef.current;
      const post = postRef.current;
      const stage = card?.parentElement;
      if (!card || !cta || !post || !stage) return;
      const top = card.offsetTop;
      const room = cta.offsetTop + 24 - top; // 버튼 영역 위쪽 그라데이션까지는 겹쳐도 됨
      const full = card.offsetHeight; // 게시물 + 투표
      const last = post.offsetHeight + 40; // 마지막 장면: 게시물 + 아래로 삐져나온 글쓴이 답글
      setEndScale(clamp(room / last, 0.6, 0.9));
      setBox({
        room: stage.clientHeight - top - 64,
        post: post.offsetHeight,
        full,
        last,
        endRoom: room,
        // 투표가 붙어 있을 때 화면 안에 다 들어오게 하는 크기
        fit: clamp((stage.clientHeight - top - 40) / full, 0.6, 1),
      });
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
  // 한 번에 하나만: 투표는 다음 단계(한마디)가 오면 내려가며 사라짐
  const voteOut = seg(p, 0.36, 0.43);
  const voteShown = seg(p, 0.06, 0.2) * (1 - voteOut);
  const shown = box.post + (box.full - box.post) * voteShown + 40 * seg(p, 0.74, 0.82);
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
            className="min-h-[2.7em] break-keep text-center font-display text-[clamp(30px,9vw,36px)] leading-[1.35]"
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
          <div className="relative w-full animate-card-enter [animation-delay:350ms]">
            {/* 피드 카드 (앱 메인과 같은 모양: 노란 카드 + 물결 사진 + 질문 칩 + 제목 + 작성자) */}
            <div ref={postRef} className="relative rounded-[32px] bg-surface px-5 pt-7 pb-6 text-on-dark">
              <div
                className="relative mx-auto aspect-square h-[min(200px,23svh)] overflow-hidden"
                style={{
                  maskImage: "url(/images/card-mask.svg)",
                  WebkitMaskImage: "url(/images/card-mask.svg)",
                  maskSize: "100% 100%",
                  WebkitMaskSize: "100% 100%",
                }}
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
                <span className="animate-pop rounded-full bg-white/10 px-2.5 py-[5px] text-[12px] font-semibold leading-[1.2] text-neutral-400 [animation-delay:900ms]">
                  {t.question}
                </span>
                {/* 완성된 글 크기만큼 자리를 먼저 잡고, 그 위에 타이핑 (아래가 비거나 들썩이지 않게) */}
                <p className="relative w-full break-keep text-[22px] font-extrabold leading-[1.2] tracking-[-0.66px]">
                  <span className="invisible">{t.story}</span>
                  <span className="absolute inset-0">
                    {t.story.slice(0, typed)}
                    {typed < t.story.length && (
                      <span className="ml-0.5 inline-block h-[0.9em] w-[3px] translate-y-[2px] animate-pulse bg-on-dark" />
                    )}
                  </span>
                </p>
                <span className="flex animate-pop items-center gap-[5px] text-[13px] font-semibold text-neutral-400 [animation-delay:1000ms]">
                  <span className="text-[15px]" aria-hidden="true">
                    🇨🇦
                  </span>
                  {t.author}
                </span>
              </div>
              {/* 글쓴이 답글 — 앱 댓글의 작성자 말풍선 */}
              <div
                className="absolute -bottom-[34px] right-2 z-10 pt-2.5"
                style={fly(p, 0.74, 0.82, { y: 220, s: 0.6 }, -3)}
              >
                <span className="flex items-center gap-2 rounded-[32px] bg-surface-2 py-2 pr-4 pl-2 text-on-dark ring-1 ring-white/10">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[17px]" aria-hidden="true">
                    🇨🇦
                  </span>
                  <span className="max-w-[190px] break-keep text-[14px] font-bold leading-[1.35]">{t.reply}</span>
                </span>
                <span className="absolute left-7 top-0 rounded-full bg-on-dark px-1.5 py-1 text-[10px] font-bold leading-none text-on-light">
                  {t.authorTag}
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
              className="-left-2 top-[5%]"
              style={fly(p, 0.42, 0.49, { x: -300, y: -40, r: -30 }, -6)}
            />
            <Bubble
              lang={lang}
              r={REACTIONS[1]}
              className="-right-2 top-[17%] max-w-[200px]"
              style={fly(p, 0.48, 0.55, { x: 300, y: 20, r: 25 }, 5)}
            />
            <Bubble
              lang={lang}
              r={REACTIONS[2]}
              className="-left-1 top-[30%]"
              style={fly(p, 0.54, 0.61, { x: -300, y: 60, r: -20 }, 3)}
            />
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
      className="flex h-[72px] items-center gap-3 rounded-full bg-surface-2 py-2 pl-7 pr-2 text-on-dark transition active:scale-[0.99]"
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-display text-[20px] leading-[1.15]">{role}</span>
        <span className="text-[13px] font-semibold text-neutral-400">{action}</span>
      </span>
      <span className={`flex size-14 shrink-0 items-center justify-center rounded-full text-on-light ${tone}`} aria-hidden="true">
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
      className={`absolute z-10 flex flex-col items-center rounded-[32px] bg-on-dark px-5 py-3 text-center text-on-light ${className}`}
      style={style}
    >
      <span className="break-keep text-[15px] font-bold leading-[1.35] tracking-[-0.3px]">{r.ko}</span>
      {lang === "en" && <span className="text-[11px] font-semibold leading-[1.3] opacity-60">{r.en}</span>}
    </div>
  );
}
