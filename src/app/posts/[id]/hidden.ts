"use client";

import { useSyncExternalStore } from "react";

/*
  내가 신고해서 가린 한마디 (서버가 붙기 전까지 이 브라우저의 localStorage에만 저장)
  신고한 사람의 화면에서만 더미·답글 레이어 모두에서 빠집니다.
*/

const storageKey = (postId: string) => `kfood:hidden-comments:${postId}`;
const CHANGE = "kfood:hidden-comments-change";
const EMPTY = new Set<string>();
const cache = new Map<string, { raw: string | null; set: Set<string> }>();

function read(postId: string): Set<string> {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(storageKey(postId));
  } catch {
    // 저장소를 못 쓰면 가린 한마디 없음
  }
  // 같은 내용이면 같은 Set을 돌려줘야 화면이 계속 다시 그려지지 않습니다.
  const hit = cache.get(postId);
  if (hit && hit.raw === raw) return hit.set;
  let set = EMPTY;
  try {
    set = raw ? new Set(JSON.parse(raw) as string[]) : EMPTY;
  } catch {
    set = EMPTY;
  }
  cache.set(postId, { raw, set });
  return set;
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE, onChange);
  };
}

export function useHiddenComments(postId: string) {
  const hidden = useSyncExternalStore(subscribe, () => read(postId), () => EMPTY);

  const hide = (id: string) => {
    try {
      localStorage.setItem(storageKey(postId), JSON.stringify([...read(postId), id]));
    } catch {
      // 저장 못 하면 이번에는 가려지지 않습니다.
    }
    window.dispatchEvent(new Event(CHANGE));
  };

  return { hidden, hide };
}
