import type { BackFrom } from "@/lib/back";

/*
  외국인 상세인지 — 외국인 화면(메인·마이·알림함·글 올린 뒤)에서 들어왔거나(?from=, src/lib/back.ts), 주소에 ?viewer=en
  (서버 page.tsx에서도 쓰므로 "use client" 파일과 따로 둡니다)
*/
const FOREIGN_FROM: BackFrom[] = ["home-en", "my-en", "notifications-en", "posted"];

export const isForeignFrom = (from: BackFrom | undefined) => !!from && FOREIGN_FROM.includes(from);

/** from 으로는 외국인인지 알 수 없을 때 링크에 ?viewer=en 을 이어 붙임 */
export function withViewer(href: string, on: boolean) {
  return on ? `${href}${href.includes("?") ? "&" : "?"}viewer=en` : href;
}
