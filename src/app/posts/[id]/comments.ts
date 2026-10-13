"use client";

import { useMemo, useSyncExternalStore } from "react";

/*
  댓글 (서버가 붙기 전까지 목업 + 이 브라우저의 localStorage)
  상세 화면의 댓글 더미와 댓글 전체 화면이 같은 목록을 씁니다.
*/

export const COMMENT_MAX = 20;
export const QUICK_EMOJIS = ["🔥", "👍", "❤️", "🤤", "🥵", "😱"];
const BUBBLE_COLORS = ["#ffe056", "#ffc6ff", "#c8b5ff", "#ccf54b", "#9fe7ff", "#ffae8f", "#7144ff", "#4ae9ff"];

/** 한국인 댓글은 표시 없음, 외국인·작성자 댓글은 국기를 붙입니다.
 *  한마디는 익명 — 이름은 글쓴이만 (뱃지에 "글쓴이 · 닉네임", 송희·지현 합의) */
export type CommentAuthor = { kind: "korean" } | { kind: "foreigner"; flag: string } | { kind: "author"; flag: string; name?: string };

/** 뱃지 글자: 내 한마디는 "나", 글쓴이는 "글쓴이 · 닉네임", 나머지(익명)는 없음 */
export function whoOf(comment: Comment, t: { me: string; author: string }) {
  if (comment.mine) return t.me;
  if (comment.author.kind !== "author") return null;
  return comment.author.name ? `${t.author} · ${comment.author.name}` : t.author;
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
  자동 번역 (목업) — 번역 서버가 붙기 전까지 처음부터 달려 있는 한마디만 미리 옮겨 둔 영어로 보여 줍니다.
  내가 새로 남긴 한마디는 번역할 수 없어서 쓴 그대로 보입니다.
*/
const SEED_EN: Record<string, string> = {
  "보기만해도 맵네요ㅠㅠ": "Looks so spicy ㅠㅠ",
  "참치마요 삼김이랑\n같이 먹어보세요": "Try it with a tuna mayo rice ball",
  "소시지 칼집 미쳤다": "Those sausage cuts are insane",
  "치즈는 많을수록\n맛있죠!": "The more cheese, the better!",
  "고마워요 다음에\n시도해볼게요!": "Thanks, I'll try it next time!",
};

/** 한마디를 영어로 옮깁니다 (옮겨 둔 문장이 없으면 그대로). */
export function translateToEnglish(comment: Comment): Comment {
  const en = comment.kind === "text" ? SEED_EN[comment.text] : undefined;
  return en ? { ...comment, text: en } : comment;
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

