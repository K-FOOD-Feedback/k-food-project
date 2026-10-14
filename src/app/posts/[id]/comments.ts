"use client";

import { useMemo, useSyncExternalStore } from "react";

/*
  댓글 (서버가 붙기 전까지 목업 + 이 브라우저의 localStorage)
  상세 화면의 댓글 더미와 댓글 전체 화면이 같은 목록을 씁니다.
*/

export const COMMENT_MAX = 20;
export const QUICK_EMOJIS = ["🔥", "👍", "❤️", "🤤", "🥵", "😱"];
const BUBBLE_COLORS = ["#ffe056", "#ffc6ff", "#c8b5ff", "#ccf54b", "#9fe7ff", "#ffae8f", "#7144ff", "#4ae9ff"];

/** #rrggbb → 색상(0~360°)·채도·밝기(0~1) */
function hsl(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}

/**
  두 색이 비슷한지 — 색상 차이 30° 미만, 둘 다 밝은 색, 밝기 차이도 작을 때
  (진한 보라 #7144ff는 같은 계열이어도 연보라 #c8b5ff와 확연히 달라 보여서 다르게 봄)
*/
function similar(a: string, b: string) {
  const x = hsl(a);
  const y = hsl(b);
  const dh = Math.min(Math.abs(x.h - y.h), 360 - Math.abs(x.h - y.h));
  return dh < 30 && x.l > 0.6 && y.l > 0.6 && Math.abs(x.l - y.l) < 0.2;
}

/**
  글쓴이가 아닌 한마디 색이 글쓴이 색(그 글의 카드 색)과 비슷하면 다른 색으로 바꿉니다.
  글쓴이 말풍선만 카드 색으로 눈에 띄도록 (지현 요청).
  index: 그 한마디가 목록에서 몇 번째인지 — 바꿀 색을 카드 색과 안 비슷한 색들 중에서 번갈아 골라
  같은 색이 몰리지 않게 합니다 (날아가는 중인 새 한마디도 같은 번호로 미리 같은 색을 고름).
*/
export function avoidColor(color: string, authorColor: string | undefined, index: number) {
  if (!authorColor || !similar(color, authorColor)) return color;
  const allowed = BUBBLE_COLORS.filter((c) => !similar(c, authorColor) && c !== color);
  return allowed.length ? allowed[index % allowed.length] : color;
}

/** 한국인 댓글은 표시 없음, 외국인·작성자 댓글은 국기를 붙입니다.
 *  한마디는 익명 — 이름은 글쓴이만 (뱃지에 "글쓴이 · 닉네임", 송희·지현 합의) */
export type CommentAuthor = { kind: "korean" } | { kind: "foreigner"; flag: string } | { kind: "author"; flag: string; name?: string };

/**
  뱃지 글자: 내 한마디는 "나", 글쓴이는 "글쓴이"(Author), 나머지(익명)는 없음
  한마디에는 닉네임을 보여 주지 않습니다 — 글쓴이도 "글쓴이"만 (지현 결정, 닉네임은 상세 본문 카드에만)
*/
export function whoOf(comment: Comment, t: { me: string; author: string }) {
  if (comment.mine) return t.me;
  return comment.author.kind === "author" ? t.author : null;
}

export type Comment = {
  id: string;
  kind: "text" | "emoji";
  text: string;
  color: string;
  author: CommentAuthor;
  /** 답글이면 원글(한마디) id */
  replyTo?: string;
  /** 내가(이 브라우저에서) 남긴 한마디 — "나" 태그 */
  mine?: boolean;
  /** 고친 적 있는 한마디 — 한마디 레이어에서 "수정됨" 표시 */
  edited?: boolean;
};

const KOREAN: CommentAuthor = { kind: "korean" };

/** 처음부터 달려 있는 댓글 (오래된 순, Figma 상세 화면 기준) */
function seedsFor(postId: string, authorFlag: string, authorName?: string): Comment[] {
  const AUTHOR: CommentAuthor = { kind: "author", flag: authorFlag, ...(authorName && { name: authorName }) };
  const id = (n: number) => `${postId}-seed-${n}`;
  return [
    { id: id(1), kind: "emoji", text: "🔥", color: "#ccf54b", author: KOREAN },
    { id: id(2), kind: "text", text: "보기만해도 맵네요ㅠㅠ", color: "#ffe056", author: KOREAN },
    { id: id(3), kind: "emoji", text: "😵", color: "#7144ff", author: KOREAN },
    { id: id(4), kind: "emoji", text: "🧀", color: "#4ae9ff", author: KOREAN },
    { id: id(5), kind: "text", text: "참치마요 삼김이랑\n같이 먹어보세요", color: "#ffc6ff", author: KOREAN },
    { id: id(6), kind: "emoji", text: "🤤", color: "#ffae8f", author: KOREAN },
    { id: id(7), kind: "text", text: "소시지 칼집 미쳤다", color: "#c8b5ff", author: KOREAN },
    // 답글 예시 (Figma 344:3209): 참치마요 한마디에 답글 2개
    { id: id(8), kind: "text", text: "치즈는 많을수록\n맛있죠!", color: "#ffe056", author: { kind: "foreigner", flag: "🇺🇸" }, replyTo: id(5) },
    { id: id(9), kind: "text", text: "고마워요 다음에\n시도해볼게요!", color: "#ffab8a", author: AUTHOR, replyTo: id(5) },
    { id: id(10), kind: "emoji", text: "❤️", color: "#ffae8f", author: AUTHOR },
  ];
}

/*
  자동 번역 (목업) — 번역 서버가 붙기 전까지 처음부터 달려 있는 한마디만 미리 옮겨 둔 영어·중국어·일본어로 보여 줍니다.
  내가 새로 남긴 한마디는 번역할 수 없어서 쓴 그대로 보입니다.
*/
const SEED_EN: Record<string, string> = {
  "보기만해도 맵네요ㅠㅠ": "Looks so spicy ㅠㅠ",
  "참치마요 삼김이랑\n같이 먹어보세요": "Try it with a tuna mayo rice ball",
  "소시지 칼집 미쳤다": "Those sausage cuts are insane",
  "치즈는 많을수록\n맛있죠!": "The more cheese, the better!",
  "고마워요 다음에\n시도해볼게요!": "Thanks, I'll try it next time!",
};

const SEED_ZH: Record<string, string> = {
  "보기만해도 맵네요ㅠㅠ": "光看着就好辣ㅠㅠ",
  "참치마요 삼김이랑\n같이 먹어보세요": "配金枪鱼蛋黄酱饭团一起吃试试",
  "소시지 칼집 미쳤다": "香肠切花刀太绝了",
  "치즈는 많을수록\n맛있죠!": "芝士越多越好吃！",
  "고마워요 다음에\n시도해볼게요!": "谢谢，下次试试！",
};

const SEED_JA: Record<string, string> = {
  "보기만해도 맵네요ㅠㅠ": "見るだけで辛そうㅠㅠ",
  "참치마요 삼김이랑\n같이 먹어보세요": "ツナマヨおにぎりと一緒に食べてみて",
  "소시지 칼집 미쳤다": "ソーセージの切り込みやばい",
  "치즈는 많을수록\n맛있죠!": "チーズは多いほどおいしい！",
  "고마워요 다음에\n시도해볼게요!": "ありがとう、今度やってみます！",
};

const SEED_BY_LANG = { en: SEED_EN, zh: SEED_ZH, ja: SEED_JA };

/** 한마디를 그 언어로 옮깁니다 (영어·중국어·일본어 — 옮겨 둔 문장이 없으면 그대로). */
export function translateTo(comment: Comment, lang: "en" | "zh" | "ja"): Comment {
  const text = comment.kind === "text" ? SEED_BY_LANG[lang][comment.text] : undefined;
  return text ? { ...comment, text } : comment;
}

const storageKey = (postId: string) => `kfood:comments:${postId}`;
const CHANGE = "kfood:comments-change";
const EMPTY: Comment[] = [];
const cache = new Map<string, { raw: string | null; list: Comment[] }>();

function readAdded(postId: string): Comment[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(storageKey(postId));
  } catch {
    // 저장소를 못 쓰면 목업만 보여 줍니다.
  }
  // 같은 내용이면 같은 배열을 돌려줘야 화면이 계속 다시 그려지지 않습니다.
  const hit = cache.get(postId);
  if (hit && hit.raw === raw) return hit.list;
  let list: Comment[] = EMPTY;
  try {
    list = raw ? (JSON.parse(raw) as Comment[]) : EMPTY;
  } catch {
    list = EMPTY;
  }
  cache.set(postId, { raw, list });
  return list;
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE, onChange);
  };
}

const noopSubscribe = () => () => {};

/** 이 게시글의 댓글 (오래된 순)과 댓글 추가 함수 */
export function useComments(postId: string, authorFlag: string, authorName?: string) {
  const added = useSyncExternalStore(subscribe, () => readAdded(postId), () => EMPTY);
  // 서버에서 그린 첫 화면에는 이 브라우저에 저장된 댓글이 아직 없습니다. 읽어 온 뒤에 true.
  const ready = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const comments = [...seedsFor(postId, authorFlag, authorName), ...added];

  // 앞으로 달 댓글의 색 (보내기 애니메이션이 미리 같은 색으로 날아가도록). ahead: 이미 날아가는 중인 개수
  const nextColor = (ahead = 0) => BUBBLE_COLORS[(added.length + ahead + 9) % BUBBLE_COLORS.length];

  /** 내가 남긴 한마디 목록을 바꿔 저장합니다 (목업 댓글은 바꿀 수 없음). */
  const save = (change: (list: Comment[]) => Comment[]) => {
    try {
      localStorage.setItem(storageKey(postId), JSON.stringify(change(readAdded(postId))));
    } catch {
      // 저장 못 하면 이번에는 바뀌지 않습니다.
    }
    window.dispatchEvent(new Event(CHANGE));
  };

  /** replyTo: 답글이면 원글 id */
  const add = (kind: Comment["kind"], text: string, replyTo?: string) =>
    save((list) => [
      ...list,
      {
        id: `${postId}-${Date.now()}`,
        kind,
        text,
        color: BUBBLE_COLORS[(list.length + 9) % BUBBLE_COLORS.length],
        author: KOREAN, // 지금은 한국인 화면만 있습니다.
        mine: true,
        ...(replyTo && { replyTo }),
      },
    ]);

  /** 내 한마디 고치기 — "수정됨" 표시가 붙습니다. */
  const edit = (id: string, text: string) =>
    save((list) => list.map((c) => (c.id === id ? { ...c, text, edited: true } : c)));

  /** 내 한마디 지우기 (달린 답글은 남고 원글 표시만 사라짐) */
  const remove = (id: string) => save((list) => list.filter((c) => c.id !== id));

  return { comments, addedCount: added.length, add, edit, remove, nextColor, ready };
}

/*
  마이 화면용 (송희) — 이 브라우저에서 내가 남긴 한마디를 모든 글에서 모아 최신 순으로
  한마디 id가 `${postId}-${남긴 시각}`이라 시각도 같이 꺼냅니다.
*/
const STORAGE_PREFIX = storageKey("");

function readAllAddedKey() {
  try {
    return Object.keys(localStorage)
      .filter((k) => k.startsWith(STORAGE_PREFIX))
      .sort()
      .map((k) => `${k}\u0000${localStorage.getItem(k) ?? ""}`)
      .join("\u0001");
  } catch {
    return "";
  }
}

export function useMyComments(): { postId: string; comment: Comment; at: number }[] {
  const key = useSyncExternalStore(subscribe, readAllAddedKey, () => "");
  return useMemo(() => {
    if (!key) return [];
    return key
      .split("\u0001")
      .flatMap((entry) => {
        const [k, raw] = entry.split("\u0000");
        const postId = k.slice(STORAGE_PREFIX.length);
        let list: Comment[] = [];
        try {
          list = raw ? (JSON.parse(raw) as Comment[]) : [];
        } catch {
          list = [];
        }
        return list
          .filter((c) => c.mine)
          .map((c) => ({ postId, comment: c, at: Number(c.id.slice(c.id.lastIndexOf("-") + 1)) || 0 }));
      })
      .sort((a, b) => b.at - a.at);
  }, [key]);
}

