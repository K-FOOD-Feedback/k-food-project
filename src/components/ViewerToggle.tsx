"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSyncExternalStore } from "react";
import { rememberRole } from "@/lib/role";

/*
  작업용: 한국인 ↔ 외국인 화면 바꾸기 토글 (송희) — 모든 화면 맨 위 가운데에 떠 있음
  - 같은 화면의 다른 쪽 주소로 바로 넘어감 (메인 /home ↔ /home?lang=en, 마이 /my ↔ /my/en, 알림, 상세·한마디는 ?viewer=en 등)
  - 외국인만 쓰는 화면(글쓰기·수정)에서 한국인을 누르면 한국인 메인으로
  - 보이는 때: 개발 서버(localhost)에서는 항상. 배포 주소에서는 아무 주소 뒤에 ?dev=1 을 붙여 한 번 열면 이 브라우저에서 켜지고, ?dev=0 이면 꺼짐
    → 실제 사용자에게는 안 보임. 출시 전에 지워도 됨
*/
type Viewer = "ko" | "en";

const DEV_KEY = "kfood:dev-toggle";
const FOREIGN_FROM: Record<string, string> = { "home-en": "", "my-en": "my", "notifications-en": "notifications", posted: "" };
const KOREAN_FROM: Record<string, string> = { my: "my-en", notifications: "notifications-en" };

/** 지금 화면이 외국인 화면인지 */
function viewerOf(path: string, q: URLSearchParams): Viewer {
  if (/\/en$/.test(path) || q.get("lang") === "en" || q.get("viewer") === "en") return "en";
  if (q.get("from") && q.get("from")! in FOREIGN_FROM) return "en";
  if (path.startsWith("/write") || path.startsWith("/posts/mine") || path.endsWith("/edit")) return "en";
  return "ko";
}

/** 같은 화면의 다른 쪽 주소 */
function hrefFor(target: Viewer, path: string, query: URLSearchParams): string {
  const q = new URLSearchParams(query);
  const en = target === "en";
  if (path === "/") return en ? "/home?lang=en" : "/home";
  if (path === "/home") {
    if (en) q.set("lang", "en");
    else q.delete("lang");
    return withQuery("/home", q);
  }
  for (const base of ["/my", "/notifications"]) {
    if (path === base || path === `${base}/en`) return withQuery(en ? `${base}/en` : base, q);
  }
  // 외국인만 쓰는 화면 → 한국인이면 메인으로
  if (!en && (path.startsWith("/write") || path.startsWith("/posts/mine") || path.endsWith("/edit"))) return "/home";
  if (path.startsWith("/posts/")) {
    const from = q.get("from") ?? "";
    if (en) {
      q.set("viewer", "en");
      if (from in KOREAN_FROM) q.set("from", KOREAN_FROM[from]);
    } else {
      q.delete("viewer");
      q.delete("lang");
      if (from in FOREIGN_FROM) {
        if (FOREIGN_FROM[from]) q.set("from", FOREIGN_FROM[from]);
        else q.delete("from");
      }
    }
    return withQuery(path, q);
  }
  return withQuery(path, q); // 약관 등 — 주소는 그대로 (역할만 기억)
}

function withQuery(path: string, q: URLSearchParams) {
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

const subscribe = () => () => {};
function readEnabled() {
  if (process.env.NODE_ENV === "development") return true;
  try {
    const flag = new URLSearchParams(window.location.search).get("dev");
    if (flag === "1") localStorage.setItem(DEV_KEY, "1");
    if (flag === "0") localStorage.removeItem(DEV_KEY);
    return localStorage.getItem(DEV_KEY) === "1";
  } catch {
    return false;
  }
}

export function ViewerToggle() {
  const router = useRouter();
  const path = usePathname();
  const query = useSearchParams();
  const enabled = useSyncExternalStore(subscribe, readEnabled, () => false);
  if (!enabled) return null;

  const current = viewerOf(path, query);
  const go = (target: Viewer) => {
    if (target === current) return;
    rememberRole(target);
    router.push(hrefFor(target, path, new URLSearchParams(query.toString())));
  };

  return (
    <div
      role="radiogroup"
      aria-label="화면 바꾸기 (작업용)"
      className="fixed top-[calc(env(safe-area-inset-top)+2px)] left-1/2 z-[60] flex -translate-x-1/2 gap-0.5 rounded-full bg-black/70 p-0.5 text-[11px] leading-none font-bold text-white shadow-[0_4px_12px_rgba(0,0,0,0.4)] ring-1 ring-white/15 backdrop-blur-md"
    >
      {(["ko", "en"] as const).map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={current === v}
          onClick={() => go(v)}
          className={`rounded-full px-2.5 py-1.5 transition ${current === v ? "bg-white text-black" : "text-white/70"}`}
        >
          {v === "ko" ? "🇰🇷 한국인" : "🌍 외국인"}
        </button>
      ))}
    </div>
  );
}
