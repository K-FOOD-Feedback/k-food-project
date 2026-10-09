/* eslint-disable @next/next/no-img-element -- 이미지로 저장할 카드라 next/image 대신 img (html-to-image가 그대로 그림) */
import type { CSSProperties } from "react";

/*
  공유용 세로 카드 (인스타 스토리 9:16) — 담당 송희
  - Photo: 사진을 크게 + 제목
  - Vote: 인스타 투표 스티커처럼 질문·선택지를 크게 → "나도 투표해 볼까"
  - Verdict: "한식 법정" 영수증 + 판결 대기 도장
  카드 자체는 200×356으로 그리고, 저장할 땐 1080×1920으로 키워서 찍음
*/
export const CARD_W = 200;
export const CARD_H = 356;

export type CardStyle = "photo" | "vote" | "verdict";
export const CARD_STYLES: { id: CardStyle; label: string }[] = [
  { id: "photo", label: "Photo" },
  { id: "vote", label: "Vote" },
  { id: "verdict", label: "Verdict" },
];

export type CardTheme = { bg: string; fg: string };

export type ShareCardPost = {
  title: string;
  dish: string;
  photo: string;
  voteQuestion: string;
  options: string[];
  author: string;
};

// 탭할 때마다 바뀌는 스티커 문구 · 색 · 자리
const STICKER_TEXTS = [
  "Koreans, judge this 🇰🇷",
  "찐 한식?",
  "Vote now!",
  "선 넘었나요? 🚫",
  "한국인 출동 🚨",
  "Is this legal? 😳",
  "K-food or crime?",
  "한 표 부탁 🙏",
];
const STICKER_COLORS = ["var(--color-primary)", "var(--color-content)", "var(--color-secondary)", "var(--color-lilac)", "#ffffff"];
// 카드 스타일마다 스티커가 붙을 만한 자리 (가장자리 위주라 내용을 가리지 않게)
const SPOTS: Record<CardStyle, CSSProperties[]> = {
  photo: [
    { top: 18, right: -6 },
    { top: 150, left: -8 },
    { top: 58, left: 4 },
    { top: 196, right: -4 },
  ],
  vote: [
    { top: 20, right: -2 },
    { top: 118, left: -6 },
    { top: 30, left: 0 },
    { top: 128, right: -8 },
  ],
  // 제목·도장을 피해서 사진 근처와 도장 옆에
  verdict: [
    { top: 70, left: -6 },
    { top: 262, left: -6 },
    { top: 276, right: -8 },
    { top: 92, left: 6 },
  ],
};

function stickersFor(style: CardStyle, seed: number, bg: string) {
  const colors = STICKER_COLORS.filter((c) => c !== bg);
  return [0, 1].map((n) => {
    const k = seed * 7 + n * 3 + style.length;
    return {
      text: STICKER_TEXTS[(seed * 3 + n * 5 + style.length) % STICKER_TEXTS.length],
      color: colors[(seed + n * 2) % colors.length],
      spot: SPOTS[style][(seed + n * 2) % SPOTS[style].length],
      rotate: ((k * 37) % 22) - 11,
    };
  });
}

export function ShareCard({
  style,
  post,
  theme,
  seed,
}: {
  style: CardStyle;
  post: ShareCardPost;
  theme: CardTheme;
  seed: number;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-[22px]"
      style={{ width: CARD_W, height: CARD_H, background: theme.bg, color: theme.fg }}
    >
      {style === "photo" && <PhotoCard post={post} theme={theme} />}
      {style === "vote" && <VoteCard post={post} theme={theme} />}
      {style === "verdict" && <VerdictCard post={post} theme={theme} />}

      {/* 스티커 — key가 바뀌면 톡 튀어나옴 */}
      {stickersFor(style, seed, theme.bg).map((s, i) => (
        <span
          key={`${seed}-${i}`}
          className="absolute animate-pop whitespace-nowrap rounded-full px-2.5 py-1.5 font-display text-[11px] leading-none text-on-light shadow-[0_4px_10px_rgba(0,0,0,0.25)]"
          style={{ ...s.spot, background: s.color, rotate: `${s.rotate}deg`, animationDelay: `${i * 90}ms` }}
        >
          {s.text}
        </span>
      ))}
    </div>
  );
}

/** 카드 맨 아래 — 어디서 투표하는지 */
function Footer({ theme, text }: { theme: CardTheme; text: string }) {
  return (
    <div className="flex items-center justify-between text-[8px] font-bold leading-none" style={{ color: theme.fg }}>
      <span className="font-display text-[10px]">오늘의 참견</span>
      <span className="opacity-70">{text}</span>
    </div>
  );
}

function PhotoCard({ post, theme }: { post: ShareCardPost; theme: CardTheme }) {
  return (
    <div className="flex h-full flex-col gap-2.5 p-2.5 pb-3">
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-[16px]">
        <img src={post.photo} alt="" className="size-full object-cover" draggable={false} />
      </div>
      <div className="flex flex-col gap-1 px-1">
        <p className="line-clamp-2 font-display text-[19px] leading-[1.08] [text-wrap:balance]">{post.title}</p>
        <p className="text-[9px] font-semibold opacity-70">{post.author}</p>
      </div>
      <div className="px-1">
        <Footer theme={theme} text="Koreans, vote 👉 link" />
      </div>
    </div>
  );
}

function VoteCard({ post, theme }: { post: ShareCardPost; theme: CardTheme }) {
  return (
    <div className="flex h-full flex-col items-center gap-3 px-3 pt-6 pb-3">
      {/* 폴라로이드처럼 살짝 기운 사진 */}
      <div className="-rotate-3 rounded-[10px] bg-white p-1.5 pb-4 shadow-[0_6px_16px_rgba(0,0,0,0.25)]">
        <img src={post.photo} alt="" className="size-[104px] rounded-[6px] object-cover" draggable={false} />
      </div>
      {/* 인스타 투표 스티커 */}
      <div className="flex w-full flex-col gap-1.5 rounded-[16px] bg-white p-2.5 text-on-light shadow-[0_6px_16px_rgba(0,0,0,0.2)]">
        <p className="px-0.5 pb-0.5 text-center font-display text-[13px] leading-[1.15] [text-wrap:balance]">
          {post.voteQuestion}
        </p>
        {post.options.slice(0, 4).map((o) => (
          <span key={o} className="flex min-h-6 items-center gap-1.5 rounded-full bg-black/[0.06] px-2.5 py-1 text-[10px] font-bold leading-[1.2]">
            <span className="size-2.5 shrink-0 rounded-full border-[1.5px] border-black/30" />
            {/* 말줄임·줄바꿈 없이 — 저장 이미지에선 글꼴 폭이 조금 달라져서 잘리거나 이모지만 내려가는 문제 */}
            <span className="whitespace-nowrap">{o}</span>
          </span>
        ))}
      </div>
      <div className="mt-auto w-full">
        <Footer theme={theme} text="Tap the link to vote" />
      </div>
    </div>
  );
}

/** 영수증 점선 */
function Rule() {
  return <span className="my-0.5 block border-t border-dashed border-black/30" />;
}

function VerdictCard({ post, theme }: { post: ShareCardPost; theme: CardTheme }) {
  const row = "flex justify-between gap-2";
  return (
    <div className="flex h-full flex-col px-3 pt-5 pb-3">
      {/* 영수증 — 아래 가장자리를 톱니 모양으로 */}
      <div
        className="relative flex flex-col gap-1.5 bg-white px-3 pt-3 pb-4 font-mono text-[8.5px] leading-[1.35] text-on-light"
        style={{
          maskImage: "radial-gradient(circle at 5px 100%, transparent 4px, #000 4.5px)",
          maskSize: "10px 100%",
          WebkitMaskImage: "radial-gradient(circle at 5px 100%, transparent 4px, #000 4.5px)",
          WebkitMaskSize: "10px 100%",
        }}
      >
        <p className="text-center font-display text-[13px] leading-none tracking-wide">K-FOOD COURT</p>
        <p className="text-center opacity-60">CASE NO. 0001 · 🇰🇷</p>
        <Rule />
        <div className="flex gap-2">
          <img src={post.photo} alt="" className="size-[58px] shrink-0 rounded-[4px] object-cover" draggable={false} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="opacity-60">EXHIBIT A</span>
            <span className="line-clamp-2 font-bold uppercase">{post.dish}</span>
            <span className="truncate opacity-60">COOK: {post.author}</span>
          </div>
        </div>
        <Rule />
        <p className="opacity-60">CHARGE</p>
        <p className="line-clamp-3 font-bold">{post.voteQuestion}</p>
        <Rule />
        <div className={row}>
          <span>JURY</span>
          <span className="font-bold">KOREANS NEEDED</span>
        </div>
        <div className={row}>
          <span>VERDICT</span>
          <span className="font-bold">???</span>
        </div>
      </div>
      {/* 판결 대기 도장 */}
      <span
        className="pointer-events-none mx-auto mt-2 rotate-[-7deg] rounded-[8px] border-[2.5px] px-2.5 py-1 font-display text-[15px] leading-none tracking-wide"
        style={{ borderColor: theme.fg, color: theme.fg }}
      >
        VERDICT PENDING
      </span>
      <div className="mt-auto">
        <Footer theme={theme} text="Be the judge 👉 link" />
      </div>
    </div>
  );
}
