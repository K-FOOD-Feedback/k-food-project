"use server";

import { cookies } from "next/headers";
import { ADMIN_COOKIE, ADMIN_COOKIE_MAX_AGE, adminToken, passwordMatches } from "./auth";

/** 비밀번호 확인 → 맞으면 쿠키 남김 (페이지가 다시 그려지며 목록이 보임) */
export async function login(_prev: { error: boolean }, form: FormData) {
  const token = adminToken();
  if (!token || !passwordMatches(String(form.get("password") ?? ""))) return { error: true };
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  return { error: false };
}

export async function logout() {
  (await cookies()).delete({ name: ADMIN_COOKIE, path: "/admin" });
}
