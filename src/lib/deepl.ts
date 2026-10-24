/*
  DeepL 번역 (서버에서만 — 키가 브라우저로 나가지 않게)
  .env.local: DEEPL_API_KEY (무료 키는 끝이 ":fx" → api-free 주소). 키가 없거나 실패하면 null → 화면은 원문/목업 번역 그대로
  같은 문장은 서버가 켜져 있는 동안 기억해 두고 다시 묻지 않음 (무료 한도 한 달 50만 자)
*/
export type MtLang = "ko" | "en" | "zh" | "zht" | "ja";

const TARGET: Record<MtLang, string> = { ko: "KO", en: "EN-US", zh: "ZH-HANS", zht: "ZH-HANT", ja: "JA" };
const MEMO_MAX = 5000;
const memo = new Map<string, string>();

export async function translateTexts(texts: string[], target: MtLang): Promise<string[] | null> {
  const key = process.env.DEEPL_API_KEY;
  if (!key || !texts.length) return null;
  const out: (string | undefined)[] = texts.map((t) => memo.get(`${target}\u0000${t}`));
  const ask = [...new Set(texts.filter((_, i) => out[i] === undefined))];
  if (ask.length) {
    const host = process.env.DEEPL_API_URL ?? (key.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com");
    try {
      const res = await fetch(`${host}/v2/translate`, {
        method: "POST",
        headers: { Authorization: `DeepL-Auth-Key ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text: ask, target_lang: TARGET[target] }),
        cache: "no-store",
      });
      if (!res.ok) {
        console.error("[translate] 번역 실패", res.status, await res.text());
        return null;
      }
      const data: { translations?: { text: string }[] } = await res.json();
      ask.forEach((t, i) => {
        const done = data.translations?.[i]?.text;
        if (done === undefined) return;
        if (memo.size >= MEMO_MAX) memo.delete(memo.keys().next().value!);
        memo.set(`${target}\u0000${t}`, done);
      });
    } catch (err) {
      console.error("[translate] 번역 실패", err);
      return null;
    }
  }
  return texts.map((t, i) => out[i] ?? memo.get(`${target}\u0000${t}`) ?? t);
}
