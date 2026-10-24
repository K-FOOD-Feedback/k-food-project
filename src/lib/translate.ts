/*
  자동 번역 (DeepL) — 글 제목·본문·투표 칸·한마디를 보는 사람 언어로
  - mt(원문, 언어): 번역이 있으면 돌려주고, 없으면 서버(/api/translate)에 물어 두고 undefined → 부른 쪽은 지금 문구(원문·목업 번역)를 그대로 보여 줌
  - 번역이 도착하면 useMt()를 부른 화면이 다시 그려짐 → 그때 mt()가 번역을 돌려줌
  - 언어 창의 자동 번역을 끄면(kfood:auto-translate = "off") 번역하지 않음 → 원문
  - 같은 문장은 이 브라우저에 기억 (localStorage kfood:mt, 최근 800개) — 다시 들어오면 바로 번역으로 보임
  - 서버·첫 화면은 기억한 번역 없이 그림 (화면이 붙은 뒤 불러옴 — 서버 화면과 어긋나지 않게)
  - 서버 화면(page.tsx)에서도 titleIn 등을 부르므로 "use client" 없이 둠 — 훅은 useMt.ts
*/
export type MtLang = "ko" | "en" | "zh" | "zht" | "ja";

// 번역 방식이 바뀌면(용어집 등) 숫자를 올려 예전에 기억한 번역을 버림
const STORE_KEY = "kfood:mt:9";
const STORE_MAX = 800;
// 언어 창(LanguagePicker)의 자동 번역 설정과 같은 키 · 이벤트
const AUTO_KEY = "kfood:auto-translate";
const AUTO_EVENT = "kfood:auto-translate-change";
// 서버 한 번에 보내는 양 (route.ts 한도와 같게)
const BATCH_TEXTS = 50;
const BATCH_CHARS = 6000;

const key = (lang: MtLang, text: string) => `${lang}\u0000${text}`;
let cache: Map<string, string> | null = null; // 화면이 붙기 전엔 null
let version = 0;
const listeners = new Set<() => void>();
const queued = new Map<MtLang, Set<string>>();
const asked = new Set<string>(); // 보냈거나 실패한 문장 — 같은 화면에서 다시 묻지 않음
let timer: ReturnType<typeof setTimeout> | undefined;

function emit() {
  version++;
  listeners.forEach((f) => f());
}

function load() {
  if (cache) return cache;
  cache = new Map();
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) for (const [k, v] of JSON.parse(raw) as [string, string][]) cache.set(k, v);
  } catch {
    // 저장소를 못 쓰면 이번 화면에서만 기억
  }
  return cache;
}

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify([...load()].slice(-STORE_MAX)));
  } catch {
    // 꽉 찼거나 막혔으면 기억하지 않음
  }
}

function autoOn() {
  try {
    return localStorage.getItem(AUTO_KEY) !== "off";
  } catch {
    return true;
  }
}

/** 글자로 짐작한 언어 — 이미 그 언어면 번역하지 않음 (중국어는 간체·번체를 못 가려서 번역에 맡김) */
function scriptOf(text: string): MtLang | "zh*" | null {
  if (/[가-힣]/.test(text)) return "ko";
  if (/[぀-ヿ]/.test(text)) return "ja";
  if (/[一-鿿]/.test(text)) return "zh*";
  if (/[A-Za-z]/.test(text)) return "en";
  return null; // 이모지·숫자만 — 옮길 게 없음
}

async function send(lang: MtLang, texts: string[]) {
  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts, target: lang }),
    });
    if (!res.ok) return;
    const data: { texts?: string[] } = await res.json();
    const c = load();
    texts.forEach((t, i) => {
      const done = data.texts?.[i];
      if (done) c.set(key(lang, t), done);
    });
    save();
    emit();
  } catch {
    // 연결이 안 되면 원문 그대로
  }
}

function flush() {
  timer = undefined;
  const c = load();
  for (const [lang, set] of queued) {
    let batch: string[] = [];
    let chars = 0;
    for (const t of set) {
      if (c.has(key(lang, t))) continue;
      if (batch.length >= BATCH_TEXTS || chars + t.length > BATCH_CHARS) {
        void send(lang, batch);
        batch = [];
        chars = 0;
      }
      batch.push(t);
      chars += t.length;
    }
    if (batch.length) void send(lang, batch);
  }
  queued.clear();
}

/** 원문을 그 언어로 — 번역이 아직 없으면 undefined (그동안 지금 문구를 보여 주세요) */
export function mt(text: string | undefined, lang: MtLang): string | undefined {
  if (!text || typeof window === "undefined" || !cache || !autoOn()) return undefined;
  const s = scriptOf(text);
  if (s === null || s === lang) return text;
  const k = key(lang, text);
  const done = cache.get(k);
  if (done !== undefined) return done;
  if (!asked.has(k) && text.length <= 1000) {
    asked.add(k);
    if (!queued.has(lang)) queued.set(lang, new Set());
    queued.get(lang)!.add(text);
    timer ??= setTimeout(flush, 30);
  }
  return undefined;
}

export function subscribeMt(onChange: () => void) {
  listeners.add(onChange);
  if (listeners.size === 1) window.addEventListener(AUTO_EVENT, emit);
  if (!cache) {
    load();
    queueMicrotask(emit);
  }
  return () => {
    listeners.delete(onChange);
    if (!listeners.size) window.removeEventListener(AUTO_EVENT, emit);
  };
}

export const mtVersion = () => version;
