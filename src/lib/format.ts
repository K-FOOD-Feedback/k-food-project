/*
  숫자 줄여 쓰기 — 좁은 자리(카드 스티커·한마디 수 등)에서 자릿수가 늘어도 넘치지 않게 (송희)
  - 한국어: 9,999까지 그대로(쉼표), 1만부터 "1.2만"
  - 영어: 999까지 그대로, 1,000부터 "1.2K", 1,000,000부터 "1.2M"
*/
export function compactCount(n: number, lang: "ko" | "en" = "ko") {
  const one = (v: number) => (v >= 100 ? Math.floor(v) : Math.floor(v * 10) / 10).toString();
  if (lang === "ko") return n < 10_000 ? n.toLocaleString("ko-KR") : `${one(n / 10_000)}만`;
  if (n < 1_000) return String(n);
  return n < 1_000_000 ? `${one(n / 1_000)}K` : `${one(n / 1_000_000)}M`;
}
