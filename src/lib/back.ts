/*
  화면 안 "뒤로(←)" 버튼의 목적지
  상세·한마디·글쓰기는 여러 곳에서 들어오므로, 들어온 곳을 주소의 ?from= 으로 들고 다닙니다.
  그 값이 있으면 그곳으로, 없으면 화면 원래의 뒤로 목적지(보통 메인)로 갑니다.

  | from               | 들어온 곳                     | ← 목적지
  | notifications      | 한국인 알림                   | /notifications
  | notifications-en   | 외국인 알림                   | /notifications/en
  | my                 | 한국인 마이 (투표·한마디 탭)  | /my
  | my-en              | 외국인 마이 (Posts·Comments) | /my/en
  | home-en            | 외국인 메인 카드              | /home?lang=en
  | posted             | 글 올린 뒤 완료 → See my post | /home?lang=en (완료 화면은 이미 끝남)

  이어 가기: 상세에서 다음 글로 넘기거나, 상세 → 한마디 → 상세, 상세 → 수정 → 상세로 가도
  from 을 그대로 붙여서(withFrom) 처음 들어온 곳으로 돌아가게 합니다.
  (상세에서 들어간 한마디의 ← 는 상세 — 한마디 화면은 ?via=detail 이면 상세로, 그 상세에 from 을 붙여서)
*/
const FROM_BACK = {
  notifications: "/notifications",
  "notifications-en": "/notifications/en",
  my: "/my",
  "my-en": "/my/en",
  "home-en": "/home?lang=en",
  posted: "/home?lang=en",
} as const;

export type BackFrom = keyof typeof FROM_BACK;

/** 주소에서 읽은 from 값 중 아는 것만 (모르는 값은 버림) */
export function fromKey(from: string | string[] | null | undefined): BackFrom | undefined {
  const key = Array.isArray(from) ? from[0] : from;
  return key && key in FROM_BACK ? (key as BackFrom) : undefined;
}

export function backHrefFrom(from: string | string[] | null | undefined, fallback: string) {
  const key = fromKey(from);
  return key ? FROM_BACK[key] : fallback;
}

/** 링크에 from 을 이어 붙임 (값이 없거나 모르는 값이면 그대로) — 예: withFrom("/posts/3", "my") → "/posts/3?from=my" */
export function withFrom(href: string, from: string | string[] | null | undefined) {
  const key = fromKey(from);
  if (!key) return href;
  return `${href}${href.includes("?") ? "&" : "?"}from=${key}`;
}

/** 지금 주소의 from (클라이언트에서 버튼을 누를 때 읽기용) */
export function currentFrom() {
  if (typeof window === "undefined") return undefined;
  return fromKey(new URLSearchParams(window.location.search).get("from"));
}
