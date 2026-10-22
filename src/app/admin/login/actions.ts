"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, ADMIN_COOKIE_MAX_AGE, adminToken, safeNext, sameText } from "../auth";

export type PinState = { error: "wrong" | "locked" | "setup"; left?: number; tries?: number } | undefined;

/*
  비밀번호 확인 — 4자리라 마구 눌러 보기를 막음
  - 틀리면 0.8초 뒤에 답함 · 같은 IP가 5번 틀리면 10분 잠금
  - 기록은 서버 메모리라 서버가 새로 뜨면 초기화됨 (작업용이라 이 정도로) → Google 로그인으로 바꿀 때 없어짐
*/
const MAX_FAILS = 5;
const LOCK_MS = 10 * 60 * 1000;
const fails = new Map<string, { count: number; until: number }>();

export async function checkPin(_prev: PinState, form: FormData): Promise<PinState> {
  const token = adminToken();
  if (!token) return { error: "setup" };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local";
  const now = Date.now();
  const rec = fails.get(ip);
  if (rec && rec.until > now) return { error: "locked", left: Math.ceil((rec.until - now) / 60000) };

  const pin = String(form.get("pin") ?? "");
  const ok = /^\d{4}$/.test(pin) && sameText(pin, process.env.ADMIN_PASSWORD!);
  if (!ok) {
    await new Promise((r) => setTimeout(r, 800));
    // 잠금이 끝난 기록(until > 0)은 처음부터 다시 셈
    const count = (rec && rec.until === 0 ? rec.count : 0) + 1;
    if (count >= MAX_FAILS) {
      fails.set(ip, { count: 0, until: now + LOCK_MS });
      return { error: "locked", left: LOCK_MS / 60000 };
    }
    fails.set(ip, { count, until: 0 });
    return { error: "wrong", tries: MAX_FAILS - count };
  }

  fails.delete(ip);
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  redirect(safeNext(form.get("next")));
}
