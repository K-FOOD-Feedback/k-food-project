"use client";

import { useSyncExternalStore } from "react";

/*
  알림함을 열었는지 (🔔 빨간 점용) — 서버 연결 전까지 이 브라우저의 localStorage에만 기록
  서버 연결 후: 마지막으로 연 시각보다 새 알림이 있으면 점을 켭니다.
*/
type Who = "ko" | "en";
const key = (who: Who) => `kfood:notif-seen:${who}`;
const CHANGE = "kfood:notif-seen-change";

export function markNotificationsSeen(who: Who) {
  try {
    localStorage.setItem(key(who), "1");
    window.dispatchEvent(new Event(CHANGE));
  } catch {
    // 저장이 막힌 브라우저 — 점이 남아 있어도 동작에는 문제 없음
  }
}

const subscribe = (fn: () => void) => {
  window.addEventListener(CHANGE, fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener(CHANGE, fn);
    window.removeEventListener("storage", fn);
  };
};

/** 아직 알림함을 안 열었으면 true */
export function useHasNewNotifications(who: Who) {
  return useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key(who)) !== "1";
      } catch {
        return true;
      }
    },
    () => false,
  );
}
