import type { MtLang } from "./deepl";

/*
  자동 번역 용어집 — 음식 이름은 번역기가 마음대로 옮기지 않게 언어별로 고정 (송희)
  글·한마디에 아래 이름(어느 언어로 쓰였든)이 나오면 번역할 언어의 이름으로 바꿔 넣고, 그 부분은 DeepL이 건드리지 않음
  예) "ブルダック" → 영어 화면 "Buldak" (전엔 "buddak"), 한국어 화면 "불닭" (전엔 "불닭볶음밥")
  추가할 땐 한 줄: 각 언어 이름 + also(그 음식을 가리키는 다른 표기 — 영어 철자 차이 등)
  긴 이름이 먼저 맞춰짐 (김치찌개가 김치보다 먼저)
  한국어 이름이 다른 말 속에 들어가는 건 넣지 않기 (예: 라면 → "먹으라면"에도 걸림)
*/
export type Term = Record<MtLang, string> & { also?: string[] };

export const GLOSSARY: Term[] = [
  { ko: "불닭", en: "Buldak", ja: "ブルダック", zh: "火鸡面", zht: "火雞麵", also: ["Buldak", "Buldak ramen"] },
  { ko: "떡볶이", en: "Tteokbokki", ja: "トッポッキ", zh: "炒年糕", zht: "辣炒年糕", also: ["Topokki", "Ddukbokki", "トッポギ"] },
  { ko: "김밥", en: "Kimbap", ja: "キンパ", zh: "紫菜包饭", zht: "韓式飯捲", also: ["Gimbap", "キムパ"] },
  { ko: "김치찌개", en: "Kimchi jjigae", ja: "キムチチゲ", zh: "泡菜汤", zht: "泡菜湯", also: ["Kimchi stew", "Kimchi-jjigae"] },
  { ko: "순두부찌개", en: "Sundubu jjigae", ja: "スンドゥブチゲ", zh: "嫩豆腐汤", zht: "嫩豆腐湯", also: ["Sundubu-jjigae", "Soft tofu stew"] },
  { ko: "김치", en: "Kimchi", ja: "キムチ", zh: "泡菜", zht: "泡菜" },
  { ko: "비빔밥", en: "Bibimbap", ja: "ビビンバ", zh: "拌饭", zht: "拌飯", also: ["ビビンパ"] },
  { ko: "불고기", en: "Bulgogi", ja: "プルコギ", zh: "韩式烤肉", zht: "韓式烤肉" },
  { ko: "삼겹살", en: "Samgyeopsal", ja: "サムギョプサル", zh: "五花肉", zht: "五花肉", also: ["Samgyupsal"] },
  { ko: "잡채", en: "Japchae", ja: "チャプチェ", zh: "杂菜", zht: "雜菜" },
  { ko: "호떡", en: "Hotteok", ja: "ホットク", zh: "糖饼", zht: "糖餅", also: ["Hoddeok"] },
];

// 맞춰 볼 표기 → 용어 (긴 표기부터). 영어는 대소문자 무시 · 단어 단위
const ENTRIES = GLOSSARY.flatMap((t) => [...new Set([t.ko, t.en, t.ja, t.zh, t.zht, ...(t.also ?? [])])].map((name) => ({ name, t })))
  .sort((a, b) => b.name.length - a.name.length);
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const PATTERN = new RegExp(ENTRIES.map(({ name }) => (/^[A-Za-z]/.test(name) ? `\\b${esc(name)}\\b` : esc(name))).join("|"), "gi");

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** 용어가 있으면 DeepL에 보낼 XML(용어는 <x>로 감싸 번역 안 함 · 줄바꿈은 <br/>)로, 없으면 null */
export function protect(text: string, target: MtLang): string | null {
  let hit = false;
  const out = xml(text).replace(PATTERN, (m) => {
    const e = ENTRIES.find(({ name }) => name.toLowerCase() === m.toLowerCase());
    if (!e) return m;
    hit = true;
    return `<x>${xml(e.t[target])}</x>`;
  });
  return hit ? out.replace(/\n/g, "<br/>") : null;
}

/** DeepL이 돌려준 XML을 다시 글로 */
export function unprotect(text: string): string {
  return text
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<\/?x>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}
