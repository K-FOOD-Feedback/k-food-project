import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/*
  어드민 잠금 (서버에서만 씀 — 클라이언트 컴포넌트에서 import 금지)
  - 숫자 4자리 비밀번호 ADMIN_PASSWORD (.env.local · Vercel 환경 변수) 를 맞히면 httpOnly 쿠키를 30일 줌
  - 쿠키 값 = HMAC(FEEDBACK_DB_SECRET, "admin:" + PIN) → 서버 비밀값을 모르면 만들 수 없고, PIN을 바꾸면 기존 쿠키는 전부 풀림
  - 어드민 화면(page.tsx)은 맨 처음에 requireAdmin() 을 부름 → 쿠키 없으면 /admin/login 으로
  - 나중에 실제 Google 로그인이 붙으면 "허용된 이메일만 통과"로 바꿀 예정 (이 파일만 바꾸면 됨)
*/
export const ADMIN_COOKIE = "kfood_admin";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/** 비밀번호 설정이 다 돼 있으면 쿠키에 넣을 값, 아니면 null (설정 없으면 아무도 못 들어옴) */
export function adminToken(): string | null {
  const pin = process.env.ADMIN_PASSWORD;
  const secret = process.env.FEEDBACK_DB_SECRET;
  if (!pin || !/^\d{4}$/.test(pin) || !secret) return null;
  return createHmac("sha256", secret).update(`admin:${pin}`).digest("hex");
}

export function sameText(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function isAdmin() {
  const token = adminToken();
  const got = (await cookies()).get(ADMIN_COOKIE)?.value;
  return !!token && !!got && sameText(got, token);
}

/** 어드민 화면 맨 위에서 부름 — 로그인 안 했으면 비밀번호 화면으로 (끝나면 next 로 돌아옴) */
export async function requireAdmin(next: string) {
  if (!(await isAdmin())) redirect(`/admin/login?next=${encodeURIComponent(next)}`);
}

/** 로그인 뒤 돌아갈 곳 — 어드민 안의 주소만 (다른 사이트로 튕기지 않게) */
export function safeNext(next: unknown) {
  return typeof next === "string" && /^\/admin(\/|\?|$)/.test(next) && !next.startsWith("/admin/login")
    ? next
    : "/admin/feedback";
}
