"use client";

import { useSyncExternalStore } from "react";

/*
  내 투표 기록 (서버가 붙기 전까지 이 브라우저의 localStorage에만 저장)
  상세 화면에서 투표하면 saveVote를 부르고, 메인 화면은 useVotedIds로 읽습니다.
*/

const PREFIX = "kfood:vote:";
const CHANGE = "kfood:votes-change";

export function saveVote(postId: string, choice: number) {
  try {
    localStorage.setItem(PREFIX + postId, String(choice));
  } catch {
    // 저장소를 못 쓰는 환경(시크릿 모드 등)에서는 기록하지 않습니다.
  }
  window.dispatchEvent(new Event(CHANGE));
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE, onChange);
  };
}

// 스냅샷은 문자열로 돌려줘야 매번 같은 값으로 비교됩니다.
function readVotedKey() {
  try {
    return Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .map((k) => k.slice(PREFIX.length))
      .sort()
      .join(",");
  } catch {
    return "";
  }
}

/** 내가 투표한 게시글 id 목록 */
export function useVotedIds(): Set<string> {
  const key = useSyncExternalStore(subscribe, readVotedKey, () => "");
  return new Set(key ? key.split(",") : []);
}

export function clearVote(postId: string) {
  try {
    localStorage.removeItem(PREFIX + postId);
  } catch {
    // 저장소를 못 쓰는 환경에서는 할 일이 없습니다.
  }
  window.dispatchEvent(new Event(CHANGE));
}

function readVote(postId: string) {
  try {
    return localStorage.getItem(PREFIX + postId);
  } catch {
    return null;
  }
}

/** 이 게시글에서 내가 고른 선택지 번호 (투표 전이면 null) */
export function useMyVote(postId: string): number | null {
  const raw = useSyncExternalStore(subscribe, () => readVote(postId), () => null);
  return raw === null ? null : Number(raw);
}
