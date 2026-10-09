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

/*
  우리 별(Star 6) 모양 — public/images/blob-mask.svg와 같은 모양
  이미지로 저장할 때도 빠지지 않게 파일 주소 대신 글자로 넣어 둠 (data URL)
*/
const STAR_PATH =
  "M65.8341 1.74475C70.026 -0.581582 75.1213 -0.581586 79.3132 1.74475L85.5397 5.20021C87.6976 6.3978 90.1357 6.99874 92.6031 6.94118L99.7222 6.77512C104.515 6.66332 109.027 9.03121 111.657 13.0391L115.565 18.9924C116.919 21.0557 118.799 22.7208 121.01 23.8165L127.391 26.9779C131.687 29.1062 134.581 33.2995 135.048 38.0709L135.741 45.1581C135.981 47.6144 136.872 49.9623 138.321 51.9602L142.502 57.7248C145.316 61.6057 145.93 66.6638 144.126 71.1055L141.447 77.7031C140.518 79.9897 140.215 82.4825 140.57 84.9249L141.593 91.9721C142.281 96.7165 140.474 101.481 136.813 104.575L131.374 109.172C129.489 110.765 128.063 112.831 127.241 115.159L124.872 121.874C123.277 126.395 119.463 129.774 114.783 130.812L107.831 132.355C105.422 132.889 103.198 134.056 101.39 135.736L96.1709 140.581C92.6576 143.843 87.7104 145.062 83.0835 143.807L76.211 141.942C73.8292 141.295 71.3181 141.295 68.9362 141.942L62.0637 143.807C57.4369 145.062 52.4897 143.843 48.9764 140.581L43.7578 135.736C41.9491 134.056 39.7256 132.889 37.3162 132.355L30.3643 130.812C25.6839 129.774 21.8701 126.395 20.275 121.874L17.9058 115.159C17.0847 112.831 15.6583 110.765 13.7733 109.172L8.33442 104.575C4.67279 101.481 2.86599 96.7165 3.55469 91.9721L4.57766 84.9249C4.9322 82.4825 4.62952 79.9897 3.70078 77.7031L1.02103 71.1055C-0.783067 66.6638 -0.168901 61.6057 2.64575 57.7248L6.82653 51.9602C8.27551 49.9623 9.16595 47.6144 9.40622 45.1581L10.0995 38.0709C10.5662 33.2995 13.4606 29.1062 17.7564 26.9779L24.1373 23.8165C26.3487 22.7208 28.2283 21.0557 29.5826 18.9924L33.49 13.0391C36.1206 9.03121 40.6323 6.66332 45.4251 6.77512L52.5442 6.94118C55.0116 6.99874 57.4497 6.3978 59.6076 5.20021L65.8341 1.74475Z";
const STAR_MASK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 145.147 144.292' preserveAspectRatio='none'><path d='${STAR_PATH}' fill='black'/></svg>`,
)}")`;

/** 별 모양으로 잘린 사진 */
function StarPhoto({ src, size, className = "" }: { src: string; size: number; className?: string }) {
  return (
    <div
      className={`shrink-0 ${className}`}
      style={{ width: size, height: size, maskImage: STAR_MASK, WebkitMaskImage: STAR_MASK, maskSize: "100% 100%", WebkitMaskSize: "100% 100%" }}
    >
      <img src={src} alt="" className="size-full object-cover" draggable={false} />
    </div>
  );
}

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
// 카드 스타일마다 스티커가 붙을 만한 자리 — 모두 카드 안쪽(가장자리에서 8 이상)에 둬서 잘리지 않게
// 두 장은 (0,2) 또는 (1,3) 짝으로 붙으므로 짝끼리 겹치지 않는 자리로
const SPOTS: Record<CardStyle, CSSProperties[]> = {
  photo: [
    { top: 14, right: 8 },
    { top: 150, left: 8 },
    { top: 30, left: 8 },
    { top: 116, right: 8 },
  ],
  vote: [
    { top: 16, right: 8 },
    { top: 112, left: 8 },
    { top: 116, right: 8 },
    { top: 22, left: 8 },
  ],
  // 영수증은 글이 빽빽하고 도장도 있어서 스티커 1장만, 증거 사진 위에
  verdict: [
    { top: 70, left: 16 },
    { top: 98, left: 14 },
  ],
};

function stickersFor(style: CardStyle, seed: number, bg: string) {
  const colors = STICKER_COLORS.filter((c) => c !== bg);
  const count = style === "verdict" ? 1 : 2;
  return Array.from({ length: count }, (_, n) => {
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
      className="relative overflow-hidden rounded-[22px] text-left"
      style={{ width: CARD_W, height: CARD_H, background: theme.bg, color: theme.fg }}
    >
      {style === "photo" && <PhotoCard post={post} />}
      {style === "vote" && <VoteCard post={post} />}
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

/*
  카드 안 간격 (위계)
  - 카드 바깥 여백 12 · 묶음 사이 14~16 · 묶음 안 2~4
  - 맨 아래 출처 줄은 얇은 선으로 떼어 냄
*/

/** 카드 맨 아래 — 어디서 투표하는지 */
function Footer({ text }: { text: string }) {
  return (
    <div className="mt-auto flex items-center justify-between border-t border-current/15 pt-2.5 text-[8px] font-bold leading-none">
      <span className="font-display text-[10px]">오늘의 참견</span>
      <span className="opacity-70">{text}</span>
    </div>
  );
}

function PhotoCard({ post }: { post: ShareCardPost }) {
  return (
    <div className="flex h-full flex-col p-3">
      <StarPhoto src={post.photo} size={176} className="mx-auto" />
      {/* 제목 묶음 */}
      <div className="flex flex-col gap-1 px-0.5 pt-4 pb-3.5">
        <p className="line-clamp-2 font-display text-[19px] leading-[1.08] [text-wrap:balance]">{post.title}</p>
        <p className="text-[9px] font-semibold opacity-70">{post.author}</p>
      </div>
      <Footer text="Koreans, vote 👉 link" />
    </div>
  );
}

function VoteCard({ post }: { post: ShareCardPost }) {
  return (
    <div className="flex h-full flex-col items-center p-3 pt-5">
      {/* 별 모양 사진 (살짝 기울여서) */}
      <StarPhoto src={post.photo} size={118} className="-rotate-6" />
      {/* 인스타 투표 스티커: 질문 묶음 → 선택지 묶음 */}
      <div className="mt-3.5 flex w-full flex-col gap-2.5 rounded-[16px] bg-white p-3 text-on-light shadow-[0_6px_16px_rgba(0,0,0,0.2)]">
        <p className="text-center font-display text-[13px] leading-[1.15] [text-wrap:balance]">{post.voteQuestion}</p>
        <div className="flex flex-col gap-1">
          {post.options.slice(0, 4).map((o) => (
            <span key={o} className="flex min-h-6 items-center gap-1.5 rounded-full bg-black/[0.06] px-2.5 py-1 text-[10px] font-bold leading-[1.2]">
              <span className="size-2.5 shrink-0 rounded-full border-[1.5px] border-black/30" />
              {/* 말줄임·줄바꿈 없이 — 저장 이미지에선 글꼴 폭이 조금 달라져서 잘리거나 이모지만 내려가는 문제 */}
              <span className="whitespace-nowrap">{o}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="mt-auto w-full pt-4">
        <Footer text="Tap the link to vote" />
      </div>
    </div>
  );
}

/** 영수증 점선 — 묶음 사이를 나눔 */
function Rule() {
  return <span className="my-2.5 block border-t border-dashed border-black/30" />;
}

function VerdictCard({ post, theme }: { post: ShareCardPost; theme: CardTheme }) {
  const row = "flex justify-between gap-2";
  return (
    <div className="flex h-full flex-col p-3 pt-4">
      {/* 영수증 — 아래 가장자리를 톱니 모양으로 */}
      <div
        className="relative flex flex-col bg-white px-3 pt-3.5 pb-5 font-mono text-[8.5px] leading-[1.35] text-on-light"
        style={{
          maskImage: "radial-gradient(circle at 5px 100%, transparent 4px, #000 4.5px)",
          maskSize: "10px 100%",
          WebkitMaskImage: "radial-gradient(circle at 5px 100%, transparent 4px, #000 4.5px)",
          WebkitMaskSize: "10px 100%",
        }}
      >
        {/* 머리 */}
        <div className="flex flex-col items-center gap-1">
          <p className="font-display text-[13px] leading-none tracking-wide">K-FOOD COURT</p>
          <p className="opacity-60">CASE NO. 0001 · 🇰🇷</p>
        </div>
        <Rule />
        {/* 증거 */}
        <div className="flex items-center gap-2.5">
          <img src={post.photo} alt="" className="size-[56px] shrink-0 rounded-[4px] object-cover" draggable={false} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="opacity-60">EXHIBIT A</span>
            <span className="line-clamp-2 font-bold uppercase">{post.dish}</span>
            <span className="truncate opacity-60">COOK: {post.author}</span>
          </div>
        </div>
        <Rule />
        {/* 혐의 */}
        <div className="flex flex-col gap-0.5">
          <span className="opacity-60">CHARGE</span>
          <p className="line-clamp-3 font-bold">{post.voteQuestion}</p>
        </div>
        <Rule />
        {/* 판결 */}
        <div className="flex flex-col gap-1">
          <div className={row}>
            <span>JURY</span>
            <span className="font-bold">KOREANS NEEDED</span>
          </div>
          <div className={row}>
            <span>VERDICT</span>
            <span className="font-bold">???</span>
          </div>
        </div>
      </div>
      {/* 판결 대기 도장 */}
      <span
        className="pointer-events-none mx-auto mt-3 rotate-[-7deg] rounded-[8px] border-[2.5px] px-2.5 py-1 font-display text-[15px] leading-none tracking-wide"
        style={{ borderColor: theme.fg, color: theme.fg }}
      >
        VERDICT PENDING
      </span>
      <div className="mt-auto pt-3">
        <Footer text="Be the judge 👉 link" />
      </div>
    </div>
  );
}
