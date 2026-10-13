"use client";

import Image from "next/image";
import { memo, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { LanguageButton } from "@/components/LanguagePicker";
import { LoginSheet } from "@/components/LoginSheet";
import { useRouter } from "next/navigation";
import { setSuperProps, track, useTrackOnce } from "@/lib/analytics";
import { isOnboarded } from "@/app/my/profile";
import { rememberRole } from "@/lib/role";
import { useFlow } from "@/lib/write-store";
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
// 한마디는 스크롤 한 번(0.5)에 첫 번째가 오고, 두·세 번째는 스크롤 없이 시간차로 이어서 옴
const SNAP_AT = [0, 0.345, 0.5, 0.83, 1];
/** 첫 한마디가 붙은 뒤 나머지 둘이 이어서 오는 시간 */
const TALK_MS = 800;

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
/**
 * 배경 도형들. at = [가로 %, 세로 %, 각도] — 스크롤해도 자리는 그대로, 천천히 둥둥만
 * 화면 가장자리에 걸쳐 잘리게 두고, 카드에 반쯤 가려지는 자리에 둡니다.
 */
type ShapeKind = "scallop" | "clover" | "flower" | "capsule" | "circle" | "stack";
const DECOR: { kind: ShapeKind; color: string; size: number; at: [number, number, number] }[] = [
  // 지그재그: 헤더 옆부터 맨 아래까지 왼·오를 번갈아, 화면 밖으로 살짝 잘리게 큼직하게
  { kind: "clover", color: "--color-primary", size: 96, at: [95, 8, 15] }, // 오 · 헤더 옆
  { kind: "scallop", color: "--color-content", size: 150, at: [3, 21, -10] }, // 왼 · 제목 옆 · 가장 큼
  { kind: "capsule", color: "--color-secondary", size: 124, at: [97, 37, -35] }, // 오
  { kind: "flower", color: "--color-lilac", size: 84, at: [3, 53, 0] }, // 왼
  { kind: "stack", color: "--color-content", size: 88, at: [97, 68, -8] }, // 오
  { kind: "circle", color: "--color-primary", size: 48, at: [9, 82, 0] }, // 왼
  { kind: "clover", color: "--color-lilac", size: 64, at: [86, 93, 30] }, // 오 · 맨 아래
];

/** 글쓴이 답글 말풍선 기울기 (작성자 표시도 들어가면서 같이 기울어짐) */
const REPLY_TILT = -3;

export function LandingScreen() {
  // 언어: 처음엔 브라우저 언어, 이후엔 고른 언어
  const browserLang = useSyncExternalStore<LandingLang>(
    subscribeNone,
    () => {
      const l = navigator.language.toLowerCase();
      return l.startsWith("ko") ? "ko" : l.startsWith("zh") ? "zh" : l.startsWith("ja") ? "ja" : "en";
    },
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
  // 건너뛰기: 천천히 따라가지 않고 바로 마지막 장면(역할 고르기)으로
  const jump = useRef(false);
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
    let last = 0; // 지난 프레임 시각 — 따라가는 속도를 "프레임당"이 아니라 "시간당"으로 (폰에서 프레임이 적어도 같은 속도)
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
    const tick = (now: number) => {
      const dt = last ? Math.min(now - last, 64) : 16; // 탭을 다녀오는 등 오래 멈췄으면 한 번에 튀지 않게
      last = now;
      const gap = target - shown;
      if (Math.abs(gap) < 0.0005) {
        shown = target;
        setP(shown);
        frame = 0;
        last = 0;
        jump.current = false;
        return;
      }
      // 천천히 따라감: 남은 거리의 6%씩(60fps 기준), 1초에 최대 0.3 (한 단계 ≈ 1초) — 시간 기준이라 폰에서도 같은 속도
      const k = 1 - Math.pow(1 - 0.06, dt / 16.7);
      const max = 0.3 * (dt / 1000);
      shown += noMotion() || jump.current ? gap : clamp(gap * k, -max, max);
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
  const postRef = useRef<HTMLDivElement>(null);
  const authorRef = useRef<HTMLSpanElement>(null);
  const replyRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLSpanElement>(null);
  // 투표 토큰: 토큰 자리(제목 아래) → 내 칸 앉을 자리 (투표 카드 기준 좌표, 카드·칸이 날아드는 움직임과 상관없이)
  const tokenSlotRef = useRef<HTMLSpanElement>(null);
  const tokenLandRef = useRef<HTMLSpanElement>(null);
  const mineColRef = useRef<HTMLDivElement>(null);
  const [tok, setTok] = useState({ slot: { x: 0, y: 0 }, land: { x: 0, y: 0 } });
  // 가운데 정렬용: 제목 아래 남는 높이, 게시물만의 높이, 투표·답글까지 붙은 높이
  const [box, setBox] = useState({
    room: 0,
    post: 0,
    full: 0,
    overhang: 0,
    fit: 1,
    // 작성자 표시: 카드 안 자리 → 답글 위 자리 (게시물 카드 기준 좌표)
    author: { x: 0, y: 0 },
    slot: { x: 0, y: 0 },
  });
  useEffect(() => {
    const measure = () => {
      // 투표 토큰 자리 (offset은 transform 영향을 안 받음 — 칸이 날아드는 중에도 정확)
      // 토큰 자리·내 칸은 투표 카드(relative) 기준, 앉을 자리는 내 칸 기준
      const tSlot = tokenSlotRef.current;
      const tLand = tokenLandRef.current;
      const col = mineColRef.current;
      if (tSlot && tLand && col) {
        setTok({
          slot: { x: tSlot.offsetLeft, y: tSlot.offsetTop },
          land: { x: col.offsetLeft + tLand.offsetLeft, y: col.offsetTop + tLand.offsetTop },
        });
      }
      const card = cardRef.current;
      const post = postRef.current;
      const stage = card?.parentElement;
      if (!card || !post || !stage) return;
      const top = card.offsetTop;
      const full = card.offsetHeight; // 게시물 + 투표
      // 아래로 삐져나온 글쓴이 답글 높이
      const overhang = Math.max(0, (authorRef.current?.offsetTop ?? 0) - 2 + (replyRef.current?.offsetHeight ?? 0) - post.offsetHeight + 6);
      const author = authorRef.current;
      const reply = replyRef.current;
      const slot = slotRef.current;
      setBox({
        room: stage.clientHeight - top - 64,
        post: post.offsetHeight,
        full,
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
  const shrink = seg(p, 0.84, 0.91);
  const pickerIn = 1 - (1 - seg(p, 0.88, 0.97)) ** 3; // 부드럽게 감속 (튀는 효과 없음)

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
  // 사연은 들어오자마자 저절로 타이핑 (첫 화면이 비어 보이지 않게)
  const [clock, setClock] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setClock((c) => (c > 120 ? (window.clearInterval(id), c) : c + 1)), 45);
    return () => window.clearInterval(id);
  }, []);
  const typed = Math.min(t.story.length, Math.max(clock - 36, 0));

  // 투표 토큰: 떨어지기(0.14~0.19) → 내 칸으로 날아가기(0.2~0.27, 상세처럼 살짝 지나쳤다 제자리)
  const tokenDrop = backOut(seg(p, 0.14, 0.19));
  const tokenFlyRaw = seg(p, 0.2, 0.27);
  const tokenFly = backOut(tokenFlyRaw);
  const tokenLanded = tokenFlyRaw >= 1;

  // 한마디: 첫 번째가 붙으면(p≈0.5) 두·세 번째는 시간 따라 저절로 (talk 0→1), 위로 돌아가면 빠르게 되감음
  const [talk, setTalk] = useState(0);
  const talkRef = useRef(0);
  const talkOn = p >= 0.47; // 첫 번째가 거의 붙었을 때부터
  useEffect(() => {
    const goal = talkOn ? 1 : 0;
    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      const dt = last ? Math.min(now - last, 64) : 16;
      last = now;
      const v = talkRef.current;
      const next = noMotion() ? goal : clamp(v + (talkOn ? dt / TALK_MS : (-dt / TALK_MS) * 3));
      talkRef.current = next;
      setTalk(next);
      if (next !== goal) frame = requestAnimationFrame(tick);
    };
    if (talkRef.current !== goal) frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [talkOn]);
  // 두·세 번째 한마디가 쓰는 진행도: 스크롤 위치와 시간 중 앞선 쪽
  const talkP = Math.max(p, 0.5 + 0.16 * talk);

  return (
    <main className="mx-auto w-full max-w-[430px] bg-background text-on-dark">
      {/* 상단: 로고 · 건너뛰기 · 언어(🌐) */}
      <header className="fixed inset-x-0 top-0 z-40 mx-auto flex h-[calc(56px+env(safe-area-inset-top))] w-full max-w-[430px] items-center justify-between px-5 pt-[env(safe-area-inset-top)]">
        <span className="font-display text-[19px] leading-none">{t.brand}</span>
        <div className="flex items-center gap-2">
        {/* 건너뛰기 — 스토리를 생략하고 바로 "당신은 누구인가요?" (마지막 장면에선 숨김) */}
        {p < 0.97 && (
          <button
            type="button"
            onClick={() => {
              track("landing_skipped", { at: Math.round(p * 100) / 100 });
              jump.current = true;
              window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "auto" });
            }}
            className="h-9 rounded-full px-3 text-[13px] font-bold text-neutral-400 transition active:scale-95"
          >
            {t.skip}
          </button>
        )}
        {/* 언어 — 메인과 같은 🌐 (한국어 · 영어 · 일본어 · 중국어). 처음엔 기기 언어로 자동 */}
        <LanguageButton
          lang={lang}
          from="landing"
          // 랜딩 상단 높이(56)에 맞춰 메인보다 작게
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface/85 transition-transform active:scale-95"
          onPick={(l) => {
            setChosen(l as LandingLang);
            track("language_clicked", { from: "landing", to: l });
          }}
        />
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
          {/* 카드 뒤에 흩어진 작은 도형 6개 (구글 랩스 레퍼런스: 물결 원·클로버·꽃·알약·원·겹친 알약) — 35% 투명도로 은은하게, 천천히 둥둥
              스크롤해도 자리는 고정, 제자리에서 천천히 둥둥 */}
          <Decor />

          {/* 제목 — 스크롤 단계마다 바뀜 (첫 화면은 서비스 한 줄 소개) */}
          <h1
            key={`${lang}-${scene}`}
            aria-live="polite"
            className="relative min-h-[2.4em] break-keep text-center font-display text-[32px] leading-[1.2]"
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
            className="relative mt-6 origin-top"
            style={{ scale: `${stepScale * (1 - 0.12 * shrink)}`, translate: `0 ${startOffset - 40 * shrink}px`, opacity: 1 - shrink, pointerEvents: done ? "none" : undefined }}
          >
          <div className="relative mx-auto w-full" style={{ maxWidth: `calc(300px + (100% - 300px) * ${voteShown})` }}>
            {/* 피드 카드 (앱 메인과 같은 모양: 물결 사진 + 질문 칩 + 제목 + 작성자)
                첫 진입: 사진이 크게 "올라왔다가" 삐죽한 물결 모양으로 오므라들고, 그 둘레로 카드가 생김 */}
            <div ref={postRef} className="relative isolate rounded-[32px] px-5 pt-7 pb-6 text-on-dark">
              <span
                aria-hidden="true"
                className="absolute inset-0 -z-10 animate-[fade-in_500ms_ease-out_1300ms_both] rounded-[32px] bg-surface/70"
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
                  className="flex max-w-[240px] flex-col gap-1 rounded-[24px] bg-surface-2/80 px-4 pt-2.5 pb-3 text-on-dark"
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
            <div className="relative rounded-[32px] bg-surface-2/75 px-4 pt-5 pb-4" style={fly(p, 0.1, 0.17, { y: 260, r: -6 })}>
              <p className="text-center font-display text-[18px] leading-[1.3]">{t.voteTitle}</p>
              {/* 토큰 자리 (상세 투표 카드처럼 제목과 칸 사이 가운데) — 실제 토큰은 아래 하나가 여기서 내 칸으로 날아감 */}
              <div className="flex h-12 items-center justify-center">
                <span ref={tokenSlotRef} className="size-10" aria-hidden="true" />
              </div>
              <div className="flex h-[min(128px,15svh)] gap-1.5">
                {t.options.map((opt, i) => {
                  const fill = seg(p, 0.27 + i * 0.015, 0.36) * SAMPLE_PCTS[i];
                  const mine = i === 0;
                  return (
                    <div
                      key={opt}
                      ref={mine ? mineColRef : undefined}
                      className="relative min-w-0 flex-1 rounded-[20px] bg-surface"
                      style={fly(p, 0.12 + i * 0.02, 0.18 + i * 0.02, { y: 120 })}
                    >
                      <span className="absolute inset-0 overflow-hidden rounded-[20px]">
                        <span
                          className={`absolute inset-x-0 bottom-0 ${mine ? "wave-fill bg-primary" : "bg-white/10"}`}
                          style={{ height: `${fill}%` }}
                        />
                      </span>
                      {/* 토큰이 앉을 자리 — 상세처럼 칸 이름과 % 사이, 차오를 색 바로 위 가운데 */}
                      {mine && (
                        <span
                          ref={tokenLandRef}
                          aria-hidden="true"
                          className="invisible absolute left-[calc(50%-20px)] size-10"
                          style={{ bottom: `min(max(calc(${SAMPLE_PCTS[0]}% + 6px), 34px), calc(100% - 64px))` }}
                        />
                      )}
                      <span className="absolute left-3 top-2.5 whitespace-pre-line pr-1 text-[13px] font-semibold leading-[1.25]">
                        {opt}
                      </span>
                      <span
                        className={`absolute bottom-2 left-3 font-display text-[18px] tabular-nums ${mine ? "text-on-light" : "text-on-dark"}`}
                        style={{ opacity: seg(p, 0.28, 0.32) }}
                      >
                        {Math.round(fill)}%
                      </span>
                    </div>
                  );
                })}
              </div>
              {/* 🇰🇷 토큰 — 상세 투표와 같은 모양(어두운 원 · 그림자 · 손 흔들기)
                  위에서 톡 떨어져 토큰 자리에서 흔들다가, 120° 돌며 내 칸으로 날아가 살짝 지나쳤다 제자리 (상세의 BACK_OUT) */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute z-10 flex size-10 items-center justify-center rounded-full bg-on-light text-[16px] leading-none shadow-[0_6px_16px_rgba(0,0,0,0.35)]"
                style={{
                  left: tok.slot.x,
                  top: tok.slot.y,
                  opacity: clamp(seg(p, 0.15, 0.19) * 3),
                  translate: `${(tok.land.x - tok.slot.x) * tokenFly}px ${(tok.land.y - tok.slot.y) * tokenFly - 50 * (1 - tokenDrop)}px`,
                  rotate: `${120 * (1 - tokenFly) * (tokenFlyRaw > 0 ? 1 : 0)}deg`,
                }}
              >
                <span
                  key={tokenLanded ? "landed" : "waiting"}
                  className={`inline-block origin-[50%_85%] ${
                    tokenLanded ? "animate-[wave_1s_ease-in-out_150ms_both]" : "animate-[wave_1.2s_ease-in-out_infinite]"
                  }`}
                >
                  🇰🇷
                </span>
              </span>
            </div>
            </div>

            {/* 한국인 반응 — 앱 댓글 더미처럼 알약 모양, 사진 가장자리에 걸치게 */}
            <Bubble
              lang={lang}
              r={REACTIONS[0]}
              className="-left-2 top-[5%] bg-primary"
              style={fly(p, 0.44, 0.5, { x: -300, y: -40, r: -30 }, -6)}
            />
            <Bubble
              lang={lang}
              r={REACTIONS[1]}
              className="-right-2 top-[17%] max-w-[200px] bg-content"
              style={fly(talkP, 0.52, 0.58, { x: 300, y: 20, r: 25 }, 5)}
            />
            <Bubble
              lang={lang}
              r={REACTIONS[2]}
              className="-left-1 top-[30%] bg-lilac"
              style={fly(talkP, 0.6, 0.66, { x: -300, y: 60, r: -20 }, 3)}
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
            inert={!done}
            className="absolute inset-x-0 bottom-0 top-[calc(204px+env(safe-area-inset-top))] flex flex-col justify-center px-5 pb-[calc(20px+env(safe-area-inset-bottom))]"
            style={{
              // 통통 튀지 않게: 카드가 사라진 뒤 아래에서 살짝 올라오며 서서히 나타남
              opacity: pickerIn,
              translate: `0 ${(1 - pickerIn) * 36}px`,
            }}
          >
            <RolePicker lang={lang} active={done} />
          </div>
        </div>
      </section>

    </main>
  );
}

/**
 * 마지막 장면: "당신은 누구인가요?" — 앱의 투표처럼 토큰을 칸에 넣어 역할을 고름
 * - 👋 토큰을 끌어다 칸에 놓거나, 칸을 누르면 됨 (누르기만 해도 바로)
 * - 고르면 칸이 아래에서 차오르고 토큰이 들어간 뒤 그 화면으로 이동
 */
const ROLES = [
  { kind: "korean", href: "/home", fill: "bg-primary" },
  { kind: "foreigner", href: "/home?lang=en", fill: "bg-content" },
] as const;

function RolePicker({ lang, active }: { lang: LandingLang; active: boolean }) {
  const t = COPY[lang];
  const router = useRouter();
  const columns = useRef<(HTMLButtonElement | null)[]>([]);
  const [drag, setDrag] = useState<{ x: number; y: number; sx: number; sy: number } | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  // 사용자가 토큰을 만지면 "이렇게 해 보세요" 힌트 움직임을 멈춤
  const [touched, setTouched] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const { logIn } = useFlow();
  const hinting = active && !touched && picked === null;

  const pick = (i: number, method: "drag" | "tap") => {
    if (picked !== null) return;
    const role = ROLES[i];
    setPicked(i);
    setSuperProps({ user_type: role.kind });
    track("role_selected", { role: role.kind, method });
    rememberRole(role.kind === "korean" ? "ko" : "en"); // 다음부터는 랜딩 없이 바로 메인
    // 칸이 차오르는 걸 보여 준 뒤 이동
    window.setTimeout(() => router.push(role.href), 750);
  };

  const columnAt = (x: number, y: number) =>
    columns.current.findIndex((el) => {
      const r = el?.getBoundingClientRect();
      return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    });

  const label = (i: number) => (i === 0 ? t.korean : t.foreigner);

  return (
    <div className="flex flex-col gap-2">
      {/* 나타날 때마다 연출을 처음부터 (active 바뀌면 새로 그림)
          제목·안내 → 두 칸이 차례로 올라옴 → 👋 토큰이 위에서 톡 떨어져 손 흔들기
          → 토큰이 왼쪽 칸, 오른쪽 칸을 번갈아 살짝 들어갔다 나오며 "넣어 보세요" 힌트 */}
      <div key={active ? "on" : "off"} className="relative rounded-[32px] bg-surface-2 px-5 pt-7 pb-5">
        <p className="animate-rise text-center font-display text-[24px] leading-[1.3] [animation-delay:150ms]">{t.pickTitle}</p>

        {/* 토큰 */}
        <div className="mt-6 flex h-14 items-center justify-center">
          {picked === null && (
            <div
              className="relative z-20"
              style={{
                animation: hinting
                  ? "token-drop 700ms cubic-bezier(0.3, 1.4, 0.5, 1) 650ms both, token-hint 3.6s ease-in-out 1350ms infinite"
                  : active && !touched
                    ? "token-drop 700ms cubic-bezier(0.3, 1.4, 0.5, 1) 650ms both"
                    : undefined,
              }}
            >
            <div
              className={`flex size-14 touch-none select-none items-center justify-center rounded-full bg-on-dark text-[26px] ${
                drag ? "cursor-grabbing" : "cursor-grab"
              }`}
              style={{ transform: drag ? `translate(${drag.x}px, ${drag.y}px) scale(1.12)` : undefined }}
              onPointerDown={(e) => {
                setTouched(true);
                e.currentTarget.setPointerCapture(e.pointerId);
                setDrag({ x: 0, y: 0, sx: e.clientX, sy: e.clientY });
              }}
              onPointerMove={(e) => {
                if (!drag) return;
                setDrag({ ...drag, x: e.clientX - drag.sx, y: e.clientY - drag.sy });
                const i = columnAt(e.clientX, e.clientY);
                setHover(i < 0 ? null : i);
              }}
              onPointerUp={(e) => {
                const i = columnAt(e.clientX, e.clientY);
                setDrag(null);
                setHover(null);
                if (i >= 0) pick(i, "drag");
              }}
              onPointerCancel={() => {
                setDrag(null);
                setHover(null);
              }}
              role="img"
              aria-label={t.pickHint}
            >
              <span className="inline-block origin-[70%_80%] animate-[wave_1s_ease-in-out_1300ms_both]">👋</span>
            </div>
            </div>
          )}
        </div>

        {/* 두 칸 */}
        <div className="mt-5 flex h-[min(200px,26svh)] gap-2">
          {ROLES.map((role, i) => {
            const mine = picked === i;
            const near = hover === i;
            return (
              <button
                key={role.kind}
                ref={(el) => {
                  columns.current[i] = el;
                }}
                type="button"
                onClick={() => pick(i, "tap")}
                disabled={picked !== null && !mine}
                style={{ animationDelay: `${350 + i * 120}ms` }}
                className={`relative min-w-0 flex-1 animate-rise overflow-hidden rounded-[24px] text-left transition-[background-color,scale] duration-200 ${
                  near ? "scale-[1.03] bg-white/10" : "bg-surface"
                } ${picked !== null && !mine ? "opacity-40" : ""}`}
              >
                {/* 글자 (기본: 밝은 글자) */}
                <ColumnText role={label(i).role} action={label(i).action} />
                {/* 차오르는 색 안에는 같은 글자를 어두운 색으로 겹쳐서, 색이 덮은 부분만 글자가 어두워짐 */}
                {hinting && (
                  <span
                    className={`wave-fill absolute inset-x-0 bottom-0 overflow-hidden ${role.fill}`}
                    style={{
                      animation: `${i === 0 ? "col-peek-l" : "col-peek-r"} 3.6s ease-in-out 1350ms infinite, wave-flow 1.4s linear infinite`,
                      height: 0,
                    }}
                  >
                    <ColumnText role={label(i).role} action={label(i).action} dark />
                  </span>
                )}
                {/* 아래에서 물결치며 차오르는 색 (끌어다 대면 살짝, 고르면 가득) */}
                <span
                  className={`wave-fill absolute inset-x-0 bottom-0 overflow-hidden ${role.fill} transition-[height] duration-700 ease-[cubic-bezier(0.3,1.15,0.5,1)]`}
                  style={{ height: mine ? "100%" : near ? "38%" : "0%" }}
                >
                  <ColumnText role={label(i).role} action={label(i).action} dark picked={mine} />
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {/* 이미 가입한 사람: 구글 로그인 바텀시트 → 로그인하면 지금 보고 있는 언어의 메인으로 */}
      <button
        type="button"
        onClick={() => {
          track("landing_login_clicked");
          track("login_sheet_opened", { from: "landing" });
          setLoginOpen(true);
        }}
        className="mt-3 py-1 text-center text-[14px] font-bold leading-[1.3] text-neutral-400"
      >
        {t.loginLead} <span className="text-on-dark">{t.loginAction}</span>
      </button>
      {/* 움직이는 패널 안에 두면 화면 전체를 못 덮어서, 페이지 맨 바깥(body)에 띄움 */}
      {loginOpen &&
        createPortal(
          <LoginSheet
            lang={lang === "ko" ? "ko" : "en"}
            open
            title={t.loginTitle}
            body={t.loginBody}
            onClose={() => {
              track("login_cancelled", { from: "landing", stage: "sheet" });
              setLoginOpen(false);
            }}
            onLoggedIn={() => {
              track("login_completed", { from: "landing", method: "google" });
              logIn();
              setLoginOpen(false);
              // 이미 가입한 사람: 화면 언어가 아니라 가입한 역할로 (서버 전까지는 이 브라우저의 가입 기록)
              // 기록이 없으면 화면 언어로 — 중국어·일본어도 이후 화면은 아직 영어 외국인 화면으로
              const ko = isOnboarded("ko"), en = isOnboarded("en");
              const role = ko !== en ? (ko ? "ko" : "en") : lang === "ko" ? "ko" : "en";
              rememberRole(role);
              router.push(role === "ko" ? "/home" : "/home?lang=en");
            }}
          />,
          document.body,
        )}
    </div>
  );
}

/** 역할 칸 안의 글자. dark = 차오른 색 위에 겹치는 어두운 글자 (칸 아래 끝에 맞춰 붙음) */
function ColumnText({ role, action, dark = false, picked = false }: { role: string; action: string; dark?: boolean; picked?: boolean }) {
  return (
    <span
      className={`${dark ? "absolute inset-x-0 bottom-0 text-on-light" : "relative"} flex h-[min(200px,26svh)] flex-col justify-between p-4`}
      aria-hidden={dark || undefined}
    >
      <span className="font-display text-[20px] leading-[1.2]">{role}</span>
      <span className="flex items-end justify-between gap-1">
        <span className={`text-[13px] font-semibold leading-[1.35] ${dark ? "opacity-70" : "text-neutral-400"}`}>{action}</span>
        {picked && (
          <span className="flex size-9 shrink-0 animate-pop items-center justify-center rounded-full bg-on-dark text-[18px]">👋</span>
        )}
      </span>
    </span>
  );
}

function Bubble({
  lang,
  r,
  className,
  style,
}: {
  lang: LandingLang;
  r: { ko: string; en: string; zh: string; ja: string };
  className: string;
  style: CSSProperties;
}) {
  const cjk = lang === "zh" || lang === "ja";
  return (
    <div
      className={`absolute z-10 flex max-w-[220px] flex-col items-center rounded-[32px] px-5 py-3 text-center text-on-light ${className}`}
      style={style}
    >
      {/* 보는 사람의 모국어를 크게, 한국어 원문은 작게 아래 (한국어 화면은 한국어만) */}
      {/* 한국어·영어는 단어 단위로 줄바꿈, 띄어쓰기가 없는 중국어·일본어는 글자 단위로 (안 그러면 한 줄로 쭉 늘어남) */}
      <span
        className={`whitespace-pre-line text-[15px] font-bold leading-[1.35] tracking-[-0.3px] ${cjk ? "break-all" : "break-keep"}`}
      >
        {lang === "ko" ? r.ko : r[lang]}
      </span>
      {lang !== "ko" && <span className="break-keep text-[11px] font-semibold leading-[1.3] opacity-60">{r.ko}</span>}
    </div>
  );
}

/** 배경 도형 하나 (단색) */
function Shape({ kind, color }: { kind: ShapeKind; color: string }) {
  const fill = `var(${color})`;
  if (kind === "scallop")
    return (
      <span
        className="block size-full"
        style={{
          backgroundColor: fill,
          maskImage: "url(/images/card-mask.svg)",
          WebkitMaskImage: "url(/images/card-mask.svg)",
          maskSize: "100% 100%",
          WebkitMaskSize: "100% 100%",
        }}
      />
    );
  if (kind === "circle") return <span className="block size-full rounded-full" style={{ backgroundColor: fill }} />;
  if (kind === "capsule") return <span className="absolute inset-x-0 top-1/2 block h-[38%] -translate-y-1/2 rounded-full" style={{ backgroundColor: fill }} />;
  return (
    <svg viewBox="0 0 100 100" className="block size-full" fill={fill}>
      {kind === "stack" ? (
        // 겹친 알약: 둥근 막대 3개를 쌓아 양옆이 울퉁불퉁한 네모
        <>
          <rect x="0" y="0" width="100" height="36" rx="18" />
          <rect x="0" y="32" width="100" height="36" rx="18" />
          <rect x="0" y="64" width="100" height="36" rx="18" />
          <rect x="12" y="12" width="76" height="76" />
        </>
      ) : kind === "clover" ? (
        <>
          <circle cx="30" cy="30" r="27" />
          <circle cx="70" cy="30" r="27" />
          <circle cx="30" cy="70" r="27" />
          <circle cx="70" cy="70" r="27" />
          <rect x="30" y="30" width="40" height="40" />
        </>
      ) : (
        <>
          <circle cx="50" cy="50" r="30" />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return <circle key={i} cx={50 + Math.cos(a) * 32} cy={50 + Math.sin(a) * 32} r="17" />;
          })}
        </>
      )}
    </svg>
  );
}

/** 배경 도형 — 스크롤과 상관없어서 스크롤할 때마다 다시 그리지 않음 (폰에서 느려지지 않게) */
const Decor = memo(function Decor() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {DECOR.map((d, i) => {
        const [x, y, r] = d.at;
        return (
          <div
            key={i}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${x}%`, top: `${y}%`, rotate: `${r}deg`, width: d.size, height: d.size }}
          >
            <div className="size-full animate-drift opacity-35" style={{ animationDelay: `${i * -1.7}s`, animationDuration: `${7 + i}s` }}>
              <Shape kind={d.kind} color={d.color} />
            </div>
          </div>
        );
      })}
    </div>
  );
});
