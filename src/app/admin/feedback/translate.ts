/*
  의견 한국어 번역 — DeepL API Free (서버에서만 씀, 라이브러리 없이 fetch)
  외국인 의견이 들어올 때 한 번 번역해서 feedback.text_ko 에 같이 저장 → 관리 페이지 "자동 번역" 토글에서 보여 줌
  .env.local: DEEPL_API_KEY (무료 키는 끝이 ":fx" → api-free 주소, 유료 키면 api 주소)
  무료 한도(한 달 50만 자)를 넘거나 실패하면 null — 의견 저장은 그대로 되고, 관리 페이지엔 "번역 없음"
*/
export async function translateToKorean(text: string): Promise<string | null> {
  const key = process.env.DEEPL_API_KEY;
  if (!key) return null;
  const host = key.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
  try {
    const res = await fetch(`${host}/v2/translate`, {
      method: "POST",
      headers: { Authorization: `DeepL-Auth-Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text: [text], target_lang: "KO" }),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("[feedback] 번역 실패", res.status, await res.text());
      return null;
    }
    const data: { translations?: { text: string; detected_source_language?: string }[] } = await res.json();
    const t = data.translations?.[0];
    // 원래 한국어로 쓴 글이면 번역 없음
    if (!t || t.detected_source_language === "KO") return null;
    return t.text.slice(0, 2000);
  } catch (err) {
    console.error("[feedback] 번역 실패", err);
    return null;
  }
}
