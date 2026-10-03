"use client";

import { useSyncExternalStore } from "react";

/*
  댓글 (서버가 붙기 전까지 목업 + 이 브라우저의 localStorage)
  상세 화면의 댓글 더미와 댓글 전체 화면이 같은 목록을 씁니다.
*/

export const COMMENT_MAX = 20;
export const QUICK_EMOJIS = ["🔥", "👍", "❤️", "🤤", "🥵", "😱"];
const BUBBLE_COLORS = ["#ffe056", "#ffc6ff", "#c8b5ff", "#ccf54b", "#9fe7ff", "#ffae8f", "#7144ff", "#4ae9ff"];

/** 한국인 댓글은 표시 없음, 외국인·작성자 댓글은 국기를 붙입니다. */
export type CommentAuthor = { kind: "korean" } | { kind: "foreigner"; flag: string } | { kind: "author"; flag: string };

export type Comment = {
  id: string;
  kind: "text" | "emoji";
  text: string;
  color: string;
  author: CommentAuthor;
};

const KOREAN: CommentAuthor = { kind: "korean" };

/** 처음부터 달려 있는 댓글 (오래된 순, Figma 상세 화면 기준) */
function seedsFor(postId: string, authorFlag: string): Comment[] {
  const id = (n: number) => `${postId}-seed-${n}`;
  return [
    { id: id(1), kind: "emoji", text: "🔥", color: "#ccf54b", author: KOREAN },
    { id: id(2), kind: "text", text: "보기만해도 맵네요ㅠㅠ", color: "#ffe056", author: KOREAN },
    { id: id(3), kind: "emoji", text: "😵", color: "#7144ff", author: KOREAN },
    { id: id(4), kind: "emoji", text: "🧀", color: "#4ae9ff", author: KOREAN },
    { id: id(5), kind: "text", text: "참치마요 삼김이랑\n같이 먹어보세요", color: "#ffc6ff", author: KOREAN },
    { id: id(6), kind: "emoji", text: "🤤", color: "#ffae8f", author: KOREAN },
    { id: id(7), kind: "text", text: "소시지 칼집 미쳤다", color: "#c8b5ff", author: KOREAN },
    { id: id(8), kind: "text", text: "치즈는 많을수록\n맛있죠!", color: "#ffe056", author: { kind: "foreigner", flag: "🇺🇸" } },
    { id: id(9), kind: "text", text: "고마워요 다음에\n시도해볼게요!", color: "#ffab8a", author: { kind: "author", flag: authorFlag } },
  ];
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

/** 이 게시글의 댓글 (오래된 순)과 댓글 추가 함수 */
export function useComments(postId: string, authorFlag: string) {
  const added = useSyncExternalStore(subscribe, () => readAdded(postId), () => EMPTY);
  const comments = [...seedsFor(postId, authorFlag), ...added];

  // 앞으로 달 댓글의 색 (보내기 애니메이션이 미리 같은 색으로 날아가도록). ahead: 이미 날아가는 중인 개수
  const nextColor = (ahead = 0) => BUBBLE_COLORS[(added.length + ahead + 9) % BUBBLE_COLORS.length];

  const add = (kind: Comment["kind"], text: string) => {
    const list = readAdded(postId);
    const comment: Comment = {
      id: `${postId}-${Date.now()}`,
      kind,
      text,
      color: BUBBLE_COLORS[(list.length + 9) % BUBBLE_COLORS.length],
      author: KOREAN, // 지금은 한국인 화면만 있습니다.
    };
    try {
      localStorage.setItem(storageKey(postId), JSON.stringify([...list, comment]));
    } catch {
      // 저장 못 하면 이번에는 추가되지 않습니다.
    }
    window.dispatchEvent(new Event(CHANGE));
  };

  return { comments, addedCount: added.length, add, nextColor };
}
