import type { HomePost } from "@/app/home/mockPosts";
import type { Notif } from "@/app/notifications/data";
import type { Comment } from "@/app/posts/[id]/comments";
import { COMMENT_MAX } from "@/app/posts/[id]/comments";
import { OPTION_MAX, OPTIONS_MAX, STORY_MAX, TITLE_MAX, VOTE_TITLE_MAX } from "@/lib/write-data";

/*
  점검 화면(/dev/edge-cases)에 넣는 극단 데이터 (송희)
  최대 길이는 입력칸 한도(src/lib/write-data.ts 등)에서 바로 만듦 → 한도를 바꾸면 여기도 따라 바뀜
  새 컴포넌트를 만들면 여기에 극단값 예시를 추가하세요 (AGENTS.md)
*/

/** base를 이어 붙여 정확히 n자로 (예: fill("비슷", 7) → "비슷비슷비슷비") */
export const fill = (base: string, n: number) => base.repeat(Math.ceil(n / base.length)).slice(0, n);

/** 자주 깨지는 글자 모양 — 화면마다 이걸 다 넣어 봄 */
export const TEXTS = {
  one: "맛",
  koMax: (n: number) => fill("매우매우비슷해요 ", n).trimEnd(),
  /** 띄어쓰기 없는 긴 영어 — 줄바꿈이 안 돼서 가장 잘 깨짐 */
  enWord: (n: number) => fill("Supercalifragilisticexpialidocious", n),
  enMax: (n: number) => fill("Very very similar ", n).trimEnd(),
  emoji: (n: number) => fill("🔥🧀🌶️", n),
  ja: (n: number) => fill("チーズがブルダックを食べてる", n),
};

const PHOTO = "/images/card-buldak.png";

/** 상세·메인 카드용 글 하나 — 바꿀 부분만 넘김 */
export function post(id: string, patch: Partial<HomePost> = {}): HomePost {
  return {
    id: `edge-${id}`,
    title: "제가 만든 불닭 레시피 어떤가요?",
    body: "불닭을 처음 만들어 봤어요.",
    photos: [PHOTO],
    cardPhoto: PHOTO,
    color: "#fae276",
    en: { title: "What do you think of my Buldak recipe?", country: "Canada" },
    author: { name: "Saucy Taster", country: "캐나다", flag: "🇨🇦" },
    createdAt: "2026-10-01T00:00:00Z",
    question: { id: "korean", text: "한국에서 먹는 불닭이랑 비슷한가요?", options: ["완전\n한국식", "비슷해요", "한국식\n아님"] },
    votes: [120, 98, 44],
    commentCount: 18,
    ...patch,
  };
}

/** 선택지 n개 — 맨 앞에 번호를 붙여 서로 다르게 (같은 글자 선택지는 따로 한 경우로 봄) */
const opts = (text: (i: number) => string, count = OPTIONS_MAX) => Array.from({ length: count }, (_, i) => `${i + 1}${text(i)}`.slice(0, OPTION_MAX));

/** 메인 카드 */
export const CARD_CASES: { label: string; post: HomePost; lang?: "ko" | "en" }[] = [
  { label: "제목 1자 · 투표 0명 · 한마디 0", post: post("c1", { title: TEXTS.one, votes: [0, 0, 0], commentCount: 0 }) },
  { label: `제목 최대 ${TITLE_MAX}자 (한국어)`, post: post("c2", { title: TEXTS.koMax(TITLE_MAX) }) },
  { label: "한국어 번역 40자 (3줄 꽉)", post: post("c5", { title: fill("한국 사람들은 이 불닭 까르보나라를 어떻게 생각할까요 정말 궁금해요 ", 40).trimEnd() }) },
  {
    label: `영어 대문자 ${TITLE_MAX}자 (외국인 메인)`,
    lang: "en",
    post: post("c6", { en: { title: fill("WOW MMM WHAT DO KOREANS THINK OF MY HOMEMADE BULDAK ", TITLE_MAX).trimEnd(), country: "Canada" } }),
  },
  { label: "띄어쓰기 없는 긴 영어 제목 · 투표 9,999명", post: post("c3", { title: TEXTS.enWord(TITLE_MAX), votes: [5000, 3000, 1999], commentCount: 9999 }) },
  { label: "닉네임·나라 길게", post: post("c4", { author: { name: "Extremely Saucy Cheesy Taster", country: "보스니아 헤르체고비나", flag: "🇧🇦" } }) },
];

/** 상세 투표 칸 */
export const VOTE_CASES: { label: string; post: HomePost }[] = [
  { label: "선택지 2개 · 1자", post: post("v1", { question: { id: "korean", text: "맛있나요?", options: ["네", "음"] }, votes: [1, 0] }) },
  {
    label: `선택지 ${OPTIONS_MAX}개 · 최대 ${OPTION_MAX}자`,
    post: post("v2", { question: { id: "korean", text: TEXTS.koMax(VOTE_TITLE_MAX), options: opts(() => TEXTS.koMax(OPTION_MAX)) }, votes: [40, 30, 20, 10] }),
  },
  {
    label: `선택지 ${OPTIONS_MAX}개 · 띄어쓰기 없는 긴 영어`,
    post: post("v3", { question: { id: "korean", text: "Is this Korean?", options: opts(() => TEXTS.enWord(OPTION_MAX)) }, votes: [100, 0, 0, 0] }),
  },
  { label: "아무도 투표 안 함 (0%)", post: post("v4", { votes: [0, 0, 0] }) },
  // 같은 선택지를 두 번 쓴 경우 — 칸 구분에 글자를 쓰면 깨짐
  { label: "같은 선택지 2개", post: post("v5", { question: { id: "korean", text: "어때요?", options: ["좋아요", "좋아요", "별로"] }, votes: [3, 2, 1] }) },
];

/** 한마디 더미 */
const KOREAN = { kind: "korean" } as const;
const COLORS = ["#ffe056", "#ffc6ff", "#c8b5ff", "#ccf54b", "#9fe7ff", "#ffae8f"];
const comment = (i: number, text: string, kind: Comment["kind"] = "text"): Comment => ({
  id: `edge-comment-${i}`,
  kind,
  text,
  color: COLORS[i % COLORS.length],
  author: i % 4 === 0 ? { kind: "author", flag: "🇨🇦" } : i % 3 === 0 ? { kind: "foreigner", flag: "🇺🇸" } : KOREAN,
});
export const COMMENT_CASES: { label: string; comments: Comment[] }[] = [
  { label: "한마디 0개", comments: [] },
  {
    label: `1자 · 최대 ${COMMENT_MAX}자 · 긴 영어 · 이모지`,
    comments: [
      comment(1, TEXTS.one),
      comment(2, TEXTS.koMax(COMMENT_MAX)),
      comment(3, TEXTS.enWord(COMMENT_MAX)),
      comment(4, "🔥", "emoji"),
      comment(5, TEXTS.ja(COMMENT_MAX)),
    ],
  },
  { label: "한마디 40개 (넘침)", comments: Array.from({ length: 40 }, (_, i) => comment(i, i % 3 ? TEXTS.koMax(8 + (i % 12)) : "🤤", i % 3 ? "text" : "emoji")) },
];

/** 마이 사진 타일 (사진 없는 글은 없음 — 글은 사진 1장 이상이어야 올라감) */
export const TILE_CASES = [
  { label: "짧게", chip: "네", title: TEXTS.one },
  { label: "칩·제목 최대", chip: TEXTS.koMax(OPTION_MAX), title: TEXTS.koMax(TITLE_MAX) },
  { label: "긴 영어", chip: TEXTS.enWord(OPTION_MAX), title: TEXTS.enWord(TITLE_MAX) },
];

/** 알림 카드 */
const notif = (id: string, patch: Partial<Notif>): Notif => ({
  id: `edge-${id}`,
  type: "reply",
  postId: "1",
  postTitle: "제가 만든 불닭 레시피 어떤가요?",
  detail: "삼김 조합 진짜 인정이요",
  day: "오늘",
  time: "21:50",
  read: false,
  ...patch,
});
export const NOTIF_CASES = {
  ko: [
    notif("n1", { detail: TEXTS.koMax(COMMENT_MAX) }),
    notif("n2", { byAuthor: true, actor: "Extremely Saucy Cheesy Taster", detail: TEXTS.enWord(COMMENT_MAX) }),
  ],
  en: [
    notif("n3", { type: "comment", postId: "mine", detail: TEXTS.koMax(COMMENT_MAX), translated: TEXTS.enMax(60) }),
    notif("n4", { type: "milestone", postId: "mine", postTitle: TEXTS.enWord(TITLE_MAX), detail: "9990" }),
  ],
};

/** 공유 카드 */
export const SHARE_CASES = [
  {
    label: "최대 길이",
    post: {
      title: TEXTS.koMax(TITLE_MAX),
      dish: TEXTS.koMax(30),
      photo: PHOTO,
      voteQuestion: TEXTS.koMax(VOTE_TITLE_MAX),
      options: opts(() => TEXTS.koMax(OPTION_MAX)),
      author: "Extremely Saucy Cheesy Taster · Bosnia and Herzegovina",
    },
  },
  {
    label: "긴 영어",
    post: {
      title: TEXTS.enWord(TITLE_MAX),
      dish: TEXTS.enWord(30),
      photo: PHOTO,
      voteQuestion: TEXTS.enWord(VOTE_TITLE_MAX),
      options: opts(() => TEXTS.enWord(OPTION_MAX)),
      author: "Saucy Taster · Canada",
    },
  },
];

/** 작성 화면 입력칸 */
export const FIELD_CASES = [
  { label: "Title", value: TEXTS.koMax(TITLE_MAX), max: TITLE_MAX, rows: 1 },
  { label: "Title (긴 영어)", value: TEXTS.enWord(TITLE_MAX), max: TITLE_MAX, rows: 1 },
  { label: "Story", value: TEXTS.koMax(STORY_MAX), max: STORY_MAX, rows: 4 },
];

/* ───────── 상세 화면 · 작성 화면 (높음) ───────── */

/** 상세 글 카드 (제목·본문·글쓴이) — 글쓴이는 외국인이라 영어 원문(en)도 같이 */
export const DETAIL_CASES: { label: string; post: HomePost; lang: "ko" | "en" }[] = [
  {
    label: `제목 ${TITLE_MAX}자 · 본문 ${STORY_MAX}자 (한국어)`,
    lang: "ko",
    post: post("d1", { title: TEXTS.koMax(TITLE_MAX), body: fill("불닭을 처음 만들어 봤어요. 치즈를 두 배로 넣었는데 괜찮을까요? ", STORY_MAX).trimEnd() }),
  },
  {
    label: `영어 대문자 제목 ${TITLE_MAX}자 · 긴 단어 본문`,
    lang: "en",
    post: post("d2", {
      en: {
        title: fill("WOW MMM WHAT DO KOREANS THINK OF MY HOMEMADE BULDAK ", TITLE_MAX).trimEnd(),
        country: "Canada",
        body: fill("Supercalifragilisticexpialidocious ", 200).trimEnd(),
      },
    }),
  },
  {
    label: "긴 닉네임 · 긴 나라 이름",
    lang: "en",
    post: post("d3", { author: { name: "Extremely Saucy Cheesy Taster", country: "보스니아 헤르체고비나", flag: "🇧🇦" }, en: { title: "Short title", country: "Bosnia and Herzegovina" } }),
  },
];

/** 상세 사진 칸 + 참여 인원 칩 */
export const PHOTO_CASES: { label: string; post: HomePost; chip: string }[] = [
  { label: "사진 1장 · 0명", post: post("p1", { photos: [PHOTO] }), chip: "0명 참여 중" },
  { label: "사진 10장 · 9,999명", post: post("p2", { photos: Array.from({ length: 10 }, () => PHOTO) }), chip: "9,999명 참여 중" },
  { label: "영어 · 9,999 joined", post: post("p3"), chip: "9,999 joined" },
];

/** 다음 훈수 거리 버튼 — 넘어갈 글 제목 */
export const NEXT_CASES = [
  { label: "짧은 제목", title: TEXTS.one },
  { label: `한국어 ${TITLE_MAX}자`, title: TEXTS.koMax(TITLE_MAX) },
  { label: "띄어쓰기 없는 긴 영어", title: TEXTS.enWord(TITLE_MAX) },
];

/** 답글 레이어 — 원 한마디 + 답글들 */
const reply = (i: number, text: string, replyTo: string, patch: Partial<Comment> = {}): Comment => ({ ...comment(i, text), replyTo, ...patch });
const ROOT = comment(100, TEXTS.koMax(COMMENT_MAX));
export const MODAL_CASES: { label: string; comment: Comment; replies: Comment[]; hidden?: string[] }[] = [
  { label: `원 한마디 ${COMMENT_MAX}자 · 답글 0개`, comment: ROOT, replies: [] },
  {
    label: "답글 30개 (긴 글·영어·이모지 섞어서)",
    comment: ROOT,
    replies: Array.from({ length: 30 }, (_, i) =>
      reply(200 + i, i % 3 === 0 ? TEXTS.enWord(COMMENT_MAX) : i % 3 === 1 ? TEXTS.koMax(COMMENT_MAX) : "🔥", ROOT.id),
    ),
  },
  {
    label: "답글에 단 답글 · 글쓴이 · 내 답글 · 가려진 답글",
    comment: ROOT,
    replies: [
      reply(300, "저도 그렇게 생각해요", ROOT.id, { author: KOREAN }),
      reply(301, TEXTS.koMax(COMMENT_MAX), "edge-comment-300", { author: { kind: "author", flag: "🇨🇦" } }),
      reply(302, "내가 쓴 답글", "edge-comment-301", { mine: true, edited: true }),
      reply(303, "신고해서 가린 답글", ROOT.id),
    ],
    hidden: ["edge-comment-303"],
  },
];

/** 로그인 시트 제목 — "'(선택지)'에 투표할까요?" */
export const LOGIN_CASES = [
  { label: `선택지 ${OPTION_MAX}자 (한국어 번역)`, title: `‘${TEXTS.koMax(OPTION_MAX)}’에 투표할까요?` },
  { label: "띄어쓰기 없는 긴 영어", title: `‘${TEXTS.enWord(OPTION_MAX)}’에 투표할까요?` },
];

/** 음식 이름 카드 (작성 ①) — 직접 고칠 때 최대 40자 (DishCard) */
const DISH_MAX = 40;
export const DISH_CASES = [
  { label: "짧은 이름", dish: "Ramyeon" },
  { label: `영어 ${DISH_MAX}자`, dish: fill("Cheesy Buldak Carbonara with Sausage ", DISH_MAX).trimEnd() },
  { label: "띄어쓰기 없는 긴 영어", dish: TEXTS.enWord(DISH_MAX) },
];

/** 선택지 편집 (작성 ③ · 수정) */
export const OPTIONS_CASES = [
  { label: `${OPTIONS_MAX}개 · 최대 ${OPTION_MAX}자 (영어)`, options: opts(() => TEXTS.enMax(OPTION_MAX)) },
  { label: "띄어쓰기 없는 긴 영어", options: opts(() => TEXTS.enWord(OPTION_MAX)) },
  { label: "같은 글자 선택지", options: ["Same", "Same", "Different"] },
];

/* ───────── 번역 (원문 50자 → 다른 언어로 보일 때) ─────────
   제목 한도는 모든 언어 50자 (TITLE_MAX). 일·중·한 50자는 영어로 옮기면 2~3배 길어져서 가장 위험
   번역문은 길이 확인용 (서버가 붙으면 DeepL 결과로 바꿔 넣기) */
const JA_50 = fill("初めて作ったチーズたっぷりブルダックカルボナーラ、韓国の人から見て本場の味に近いですか？", TITLE_MAX);
const ZH_50 = fill("第一次做的芝士火鸡面奶油意面，在韩国人看来味道接近正宗的吗？请告诉我你们的真实想法吧谢谢", TITLE_MAX);
const EN_50 = fill("My first cheesy Buldak Carbonara, is it close to real ", TITLE_MAX).trimEnd();
/** 한 글을 네 언어로 — 화면 언어(lang)에 따라 그 언어 제목이 보임 */
const translated = (id: string, t: { ko: string; en: string; zh: string; ja: string }) =>
  post(id, { title: t.ko, en: { title: t.en, country: "Japan" }, titles: { zh: t.zh, ja: t.ja } });
const FROM_JA = translated("t1", {
  ja: JA_50,
  en: "My first homemade Buldak Carbonara loaded with cheese. To Koreans, does it taste close to the real thing?",
  ko: "처음 만든 치즈 듬뿍 불닭 카르보나라, 한국 사람이 보기에 본고장 맛에 가까운가요?",
  zh: "第一次做的满满芝士火鸡面奶油意面，在韩国人看来接近正宗的味道吗？",
});
const FROM_ZH = translated("t2", {
  zh: ZH_50,
  en: "My first try at cheesy Buldak cream pasta. Do Koreans think it tastes close to the authentic one? Please tell me what you honestly think, thanks",
  ko: "처음 만든 치즈 불닭 크림 파스타, 한국 사람이 보기엔 정통 맛에 가까운가요? 솔직한 생각을 알려 주세요, 고마워요",
  ja: "初めて作ったチーズブルダッククリームパスタ、韓国の人から見て本場の味に近いですか？正直な感想を教えてください、ありがとう",
});
const FROM_EN = translated("t3", {
  en: EN_50,
  ko: "처음 만든 치즈 불닭 카르보나라, 진짜에 가까운가요",
  zh: "我第一次做的芝士火鸡面奶油意面，接近正宗吗",
  ja: "初めて作ったチーズブルダックカルボナーラ、本物に近い？",
});
export const TRANSLATION_CASES: { label: string; lang: "ko" | "en" | "zh" | "ja"; post: HomePost }[] = [
  { label: "일본어 원문 50자 → 일본어 화면", lang: "ja", post: FROM_JA },
  { label: "일본어 원문 50자 → 영어 번역 (가장 위험)", lang: "en", post: FROM_JA },
  { label: "일본어 원문 50자 → 한국어 번역", lang: "ko", post: FROM_JA },
  { label: "중국어 원문 50자 → 중국어 화면", lang: "zh", post: FROM_ZH },
  { label: "중국어 원문 50자 → 영어 번역 (가장 위험)", lang: "en", post: FROM_ZH },
  { label: "중국어 원문 50자 → 한국어 번역", lang: "ko", post: FROM_ZH },
  { label: "중국어 원문 50자 → 일본어 번역", lang: "ja", post: FROM_ZH },
  { label: "영어 원문 50자 → 일본어 번역", lang: "ja", post: FROM_EN },
  { label: "영어 원문 50자 → 중국어 번역", lang: "zh", post: FROM_EN },
];
