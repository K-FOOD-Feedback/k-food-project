import { createHash } from "node:crypto";
import { cookies } from "next/headers";

/*
  관리 페이지 잠금 — ADMIN_PASSWORD(.env.local)를 맞히면 쿠키를 남겨 다음부터는 바로 열림 (60일)
  쿠키 값은 비밀번호 그대로가 아니라 sha256(비밀번호 : FEEDBACK_DB_SECRET) — 쿠키만 보고 비밀번호를 알 수 없고,
  비밀번호나 비밀값을 바꾸면 기존 쿠키는 저절로 무효
*/
export const ADMIN_COOKIE = "kfood_admin";
export const ADMIN_COOKIE_MAX_AGE = 60 * 24 * 60 * 60;

export function adminToken(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.FEEDBACK_DB_SECRET;
  if (!password || !secret) return null;
  return createHash("sha256").update(`${password}:${secret}`).digest("hex");
}

export function passwordMatches(input: string) {
  const password = process.env.ADMIN_PASSWORD;
  return !!password && input === password;
}

export async function isAdmin() {
  const token = adminToken();
  if (!token) return false;
  return (await cookies()).get(ADMIN_COOKIE)?.value === token;
}
