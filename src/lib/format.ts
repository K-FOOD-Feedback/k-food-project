import type { UiLang } from "@/app/posts/[id]/viewerLang";

/*
  숫자 표시 — 모든 자리에서 이것 하나로 (송희 · UX writing)
  - 9,999까지는 그대로 (쉼표)
  - 1만부터 줄여 씀: 한국어 1.2만 · 중국어·일본어 1.2万 · 영어 12K (영어도 같은 자리에서 줄어들게 1만부터)
  - 1억부터: 1.2억 · 1.2亿(중) · 1.2億(일) · 영어는 100만부터 1.2M
  - 소수점 한 자리, 반올림 X 버림 (99,999 → 9.9만, 10만으로 올라가 보이지 않게). 100 이상이면 소수점 없이 (123만)
*/
const one = (v: number) => (v >= 100 ? Math.floor(v) : Math.floor(v * 10) / 10).toString();

const UNITS: Record<Exclude<UiLang, "en">, [string, string]> = {
  ko: ["만", "억"],
  zh: ["万", "亿"],
  ja: ["万", "億"],
};

export function compactCount(n: number, lang: UiLang = "ko") {
  if (n < 10_000) return n.toLocaleString("en-US");
  if (lang === "en") return n < 1_000_000 ? `${one(n / 1_000)}K` : `${one(n / 1_000_000)}M`;
  const [man, eok] = UNITS[lang];
  return n < 100_000_000 ? `${one(n / 10_000)}${man}` : `${one(n / 100_000_000)}${eok}`;
}
