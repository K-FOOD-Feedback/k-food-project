import type { MtLang } from "./deepl";

/*
  자동 번역 용어집 — 음식 이름은 번역기가 마음대로 옮기지 않게 언어별로 고정 (송희)
  DeepL 용어집(glossary)으로 만들어 번역에 같이 씀 → 문장 안에서 자연스럽게 들어감 ("チーズブルダック" → "cheese Buldak")
  예) 전엔 "ブルダック" → 영어 "buddak", 한국어 "불닭볶음밥"
  추가할 땐 한 줄: 각 언어 이름 + also(그 음식을 가리키는 다른 표기 — 영어 철자 차이 등). 표가 바뀌면 DeepL 용어집도 알아서 새로 만듦
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

/** 글자로 짐작한 언어 (DeepL 용어집은 원문 언어를 알아야 써짐) — 중국어는 간체·번체 구분 없이 zh */
export function scriptOf(text: string): "ko" | "ja" | "zh" | "en" | null {
  if (/[\uac00-\ud7a3]/.test(text)) return "ko";
  if (/[\u3040-\u30ff]/.test(text)) return "ja";
  if (/[\u4e00-\u9fff]/.test(text)) return "zh";
  if (/[A-Za-z]/.test(text)) return "en";
  return null;
}

/** 원문 언어 → 번역 언어 용어집 (DeepL TSV: "원문\t번역" 한 줄씩) */
export function glossaryTsv(source: "ko" | "ja" | "zh" | "en", target: MtLang): string {
  const rows = new Map<string, string>();
  for (const t of GLOSSARY) {
    const names = [t.ko, t.en, t.ja, t.zh, t.zht, ...(t.also ?? [])].filter((n) => scriptOf(n) === source);
    for (const n of names) if (n !== t[target] && !rows.has(n)) rows.set(n, t[target]);
  }
  return [...rows].map(([a, b]) => `${a}\t${b}`).join("\n");
}

/** 표가 바뀌었는지 — DeepL 용어집 이름에 붙임 */
export const GLOSSARY_VERSION = [...JSON.stringify(GLOSSARY)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36);
