/*
  인앱 알림 임시 데이터 (4. 알림, 담당 송희)
  서버(Supabase) 연결 후: 투표·댓글·답글이 달리는 즉시 notifications 테이블에 쌓고,
  Realtime으로 이 화면에 바로 밀어 넣습니다.

  누가 무엇을 받나
  - 외국인(글쓴이): 내 글에 투표 · 댓글 · 투표 N명 돌파
  - 한국인: 내 댓글에 답글 · 내가 투표한 글의 결과
*/

export type Lang = "en" | "ko";
export type NotifType = "vote" | "comment" | "milestone" | "reply" | "result";
/** 탭: 투표 쪽 / 댓글 쪽 */
export type FilterId = "all" | "vote" | "comment";

export type Notif = {
  id: string;
  type: NotifType;
  /** 같은 날 · 같은 글 · 같은 종류가 이어지면 한 묶음(카드 더미)으로 보여 줍니다 */
  postId: string;
  postTitle: string;
  /** 남긴 사람. 한국인 댓글은 익명이라 비워 둠 */
  actor?: string;
  /** 투표: 고른 선택지 · 댓글/답글: 내용 · 기록/결과: 숫자 */
  detail: string;
  day: string;
  time: string;
  read: boolean;
};

export const FILTERS: Record<Lang, { id: FilterId; label: string }[]> = {
  en: [
    { id: "all", label: "All" },
    { id: "vote", label: "Votes" },
    { id: "comment", label: "Comments" },
  ],
  ko: [
    { id: "all", label: "전체" },
    { id: "vote", label: "투표" },
    { id: "comment", label: "댓글" },
  ],
};

const SIDE: Record<NotifType, Exclude<FilterId, "all">> = {
  vote: "vote",
  milestone: "vote",
  result: "vote",
  comment: "comment",
  reply: "comment",
};
export const matchesFilter = (n: Notif, f: FilterId) => f === "all" || SIDE[n.type] === f;

// ── 외국인
const MINE = { postId: "mine", postTitle: "Buldak Carbonara with extra cheese" };

const EN_INCOMING: Notif = {
  ...MINE,
  id: "en-live",
  type: "vote",
  actor: "지우",
  detail: "Korean enough!",
  day: "Today",
  time: "Just now",
  read: false,
};

const EN: Notif[] = [
  { ...MINE, id: "en1", type: "comment", actor: "하준", detail: "치즈 더 넣으면 완벽할 듯 ㅋㅋ", day: "Today", time: "21:55", read: false },
  { ...MINE, id: "en2", type: "vote", actor: "민지", detail: "Korean enough!", day: "Today", time: "21:40", read: false },
  { ...MINE, id: "en3", type: "vote", actor: "서연", detail: "Almost there", day: "Today", time: "21:31", read: false },
  { ...MINE, id: "en4", type: "vote", actor: "도윤", detail: "Korean enough!", day: "Today", time: "21:12", read: true },
  { ...MINE, id: "en5", type: "milestone", detail: "10", day: "Today", time: "20:43", read: true },
  { ...MINE, id: "en6", type: "comment", actor: "유나", detail: "불닭은 원래 이렇게 먹는 거 맞아요", day: "Yesterday", time: "20:33", read: true },
  { ...MINE, id: "en7", type: "comment", actor: "지호", detail: "Looks better than mine honestly", day: "Yesterday", time: "19:02", read: true },
  { ...MINE, id: "en8", type: "vote", actor: "수아", detail: "Not Korean at all", day: "Yesterday", time: "18:47", read: true },
  { ...MINE, id: "en9", type: "vote", actor: "은우", detail: "Korean enough!", day: "Oct 5", time: "20:36", read: true },
];

// ── 한국인
const BULDAK = { postId: "1", postTitle: "불닭 까르보나라" };
const TTEOK = { postId: "2", postTitle: "치즈 떡볶이" };

const KO_INCOMING: Notif = {
  ...BULDAK,
  id: "ko-live",
  type: "reply",
  actor: "Sam 🇨🇦",
  detail: "고마워요! 다음엔 참치마요 삼김이랑 먹어 볼게요",
  day: "오늘",
  time: "방금",
  read: false,
};

const KO: Notif[] = [
  { ...BULDAK, id: "ko1", type: "reply", detail: "삼김 조합 진짜 인정이요", day: "오늘", time: "21:50", read: false },
  { ...BULDAK, id: "ko2", type: "reply", detail: "저도 그렇게 먹어요 ㅋㅋ", day: "오늘", time: "21:38", read: false },
  { ...TTEOK, id: "ko3", type: "result", detail: "62", day: "오늘", time: "20:10", read: true },
  { ...TTEOK, id: "ko4", type: "reply", actor: "Mia 🇺🇸", detail: "Wow I didn't know that! Thank you", day: "어제", time: "22:04", read: true },
  { ...BULDAK, id: "ko5", type: "result", detail: "46", day: "10월 5일", time: "18:20", read: true },
];

export const DATA: Record<Lang, { incoming: Notif; list: Notif[] }> = {
  en: { incoming: EN_INCOMING, list: EN },
  ko: { incoming: KO_INCOMING, list: KO },
};

/** 같은 날 안에서 이어지는 같은 글·같은 종류 알림을 묶습니다 (기록·결과·글쓴이 답글은 묶지 않음) */
export function groupByDay(list: Notif[]) {
  const days: { day: string; stacks: Notif[][] }[] = [];
  for (const n of list) {
    let day = days.at(-1);
    if (!day || day.day !== n.day) {
      day = { day: n.day, stacks: [] };
      days.push(day);
    }
    const last = day.stacks.at(-1);
    // 글쓴이(외국인)의 답글은 따로 눈에 띄게 — 묶지 않음
    const stackable = (x: Notif) => x.type !== "milestone" && x.type !== "result" && !(x.type === "reply" && x.actor);
    if (last && stackable(n) && stackable(last[0]) && last[0].type === n.type && last[0].postId === n.postId) last.push(n);
    else day.stacks.push([n]);
  }
  return days;
}
