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
    · quiet     올리고 24시간 동안 반응이 없을 때 → 공유 유도
    · draft     쓰다 만 글(나중에 하기)이 있을 때
  - 한국인
    · reply     내 댓글에 대댓글이 달렸을 때
*/

export type Lang = "en" | "ko";
export type NotifType = "first" | "comment" | "milestone" | "reply" | "quiet" | "draft";
/** 탭(외국인만): 투표 쪽 / 댓글 쪽. 한국인은 대댓글 하나뿐이라 탭 없음 */
export type FilterId = "all" | "vote" | "comment";

export type Notif = {
  id: string;
  type: NotifType;
  /** 같은 날 · 같은 글 · 같은 종류가 이어지면 한 묶음(카드 더미)으로 보여 줍니다 */
  postId: string;
  postTitle: string;
  /** 남긴 사람. 한국인 댓글은 익명이라 비워 둠 */
  actor?: string;
  /** 댓글·대댓글: 내용 · milestone: 표 수 */
  detail: string;
  /** 한국인 reply: 대댓글을 단 사람이 그 글의 글쓴이(외국인)인지 — 따로 눈에 띄게 */
  byAuthor?: boolean;
  day: string;
  time: string;
  read: boolean;
};

export const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "vote", label: "Votes" },
  { id: "comment", label: "Comments" },
];

const SIDE: Record<NotifType, FilterId> = {
  first: "all",
  milestone: "vote",
  comment: "comment",
  reply: "comment",
  quiet: "all",
  draft: "all",
};
export const matchesFilter = (n: Notif, f: FilterId) => f === "all" || SIDE[n.type] === f;

// ── 외국인
const MINE = { postId: "mine", postTitle: "Buldak Carbonara with extra cheese" };
const TTEOK = { postId: "2", postTitle: "치즈 떡볶이" };

const EN_INCOMING: Notif = {
  ...MINE,
  id: "en-live",
  type: "comment",
  actor: "지우",
  detail: "면이 어디 있는데요 ㅋㅋ",
  day: "Today",
  time: "Just now",
  read: false,
};

const EN: Notif[] = [
  { ...MINE, id: "en1", type: "comment", actor: "하준", detail: "치즈 더 넣으면 완벽할 듯 ㅋㅋ", day: "Today", time: "21:55", read: false },
  { ...MINE, id: "en2", type: "comment", actor: "유나", detail: "불닭은 원래 이렇게 먹는 거 맞아요", day: "Today", time: "21:40", read: false },
  { ...TTEOK, id: "en3", type: "reply", actor: "서연", detail: "저도 그렇게 생각해요!", day: "Today", time: "21:31", read: false },
  { ...MINE, id: "en4", type: "milestone", detail: "20", day: "Today", time: "21:10", read: true },
  { ...MINE, id: "en5", type: "milestone", detail: "10", day: "Yesterday", time: "18:40", read: true },
  { ...MINE, id: "en6", type: "draft", detail: "", day: "Yesterday", time: "12:05", read: true },
  { ...MINE, id: "en7", type: "first", actor: "민지", detail: "", day: "Oct 6", time: "09:12", read: true },
  { ...MINE, id: "en8", type: "quiet", detail: "", day: "Oct 5", time: "20:30", read: true },
];

// ── 한국인 (대댓글만)
const BULDAK = { postId: "1", postTitle: "불닭 까르보나라" };

const KO_INCOMING: Notif = {
  ...BULDAK,
  id: "ko-live",
  type: "reply",
  actor: "Sam 🇨🇦",
  byAuthor: true,
  detail: "고마워요! 다음엔 참치마요 삼김이랑 먹어 볼게요",
  day: "오늘",
  time: "방금",
  read: false,
};

const KO: Notif[] = [
  { ...BULDAK, id: "ko1", type: "reply", detail: "삼김 조합 진짜 인정이요", day: "오늘", time: "21:50", read: false },
  { ...BULDAK, id: "ko2", type: "reply", detail: "저도 그렇게 먹어요 ㅋㅋ", day: "오늘", time: "21:38", read: false },
  { ...TTEOK, id: "ko4", type: "reply", actor: "Mia 🇺🇸", byAuthor: true, detail: "Wow I didn't know that! Thank you", day: "어제", time: "22:04", read: true },
  { ...TTEOK, id: "ko5", type: "reply", detail: "치즈 떡볶이엔 라면사리죠", day: "10월 5일", time: "18:20", read: true },
];

export const DATA: Record<Lang, { incoming: Notif; list: Notif[] }> = {
  en: { incoming: EN_INCOMING, list: EN },
  ko: { incoming: KO_INCOMING, list: KO },
};

/** 같은 날 안에서 이어지는 같은 글·같은 종류의 댓글·대댓글을 묶습니다 (글쓴이 답글은 따로) */
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
    const stackable = (x: Notif) => (x.type === "comment" || x.type === "reply") && !x.byAuthor;
    if (last && stackable(n) && stackable(last[0]) && last[0].type === n.type && last[0].postId === n.postId) last.push(n);
    else day.stacks.push([n]);
  }
  return days;
}
