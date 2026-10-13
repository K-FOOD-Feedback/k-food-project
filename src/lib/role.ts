/*
  고른 역할 기억 (송희) — 다시 온 사람은 랜딩을 건너뛰고 바로 자기 메인으로
  서버(src/app/page.tsx)에서 바로 보내려고 쿠키에 저장 (서버 붙기 전까지는 이 브라우저만)
  - 랜딩에서 "한국인 / 외국인"을 고르거나, 상단 🌐에서 언어를 바꾸면 저장
  - /?intro 로 열면 기억과 상관없이 랜딩을 보여 줌 (확인용)
*/
export type Role = "ko" | "en";
export const ROLE_COOKIE = "kfood_role";

export function rememberRole(role: Role) {
  document.cookie = `${ROLE_COOKIE}=${role}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}
