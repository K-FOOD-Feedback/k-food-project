"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/*
  디자인 시스템 정리 도구(k-food-ds)의 미리보기 연결 (송희)
  - 정리 도구가 이 앱을 iframe으로 띄우고 "바꿀 값"을 CSS로 보내면, 화면에 덮어씌워 바뀐 모습을 보여 줌
  - 코드는 바꾸지 않음. 덮어쓰기는 그 iframe 안에서만, 새로고침하면 사라짐
  - 정리 도구 주소에서 띄웠을 때만 동작 (다른 사이트가 이 앱을 띄워 화면을 바꾸지 못하게)
*/
const ALLOWED = [/^http:\/\/localhost:\d+$/, /^https:\/\/k-food-ds[\w-]*\.vercel\.app$/];

export function DsPreviewBridge() {
  const path = usePathname();
  // 화면이 바뀔 때마다 "준비됐어요"를 알려서 도구가 CSS를 다시 보내게 함
  useEffect(() => {
    if (window.top === window.self) return;
    window.parent.postMessage({ type: "kfood-ds-ready" }, "*");
  }, [path]);

  useEffect(() => {
    if (window.top === window.self) return;
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type !== "kfood-ds" || typeof e.data.css !== "string") return;
      if (!ALLOWED.some((re) => re.test(e.origin))) return;
      let tag = document.getElementById("kfood-ds-preview");
      if (!tag) {
        tag = document.createElement("style");
        tag.id = "kfood-ds-preview";
        document.head.appendChild(tag);
      }
      tag.textContent = e.data.css;
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);
  return null;
}
