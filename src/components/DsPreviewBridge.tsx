"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/*
  디자인 시스템 정리 도구(k-food-ds)의 미리보기 연결 (송희)
  - 정리 도구가 이 앱을 iframe으로 띄우고 "바꿀 값"을 CSS로 보내면, 화면에 덮어씌워 바뀐 모습을 보여 줌
  - "찾기": 도구가 클래스 이름을 보내면 그 값이 쓰인 첫 자리로 스크롤하고, 몇 곳 있는지 알려 줌
  - 화면 훑기: 값마다 이 화면에서 몇 곳 보이는지 세어 줌 (도구가 "이 값은 메인 3 · 상세 5"처럼 보여 줌)
  - 영역 표시: 브라우저 개발자 도구처럼 그 값이 쓰인 요소마다 파란 반투명 박스 + 첫 요소에 이름 · 크기 말풍선
  - 코드는 바꾸지 않음. 덮어쓰기는 그 iframe 안에서만, 새로고침하면 사라짐
  - 정리 도구 주소에서 띄웠을 때만 동작 (다른 사이트가 이 앱을 띄워 화면을 바꾸지 못하게)
*/
const ALLOWED = [/^http:\/\/localhost:\d+$/, /^https:\/\/k-food-ds[\w-]*\.vercel\.app$/];

/** 다른 요소에 완전히 가려졌는지 (카드 덱 뒤쪽 카드처럼) — 몇 군데 찍어 봐서 하나라도 자기 것이면 보이는 것 */
function covered(el: Element, r: DOMRect) {
  const overlay = document.getElementById("kfood-ds-overlay");
  if (overlay) overlay.style.display = "none";
  const pts = [
    [r.left + r.width / 2, r.top + r.height / 2],
    [r.left + 3, r.top + 3],
    [r.right - 3, r.bottom - 3],
  ];
  const hidden = pts.every(([x, y]) => {
    if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return false; // 화면 밖은 판단하지 않음
    const hit = document.elementFromPoint(x, y);
    return !!hit && !el.contains(hit) && !hit.contains(el);
  });
  if (overlay) overlay.style.display = "";
  return hidden;
}

/** 그 클래스를 쓰는, 화면에 보이는 요소들 (작업용 상단 토글 · 가려진 요소는 뺌) */
function elementsOf(classes: string[]) {
  return classes
    .flatMap((c) => (c.includes('"') ? [] : [...document.querySelectorAll(`[class~="${c}"]`)]))
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && !el.closest('[aria-label="화면 바꾸기 (작업용)"]') && !covered(el, r);
    });
}

// ── 영역 표시
// ① 바뀐 곳: 정리 결정으로 바뀐 요소마다 박스 + "글자 15px→16px" 설명표 (종류별 색)
// ② 강조: 도구에서 마우스를 올린 값 하나 — 파란 박스 + 이름 · 크기 말풍선
type ChangeItem = { classes: string[]; label: string; kind: string };
const KIND_COLOR: Record<string, string> = { type: "255,153,0", radius: "46,170,90", shadow: "150,90,230", color: "230,60,120" };
let changes: ChangeItem[] = [];
let marked: { classes: string[]; label: string } = { classes: [], label: "" };
let raf = 0;
let lastScan = 0;
let changeEls: { el: Element; labels: string[]; kind: string }[] = [];
let markEls: Element[] = [];
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");

function scan() {
  // 화면이 다시 그려져도 따라가게 0.4초마다 요소를 다시 찾음
  const byEl = new Map<Element, { labels: string[]; kind: string }>();
  for (const c of changes) for (const el of elementsOf(c.classes)) {
    const e = byEl.get(el) ?? { labels: [], kind: c.kind };
    if (!e.labels.includes(c.label)) e.labels.push(c.label);
    byEl.set(el, e);
  }
  changeEls = [...byEl].map(([el, v]) => ({ el, ...v }));
  markEls = elementsOf(marked.classes);
}

function draw() {
  let layer = document.getElementById("kfood-ds-overlay");
  if (!changes.length && !marked.classes.length) {
    layer?.remove();
    return;
  }
  if (!layer) {
    layer = document.createElement("div");
    layer.id = "kfood-ds-overlay";
    layer.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2147483647;font:600 10px/1.25 -apple-system,system-ui,sans-serif";
    document.body.appendChild(layer);
  }
  const html: string[] = [];
  // 설명표끼리 겹치면 뒤에 오는 건 박스만 그림 (같은 설명은 한 번만)
  const tags: { x: number; y: number; w: number }[] = [];
  const placed = (x: number, y: number, w: number) => tags.some((t) => Math.abs(t.y - y) < 14 && x < t.x + t.w && t.x < x + w);
  for (const { el, labels, kind } of changeEls.slice(0, 120)) {
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) continue;
    const c = KIND_COLOR[kind] ?? KIND_COLOR.type;
    html.push(`<div style="position:absolute;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;background:rgba(${c},.18);outline:1.5px solid rgba(${c},.95)"></div>`);
    const text = labels.join(" · ");
    const w = Math.min(148, text.length * 6 + 10);
    const x = Math.max(2, Math.min(r.left, innerWidth - w - 2));
    const y = Math.max(2, r.top - 14);
    if (placed(x, y, w)) continue;
    tags.push({ x, y, w });
    html.push(`<div style="position:absolute;left:${x}px;top:${y}px;max-width:148px;padding:1px 4px;border-radius:3px;background:rgb(${c});color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(text)}</div>`);
  }
  if (markEls.length) {
    for (const el of markEls.slice(0, 60)) {
      const r = el.getBoundingClientRect();
      html.push(`<div style="position:absolute;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;background:rgba(111,168,220,.55);outline:1px solid rgba(70,130,200,.9)"></div>`);
    }
    const r = markEls[0].getBoundingClientRect();
    const below = r.bottom + 64 < innerHeight;
    html.push(
      `<div style="position:absolute;left:${Math.max(6, Math.min(r.left, innerWidth - 236))}px;top:${below ? r.bottom + 8 : Math.max(6, r.top - 58)}px;max-width:230px;padding:8px 10px;border-radius:8px;background:#fff;color:#222;font-size:12px;box-shadow:0 2px 12px rgba(0,0,0,.35)"><span style="color:#881391">${esc(marked.label)}</span> <span style="color:#555;font-weight:500">${Math.round(r.width)} × ${Math.round(r.height)}</span>${markEls.length > 1 ? `<br><span style="color:#777;font-weight:500">이 화면에 ${markEls.length}곳</span>` : ""}</div>`,
    );
  }
  layer.innerHTML = html.join("");
}
function loop(t: number) {
  if (t - lastScan > 400) {
    scan();
    lastScan = t;
  }
  draw();
  raf = changes.length || marked.classes.length ? requestAnimationFrame(loop) : 0;
}
function start() {
  lastScan = 0;
  if (!raf) raf = requestAnimationFrame(loop);
  else scan();
}
function mark(classes: string[], label: string) {
  marked = { classes, label };
  scan();
  start();
  return markEls;
}

export function DsPreviewBridge() {
  const path = usePathname();
  // 화면이 바뀔 때마다 "준비됐어요"를 알려서 도구가 CSS를 다시 보내게 함
  useEffect(() => {
    if (window.top === window.self) return;
    mark([], ""); // 화면이 바뀌면 강조는 지움 (바뀐 곳 표시는 도구가 다시 보내 줌)
    window.parent.postMessage({ type: "kfood-ds-ready", path: location.pathname + location.search }, "*");
  }, [path]);

  useEffect(() => {
    if (window.top === window.self) return;
    const onMsg = (e: MessageEvent) => {
      if (!ALLOWED.some((re) => re.test(e.origin))) return;
      if (e.data?.type === "kfood-ds" && typeof e.data.css === "string") {
        let tag = document.getElementById("kfood-ds-preview");
        if (!tag) {
          tag = document.createElement("style");
          tag.id = "kfood-ds-preview";
          document.head.appendChild(tag);
        }
        tag.textContent = e.data.css;
      }
      if (e.data?.type === "kfood-ds-changes" && Array.isArray(e.data.items)) {
        changes = e.data.items;
        scan();
        start();
      }
      // 화면 훑기 — 값(클래스 묶음)마다 이 화면에서 몇 곳 보이는지 세어 돌려줌 (어느 화면에 쓰였는지 미리 알기)
      if (e.data?.type === "kfood-ds-scan" && Array.isArray(e.data.groups)) {
        const counts = e.data.groups.map((g: string[]) => elementsOf(g).length);
        (e.source as Window | null)?.postMessage({ type: "kfood-ds-scanned", id: e.data.id, counts }, { targetOrigin: e.origin });
      }
      if (e.data?.type === "kfood-ds-highlight" && Array.isArray(e.data.classes)) {
        mark(e.data.classes, String(e.data.label ?? ""));
      }
      if (e.data?.type === "kfood-ds-focus" && Array.isArray(e.data.classes)) {
        const els = mark(e.data.classes, String(e.data.label ?? ""));
        els[0]?.scrollIntoView({ block: "center", behavior: "smooth" });
        (e.source as Window | null)?.postMessage({ type: "kfood-ds-found", id: e.data.id, n: els.length }, { targetOrigin: e.origin });
      }
    };
    window.addEventListener("message", onMsg);
    return () => {
      window.removeEventListener("message", onMsg);
      cancelAnimationFrame(raf);
      raf = 0;
    };
  }, []);
  return null;
}
