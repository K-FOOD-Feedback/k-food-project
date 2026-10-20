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
function StarPhoto({ src, size, className = "", style }: { src: string; size: number; className?: string; style?: CSSProperties }) {
  return (
    <div
      className={`shrink-0 ${className}`}
      style={{ ...style, width: size, height: size, maskImage: STAR_MASK, WebkitMaskImage: STAR_MASK, maskSize: "100% 100%", WebkitMaskSize: "100% 100%" }}
    >
      <img src={src} alt="" className="size-full object-cover" draggable={false} />
    </div>
  );
}

export type CardStyle = "photo" | "vote" | "verdict";
/** 카드 글 언어 — 한국인 화면(상세)은 한국어, 외국인 화면(글 올린 뒤)은 영어 */
export type CardLang = "en" | "ko" | "zh" | "ja";

export const CARD_STYLES: { id: CardStyle; label: Record<CardLang, string> }[] = [
  { id: "photo", label: { en: "Photo", ko: "사진", zh: "照片", ja: "写真" } },
  { id: "vote", label: { en: "Vote", ko: "투표", zh: "投票", ja: "投票" } },
  { id: "verdict", label: { en: "Verdict", ko: "판결", zh: "判决", ja: "判決" } },
];

// 카드 안 글
const COPY = {
  en: {
    footer: "Koreans, vote 👉 link",
    court: "K-FOOD COURT",
    caseNo: "CASE NO. 0001 · 🇰🇷",
    exhibit: "EXHIBIT A",
    cook: "COOK",
    charge: "CHARGE",
    jury: "JURY",
    juryValue: "KOREANS NEEDED",
    verdict: "VERDICT",
    pending: "VERDICT PENDING",
    voteNow: "VOTE NOW!",
    head: ["JUDGE MY", "K-FOOD!"],
    poll: "🇰🇷 KOREANS VOTE",
  },
  ko: {
    footer: "링크에서 투표하기 👉",
    court: "한식 법정",
    caseNo: "사건 번호 0001 · 🇰🇷",
    exhibit: "증거 A",
    cook: "요리",
    charge: "혐의",
    jury: "배심원",
    juryValue: "한국인 모집 중",
    verdict: "판결",
    pending: "판결 대기 중",
    voteNow: "지금 투표하기!",
    head: ["내 한식,", "판결해 줘!"],
    poll: "🇰🇷 한국인 투표",
  },
  zh: {
    footer: "韩国人，点链接投票 👉",
    court: "韩餐法庭",
    caseNo: "案件编号 0001 · 🇰🇷",
    exhibit: "证物 A",
    cook: "厨师",
    charge: "罪名",
    jury: "陪审团",
    juryValue: "招募韩国人",
    verdict: "判决",
    pending: "等待判决",
    voteNow: "现在投票！",
    head: ["我的韩餐，", "来评评理！"],
    poll: "🇰🇷 韩国人投票",
  },
  ja: {
    footer: "韓国の人、リンクから投票 👉",
    court: "韓国料理法廷",
    caseNo: "事件番号 0001 · 🇰🇷",
    exhibit: "証拠 A",
    cook: "料理人",
    charge: "容疑",
    jury: "陪審員",
    juryValue: "韓国人募集中",
    verdict: "判決",
    pending: "判決待ち",
    voteNow: "今すぐ投票！",
    head: ["私の一皿、", "ジャッジして！"],
    poll: "🇰🇷 韓国人の投票",
  },
};

/**
 * 카드 색 — bg는 그라데이션(CSS background), fg는 글자색,
 * ink는 제목 강조 띠·선택지 번호처럼 "꽉 찬 덩어리" 색 (inkText는 그 위 글자)
 */
export type CardTheme = { bg: string; fg: string; ink: string; inkText: string };

export type ShareCardPost = {
  title: string;
  dish: string;
  photo: string;
  voteQuestion: string;
  options: string[];
  author: string;
};

// 탭할 때마다 바뀌는 스티커 문구 · 색 · 자리
const STICKER_TEXTS: Record<CardLang, string[]> = {
  en: [
    "Koreans, judge this 🇰🇷",
    "Real K-food?",
    "Vote now!",
    "Crossed the line? 🚫",
    "Koreans, assemble 🚨",
    "Is this legal? 😳",
    "K-food or crime?",
    "One vote please 🙏",
  ],
  ko: ["찐 한식?", "지금 투표!", "선 넘었나요? 🚫", "한국인 출동 🚨", "이거 합법? 😳", "한식이냐 범죄냐", "한 표 부탁 🙏", "판결 부탁 ⚖️"],
  zh: ["正宗韩餐？", "快来投票！", "越界了吗？🚫", "韩国人集合 🚨", "这合法吗？😳", "韩餐还是犯罪？", "求一票 🙏", "请判决 ⚖️"],
  ja: ["本物の韓国料理？", "今すぐ投票！", "やりすぎ？🚫", "韓国人集合 🚨", "これって合法？😳", "韓国料理か犯罪か", "一票ください 🙏", "判決をお願い ⚖️"],
};
const STICKER_COLORS = ["var(--color-primary)", "var(--color-content)", "var(--color-secondary)", "var(--color-lilac)", "#ffffff"];
// 카드 스타일마다 스티커가 붙을 만한 자리 — 모두 카드 안쪽(가장자리에서 6 이상)에 둬서 잘리지 않게
// 두 장은 (0,2) 또는 (1,3) 짝으로 붙으므로 짝끼리 겹치지 않는 자리로
const SPOTS: Record<CardStyle, CSSProperties[]> = {
  // 사진 카드: 사진 오른쪽 위 · 왼쪽 아래 (제목 강조 띠와 제목은 가리지 않게)
  photo: [
    { top: 76, right: 6 },
    { top: 84, left: 6 },
    { top: 200, left: 6 },
    { top: 196, right: 6 },
  ],
  // 투표 카드: 투표 띠 아래 왼쪽 · 사진 아래 오른쪽 (질문·선택지는 가리지 않게 둘 다 질문 위에)
  vote: [
    { top: 46, left: 8 },
    { top: 42, left: 10 },
    { top: 88, right: 8 },
    { top: 84, right: 6 },
  ],
  // 영수증은 글이 빽빽하고 도장도 있어서 스티커 없음 (도장 아래 VOTE NOW!가 대신)
  verdict: [],
};

function stickersFor(style: CardStyle, seed: number, lang: CardLang) {
  // 투표 카드는 위쪽(투표 띠·사진)이 이미 붐벼서 한 장만
  const count = style === "verdict" ? 0 : style === "vote" ? 1 : 2;
  return Array.from({ length: count }, (_, n) => {
    const k = seed * 7 + n * 3 + style.length;
    return {
      text: STICKER_TEXTS[lang][(seed * 3 + n * 5 + style.length) % STICKER_TEXTS[lang].length],
      color: STICKER_COLORS[(seed + n * 2) % STICKER_COLORS.length],
      spot: SPOTS[style][(seed + n * 2) % SPOTS[style].length],
      rotate: ((k * 37) % 22) - 11,
    };
  });
}

/*
  꾸밈 그래픽 (레퍼런스: TYB 카드의 반짝이 · 손그림 화살표)
  - 반짝이 ✦: 스타일마다 정해진 자리에 색·크기를 다르게 (탭하면 스티커와 함께 색이 바뀜)
  - 화살표: 제목 → 사진을 가리키는 손그림 선
*/
const SPARKLE_PATH = "M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z";
const SPARKLE_COLORS = ["#ffffff", "var(--color-content)", "var(--color-primary)", "var(--color-secondary)", "var(--color-lilac)"];
const SPARKLES: Record<CardStyle, { x: number; y: number; s: number }[]> = {
  photo: [
    { x: 168, y: 18, s: 14 },
    { x: 182, y: 46, s: 8 },
    { x: 14, y: 222, s: 9 },
    { x: 176, y: 236, s: 12 },
  ],
  vote: [
    { x: 92, y: 20, s: 12 },
    { x: 106, y: 44, s: 7 },
    { x: 14, y: 132, s: 8 },
  ],
  verdict: [
    { x: 14, y: 12, s: 12 },
    { x: 178, y: 20, s: 9 },
    { x: 20, y: 268, s: 10 },
    { x: 170, y: 262, s: 14 },
  ],
};

function Sparkles({ style, seed }: { style: CardStyle; seed: number }) {
  return SPARKLES[style].map((p, i) => (
    <svg
      key={i}
      viewBox="0 0 24 24"
      className="pointer-events-none absolute drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)]"
      style={{ left: p.x - p.s / 2, top: p.y - p.s / 2, width: p.s, height: p.s }}
      aria-hidden
    >
      <path d={SPARKLE_PATH} fill={SPARKLE_COLORS[(seed + i * 2) % SPARKLE_COLORS.length]} />
    </svg>
  ));
}

export function ShareCard({
  style,
  post,
  theme,
  seed,
  lang = "en",
}: {
  style: CardStyle;
  post: ShareCardPost;
  theme: CardTheme;
  seed: number;
  lang?: CardLang;
}) {
  const t = COPY[lang];
  return (
    <div
      className="relative overflow-hidden rounded-[22px] text-left break-keep"
      style={{ width: CARD_W, height: CARD_H, background: theme.bg, color: theme.fg }}
    >
      <Sparkles style={style} seed={seed} />
      {style === "photo" && <PhotoCard post={post} theme={theme} t={t} cjk={lang === "zh" || lang === "ja"} />}
      {style === "vote" && <VoteCard post={post} theme={theme} t={t} />}
      {style === "verdict" && <VerdictCard post={post} theme={theme} t={t} />}

      {/* 스티커 — 오려 붙인 것처럼 흰 테두리 + 그림자. key가 바뀌면 톡 튀어나옴 */}
      {stickersFor(style, seed, lang).map((s, i) => (
        <span
          key={`${seed}-${i}`}
          className="absolute animate-pop whitespace-nowrap rounded-full px-2.5 py-1.5 font-display text-[11px] leading-none text-on-light"
          style={{
            ...s.spot,
            background: s.color,
            rotate: `${s.rotate}deg`,
            animationDelay: `${i * 90}ms`,
            boxShadow: "0 0 0 2px #ffffff, 0 5px 12px rgba(0,0,0,0.28)",
          }}
        >
          {s.text}
        </span>
      ))}
    </div>
  );
}

/*
  카드 안 간격 (위계)
  - 카드 바깥 여백 12 · 묶음 사이 12~16 · 묶음 안 2~4
  - 맨 아래 출처 줄은 얇은 선으로 떼어 냄
*/

type Copy = (typeof COPY)["en"];

/** 카드 맨 아래 — 어디서 투표하는지 (세 카드 모두 같은 문구) */
function Footer({ t }: { t: Copy }) {
  return (
    <div className="mt-auto flex items-center justify-between border-t border-current/15 pt-2.5 text-[8px] font-bold leading-none">
      <span className="font-display text-[10px]">오늘의 참견</span>
      <span className="opacity-70">{t.footer}</span>
    </div>
  );
}

/** 별 모양 사진 + 흰 테두리 (스티커처럼 오려 붙인 느낌) */
function StickerPhoto({ src, size, rotate, className = "" }: { src: string; size: number; rotate: number; className?: string }) {
  const pad = Math.round(size * 0.045);
  return (
    <div
      className={`relative shrink-0 drop-shadow-[0_8px_14px_rgba(0,0,0,0.3)] ${className}`}
      style={{ width: size, height: size, rotate: `${rotate}deg` }}
    >
      <div
        className="absolute inset-0 bg-white"
        style={{ maskImage: STAR_MASK, WebkitMaskImage: STAR_MASK, maskSize: "100% 100%", WebkitMaskSize: "100% 100%" }}
      />
      <StarPhoto src={src} size={size - pad * 2} className="absolute" style={{ left: pad, top: pad }} />
    </div>
  );
}

/**
 * 큰 제목 두 줄 — 둘째 줄은 진한 띠로 강조 (레퍼런스: "achieve." 띠), 첫 줄 끝에 손그림 화살표(→ 사진)
 * 중·일은 글자가 넓어서 조금 작게 (둘째 줄 띠가 카드 폭 176 안에 들어가게 — 7자 기준)
 */
function Headline({ t, theme, cjk }: { t: Copy; theme: CardTheme; cjk: boolean }) {
  return (
    <div className={`flex flex-col items-start font-display leading-[1.05] tracking-[-0.02em] ${cjk ? "text-[23px]" : "text-[25px]"}`}>
      <span className="flex items-start gap-1.5">
        {t.head[0]}
        <Doodle color={theme.fg} />
      </span>
      <span className="-ml-1 mt-0.5 -rotate-2 rounded-[6px] px-1.5 pt-0.5 pb-1" style={{ background: theme.ink, color: theme.inkText }}>
        {t.head[1]}
      </span>
    </div>
  );
}

/** 손그림 화살표 (제목 → 사진) */
function Doodle({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 44 40" className="pointer-events-none mt-1 shrink-0" style={{ width: 34, height: 30 }} aria-hidden>
      <path
        d="M4 6c10-4 22-2 24 6 2 7-8 9-8 3 0-6 12-7 16 4 2 5 1 11-2 16"
        fill="none"
        stroke={color}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path d="M27 30l7 6 4-9" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PhotoCard({ post, theme, t, cjk }: { post: ShareCardPost; theme: CardTheme; t: Copy; cjk: boolean }) {
  return (
    <div className="relative flex h-full flex-col p-3 pt-3.5">
      <Headline t={t} theme={theme} cjk={cjk} />
      <StickerPhoto src={post.photo} size={158} rotate={4} className="mx-auto mt-3" />
      {/* 제목 2줄·작성자 1줄까지, 넘치면 … (띄어쓰기 없는 긴 단어도 칸 안에서 줄바꿈) */}
      <div className="flex flex-col gap-1 px-0.5 pt-3 pb-3">
        <p className="line-clamp-2 font-display text-[17px] leading-[1.1] [text-wrap:balance] [overflow-wrap:anywhere]">{post.title}</p>
        <p className="truncate text-[9px] font-semibold opacity-70">{post.author}</p>
      </div>
      <Footer t={t} />
    </div>
  );
}

/** 선택지 번호 칩 색 — 브랜드 색을 돌아가며 */
const OPTION_DOTS = ["var(--color-primary)", "var(--color-content)", "var(--color-secondary)", "var(--color-lilac)"];

function VoteCard({ post, theme, t }: { post: ShareCardPost; theme: CardTheme; t: Copy }) {
  const many = post.options.length > 3;
  return (
    <div className="relative flex h-full flex-col p-3 pt-3.5">
      {/* 머리: 투표 표시 띠 + 오른쪽 위에 사진 스티커 */}
      <span
        className="self-start -rotate-3 rounded-full px-2.5 py-1.5 font-display text-[10px] leading-none"
        style={{ background: theme.ink, color: theme.inkText }}
      >
        {t.poll}
      </span>
      <div className="absolute top-2 right-2">
        <StickerPhoto src={post.photo} size={96} rotate={9} />
      </div>
      {/* 질문 — 크게. 선택지가 4개면 2줄, 아니면 3줄까지 (넘치면 …) */}
      {/* 질문 + 선택지 묶음은 사진 아래 남는 자리의 가운데에 */}
      <div className="flex flex-1 flex-col justify-center pt-[86px]">
        <p
          className={`font-display text-[20px] leading-[1.1] [text-wrap:balance] [overflow-wrap:anywhere] ${many ? "line-clamp-2" : "line-clamp-3"}`}
        >
          {post.voteQuestion}
        </p>
        {/* 선택지 — 흰 알약 + 번호 칩 (투표 스티커처럼) */}
        <div className="mt-3 flex flex-col gap-1.5">
          {post.options.slice(0, 4).map((o, i) => (
            // 같은 글자 선택지가 있을 수 있어서 순서로 구분
            <span
              key={i}
              className="flex min-h-[28px] items-center gap-1.5 rounded-full bg-white py-1 pr-2.5 pl-1 text-[11px] font-bold leading-[1.2] text-on-light shadow-[0_3px_8px_rgba(0,0,0,0.14)]"
            >
              <span
                className="flex size-[18px] shrink-0 items-center justify-center rounded-full font-display text-[9px] leading-none text-on-light"
                style={{ background: OPTION_DOTS[i % OPTION_DOTS.length] }}
              >
                {String.fromCharCode(65 + i)}
              </span>
              {/* 한 줄, 넘치면 … (줄바꿈은 안 함 — 저장 이미지에선 글꼴 폭이 조금 달라져서 이모지만 내려가는 문제) */}
              <span className="min-w-0 truncate">{o}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="w-full pt-3">
        <Footer t={t} />
      </div>
    </div>
  );
}

/** 영수증 점선 — 묶음 사이를 나눔 */
function Rule() {
  return <span className="my-2.5 block border-t border-dashed border-black/30" />;
}

function VerdictCard({ post, theme, t }: { post: ShareCardPost; theme: CardTheme; t: Copy }) {
  const row = "flex justify-between gap-2";
  return (
    <div className="flex h-full flex-col p-3 pt-4">
      {/* 영수증 — 아래 가장자리를 톱니 모양으로, 살짝 기울여 올려 둔 종이처럼 */}
      <div className="-rotate-[1.5deg] drop-shadow-[0_8px_14px_rgba(0,0,0,0.25)]">
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
            <p className="font-display text-[13px] leading-none tracking-wide">{t.court}</p>
            <p className="opacity-60">{t.caseNo}</p>
          </div>
          <Rule />
          {/* 증거 */}
          <div className="flex items-center gap-2.5">
            <img src={post.photo} alt="" className="size-[56px] shrink-0 rounded-[4px] object-cover" draggable={false} />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="opacity-60">{t.exhibit}</span>
              <span className="line-clamp-2 font-bold uppercase">{post.dish}</span>
              <span className="truncate opacity-60">{t.cook}: {post.author}</span>
            </div>
          </div>
          <Rule />
          {/* 혐의 */}
          <div className="flex flex-col gap-0.5">
            <span className="opacity-60">{t.charge}</span>
            <p className="line-clamp-3 font-bold">{post.voteQuestion}</p>
          </div>
          <Rule />
          {/* 판결 */}
          <div className="flex flex-col gap-1">
            <div className={row}>
              <span>{t.jury}</span>
              <span className="font-bold">{t.juryValue}</span>
            </div>
            <div className={row}>
              <span>{t.verdict}</span>
              <span className="font-bold">???</span>
            </div>
          </div>
        </div>
      </div>
      {/* 판결 대기 도장 — 진한 띠 + 겹테두리 (기울이면 영수증 끝에 아슬아슬하게 닿아 불안해 보여서 똑바로) */}
      <span
        className="pointer-events-none mx-auto mt-5 rounded-[9px] px-3 py-1.5 font-display text-[15px] leading-none tracking-wide"
        style={{ background: theme.ink, color: theme.inkText, boxShadow: `0 0 0 2px ${theme.ink}, 0 0 0 4px #ffffff` }}
      >
        {t.pending}
      </span>
      <p className={`mt-2.5 text-center font-display text-[12px] leading-none ${t === COPY.en ? "tracking-[0.12em]" : ""}`}>{t.voteNow}</p>
      <div className="mt-auto pt-3">
        <Footer t={t} />
      </div>
    </div>
  );
}
