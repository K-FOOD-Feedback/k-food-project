/*
  인앱 알림 임시 데이터 (4. 알림, 담당 송희)
  서버(Supabase) 연결 후: 일이 생기는 즉시 notifications 테이블에 쌓고,
  Realtime으로 이 화면에 바로 밀어 넣습니다.

  누가 무엇을 받나 (투표는 끝나는 개념이 없어서 "결과" 알림은 없음)
  - 외국인(글쓴이)
    · first     내 글에 첫 반응(투표나 댓글)이 왔을 때
    · comment   내 글에 댓글이 달렸을 때
    · milestone 투표가 10 · 20 · 30 … 10표 단위로 쌓일 때마다
    · reply     내 댓글에 대댓글이 달렸을 때
    · draft     쓰다 만 글(나중에 하기)이 있을 때
  - 한국인
    · reply     내 댓글에 대댓글이 달렸을 때
*/

import { getHomePost } from "@/app/home/mockPosts";
import { titleIn } from "@/app/home/titles";
import type { UiLang } from "@/app/posts/[id]/viewerLang";
import { TIME } from "@/app/my/parts";

/** 누구의 알림함인지 — 외국인(글쓴이) · 한국인. 화면 언어(UiLang)는 따로 (🌐에서 고른 언어) */
export type Lang = "en" | "ko";
export type NotifType = "first" | "comment" | "milestone" | "reply" | "draft";

export type Notif = {
  id: string;
  type: NotifType;
  postId: string;
  /** 글 제목을 직접 정할 때만 (점검 화면 등). 없으면 그 글의 제목을 화면 언어로 */
  postTitle?: string;
  /** 남긴 사람 — 글쓴이(외국인)일 때만. 한국인 한마디는 익명이라 비워 둠 */
  actor?: string;
  /** 댓글·대댓글: 내용 · milestone: 표 수 */
  detail: string;
  /** detail 을 쓴 언어 (번역은 화면 언어가 이것과 다를 때만) */
  detailLang?: UiLang;
  /** detail 번역본 (자동 번역이 켜져 있으면 화면 언어 것을 보여 줌) — 서버가 붙으면 번역 결과 */
  translated?: Partial<Record<UiLang, string>>;
  /** reply: 답글이 달린 내 한마디 id — 누르면 그 한마디 레이어가 바로 열림 (?comment=) */
  commentId?: string;
  /** 한국인 reply: 대댓글을 단 사람이 그 글의 글쓴이(외국인)인지 */
  byAuthor?: boolean;
  /** 몇 ms 전에 왔는지 (서버가 붙으면 받은 시각) */
  ago: number;
  read: boolean;
};

/** 내 글 제목 (서버 연결 전 예시) — 화면 언어별 */
const MY_TITLE: Record<UiLang, string> = {
  en: "Buldak Carbonara with extra cheese",
  ko: "치즈 듬뿍 까르보 불닭",
  zh: "芝士加倍奶油火鸡面",
  zht: "芝士加倍奶油火雞麵",
  ja: "チーズたっぷりカルボブルダック",
};

/** 알림에 보일 글 제목 (화면 언어로) */
export function postTitleOf(n: Notif, ui: UiLang) {
  if (n.postTitle) return n.postTitle;
  if (n.postId === "mine") return MY_TITLE[ui];
  const post = getHomePost(n.postId);
  return post ? titleIn(post, ui) : "";
}

/** 알림 왼쪽에 보여 줄 그 글의 음식 사진 */
export function photoOf(n: Notif) {
  if (n.type === "draft") return "/images/draft-thumb.png"; // 쓰다 만 글의 첫 사진
  if (n.postId === "mine") return "/images/buldak-skillet.jpg"; // 내 글 (서버 연결 전 예시)
  return getHomePost(n.postId)?.cardPhoto ?? "/images/card-buldak.png";
}

/** 서버 전 예시: 답글이 달린 "내 한마디"는 모든 글에 처음부터 있는 답글 달린 한마디 ("참치마요 삼김이랑…") */
const repliedComment = (postId: string) => `${postId}-seed-5`;
const { MIN, HOUR, DAY } = TIME;

// ── 외국인 (내 글 · 남의 글에 단 내 한마디)
const MINE = { postId: "mine" };
const OTHER = { postId: "2" };

const EN_INCOMING: Notif = {
  ...MINE,
  id: "en-live",
  type: "comment",
  detail: "면이 어디 있는데요 ㅋㅋ",
  detailLang: "ko",
  translated: { en: "Where are the noodles lol", zh: "面在哪儿啊哈哈", zht: "面在哪兒啊哈哈", ja: "麺はどこですかw" },
  ago: 0,
  read: false,
};

const EN: Notif[] = [
  {
    ...MINE, id: "en1", type: "comment", detail: "치즈 더 넣으면 완벽할 듯 ㅋㅋ", detailLang: "ko",
    translated: { en: "A bit more cheese and it'd be perfect lol", zh: "再多放点芝士就完美了哈哈", zht: "再多放點芝士就完美了哈哈", ja: "チーズもっと入れたら完璧かもw" },
    ago: 20 * MIN, read: false,
  },
  {
    ...MINE, id: "en2", type: "comment", detail: "불닭은 원래 이렇게 먹는 거 맞아요", detailLang: "ko",
    translated: { en: "Yep, this is exactly how you eat Buldak", zh: "火鸡面本来就是这么吃的", zht: "火雞麵本來就是這麼吃的", ja: "ブルダックはもともとこうやって食べるんですよ" },
    ago: 35 * MIN, read: false,
  },
  {
    ...OTHER, id: "en3", type: "reply", commentId: repliedComment(OTHER.postId), detail: "저도 그렇게 생각해요!", detailLang: "ko",
    translated: { en: "I think so too!", zh: "我也这么觉得！", zht: "我也這麼覺得！", ja: "私もそう思います！" },
    ago: 50 * MIN, read: false,
  },
  { ...MINE, id: "en4", type: "milestone", detail: "20", ago: 3 * HOUR, read: true },
  { ...MINE, id: "en5", type: "milestone", detail: "10", ago: DAY + 2 * HOUR, read: true },
  { ...MINE, id: "en6", type: "draft", detail: "", ago: DAY + 9 * HOUR, read: true },
  { ...MINE, id: "en7", type: "first", detail: "", ago: 10 * DAY, read: true },
];

// ── 한국인 (대댓글만)
const BULDAK = { postId: "1" };
const TTEOK = { postId: "5" };

const KO_INCOMING: Notif = {
  ...BULDAK,
  id: "ko-live",
  type: "reply",
  commentId: repliedComment(BULDAK.postId),
  actor: "Sam",
  byAuthor: true,
  detail: "고마워요! 다음엔 참치마요 삼김이랑 먹어 볼게요",
  detailLang: "ko",
  translated: { en: "Thanks! Next time I'll try it with tuna mayo kimbap", zh: "谢谢！下次我配金枪鱼蛋黄酱饭团试试", zht: "謝謝！下次我配金槍魚蛋黃醬飯糰試試", ja: "ありがとう！次はツナマヨおにぎりと食べてみます" },
  ago: 0,
  read: false,
};

const KO: Notif[] = [
  {
    ...BULDAK, id: "ko1", type: "reply", commentId: repliedComment(BULDAK.postId), detail: "삼김 조합 진짜 인정이요", detailLang: "ko",
    translated: { en: "Triangle kimbap combo, totally agree", zh: "三角饭团组合，真的认同", zht: "三角飯糰組合，真的認同", ja: "おにぎりとの組み合わせ、本当に同感です" },
    ago: 15 * MIN, read: false,
  },
  {
    ...BULDAK, id: "ko2", type: "reply", commentId: repliedComment(BULDAK.postId), detail: "저도 그렇게 먹어요 ㅋㅋ", detailLang: "ko",
    translated: { en: "I eat it that way too lol", zh: "我也是这么吃的哈哈", zht: "我也是這麼吃的哈哈", ja: "私もそうやって食べますw" },
    ago: 40 * MIN, read: false,
  },
  {
    ...TTEOK, id: "ko4", type: "reply", commentId: repliedComment(TTEOK.postId), actor: "Mia", byAuthor: true,
    detail: "Wow I didn't know that! Thank you", detailLang: "en",
    translated: { ko: "와 몰랐어요! 고마워요", zh: "哇，我都不知道！谢谢", zht: "哇，我都不知道！謝謝", ja: "へえ、知りませんでした！ありがとう" },
    ago: DAY + 3 * HOUR, read: true,
  },
  {
    ...TTEOK, id: "ko5", type: "reply", commentId: repliedComment(TTEOK.postId), detail: "치즈 떡볶이엔 라면사리죠", detailLang: "ko",
    translated: { en: "Cheesy tteokbokki needs ramen noodles", zh: "芝士炒年糕就得加拉面", zht: "芝士炒年糕就得加拉麵", ja: "チーズトッポッキにはラーメンですよね" },
    ago: 11 * DAY, read: true,
  },
];

export const DATA: Record<Lang, { incoming: Notif; list: Notif[] }> = {
  en: { incoming: EN_INCOMING, list: EN },
  ko: { incoming: KO_INCOMING, list: KO },
};

const DAY_WORDS: Record<UiLang, { today: string; yesterday: string }> = {
  ko: { today: "오늘", yesterday: "어제" },
  en: { today: "Today", yesterday: "Yesterday" },
  zh: { today: "今天", yesterday: "昨天" },
  zht: { today: "今天", yesterday: "昨天" },
  ja: { today: "今日", yesterday: "昨日" },
};

/** 묶음 제목 — 오늘 · 어제 · 그 전은 날짜 (9/4 · Sep 4, 해가 다르면 2025/9/4 · Sep 4, 2025) */
function dayLabel(at: number, now: number, ui: UiLang) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (at >= start.getTime()) return DAY_WORDS[ui].today;
  if (at >= start.getTime() - DAY) return DAY_WORDS[ui].yesterday;
  const d = new Date(at);
  const sameYear = d.getFullYear() === start.getFullYear();
  if (ui === "en") {
    const mon = d.toLocaleDateString("en-US", { month: "short" });
    return sameYear ? `${mon} ${d.getDate()}` : `${mon} ${d.getDate()}, ${d.getFullYear()}`;
  }
  return sameYear ? `${d.getMonth() + 1}/${d.getDate()}` : `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

/** 날짜별로 나눕니다 (알림이 많지 않아서 묶지 않고 하나씩 보여 줌) */
export function groupByDay(list: Notif[], now: number, ui: UiLang) {
  const days: { day: string; items: Notif[] }[] = [];
  for (const n of list) {
    const day = dayLabel(now - n.ago, now, ui);
    const last = days.at(-1);
    if (last && last.day === day) last.items.push(n);
    else days.push({ day, items: [n] });
  }
  return days;
}
