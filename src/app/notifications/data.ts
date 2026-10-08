/*
  인앱 알림 임시 데이터 (4. 알림, 담당 송희)
  서버(Supabase) 연결 후: 투표·댓글이 달리는 즉시 notifications 테이블에 쌓고,
  Realtime으로 이 화면에 바로 밀어 넣습니다.
*/

export type NotifType = "vote" | "comment" | "milestone";

export type Notif = {
  id: string;
  type: NotifType;
  /** 같은 날 · 같은 글 · 같은 종류가 이어지면 한 묶음(카드 더미)으로 보여 줍니다 */
  postId: string;
  postTitle: string;
  /** 투표/댓글 남긴 한국인 닉네임 */
  actor?: string;
  /** 투표: 고른 선택지 · 댓글: 댓글 내용 · 기록: 숫자 */
  detail: string;
  day: string;
  time: string;
  read: boolean;
};

export const FILTERS = [
  { id: "all", label: "All" },
  { id: "vote", label: "Votes" },
  { id: "comment", label: "Comments" },
] as const;
export type FilterId = (typeof FILTERS)[number]["id"];

export const matchesFilter = (n: Notif, f: FilterId) =>
  f === "all" || (f === "vote" ? n.type === "vote" || n.type === "milestone" : n.type === f);

const POST = { postId: "mine", postTitle: "Buldak Carbonara with extra cheese" };

/** 화면을 열고 잠시 뒤 "방금 달린" 알림 (실시간 도착 연출용) */
export const INCOMING: Notif = {
  ...POST,
  id: "n-live",
  type: "vote",
  actor: "지우",
  detail: "Korean enough!",
  day: "Today",
  time: "Just now",
  read: false,
};

export const NOTIFS: Notif[] = [
  { ...POST, id: "n1", type: "comment", actor: "하준", detail: "치즈 더 넣으면 완벽할 듯 ㅋㅋ", day: "Today", time: "21:55", read: false },
  { ...POST, id: "n2", type: "vote", actor: "민지", detail: "Korean enough!", day: "Today", time: "21:40", read: false },
  { ...POST, id: "n3", type: "vote", actor: "서연", detail: "Almost there", day: "Today", time: "21:31", read: false },
  { ...POST, id: "n4", type: "vote", actor: "도윤", detail: "Korean enough!", day: "Today", time: "21:12", read: true },
  { ...POST, id: "n5", type: "milestone", detail: "10", day: "Today", time: "20:43", read: true },
  { ...POST, id: "n6", type: "comment", actor: "유나", detail: "불닭은 원래 이렇게 먹는 거 맞아요", day: "Yesterday", time: "20:33", read: true },
  { ...POST, id: "n7", type: "comment", actor: "지호", detail: "Looks better than mine honestly", day: "Yesterday", time: "19:02", read: true },
  { ...POST, id: "n8", type: "vote", actor: "수아", detail: "Not Korean at all", day: "Yesterday", time: "18:47", read: true },
  { ...POST, id: "n9", type: "vote", actor: "은우", detail: "Korean enough!", day: "Oct 5", time: "20:36", read: true },
];

/** 같은 날 안에서 이어지는 같은 글·같은 종류 알림을 묶습니다 */
export function groupByDay(list: Notif[]) {
  const days: { day: string; stacks: Notif[][] }[] = [];
  for (const n of list) {
    let day = days.at(-1);
    if (!day || day.day !== n.day) {
      day = { day: n.day, stacks: [] };
      days.push(day);
    }
    const last = day.stacks.at(-1);
    if (last && last[0].type === n.type && last[0].postId === n.postId && n.type !== "milestone") last.push(n);
    else day.stacks.push([n]);
  }
  return days;
}
