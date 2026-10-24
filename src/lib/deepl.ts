/*
  DeepL 번역 (서버에서만 — 키가 브라우저로 나가지 않게)
  .env.local: DEEPL_API_KEY (무료 키는 끝이 ":fx" → api-free 주소). 키가 없거나 실패하면 null → 화면은 원문/목업 번역 그대로
  같은 문장은 서버가 켜져 있는 동안 기억해 두고 다시 묻지 않음 (무료 한도 한 달 50만 자)
*/
import { protect, unprotect } from "./glossary";

export type MtLang = "ko" | "en" | "zh" | "zht" | "ja";

const TARGET: Record<MtLang, string> = { ko: "KO", en: "EN-US", zh: "ZH-HANS", zht: "ZH-HANT", ja: "JA" };
const MEMO_MAX = 5000;
const memo = new Map<string, string>();

/** 여러 줄 글은 줄마다 따로 옮겨 다시 이어 붙임 — 통째로 보내면 DeepL이 줄바꿈 자리를 문장 중간으로 옮겨서 */
export async function translateTexts(texts: string[], target: MtLang): Promise<string[] | null> {
  const lines = texts.map((t) => t.split("\n"));
  const done = await translateLines([...new Set(lines.flat().filter((l) => l.trim()))], target);
  if (!done) return null;
  const map = new Map(done);
  return lines.map((ls) => ls.map((l) => map.get(l) ?? l).join("\n"));
}

async function translateLines(texts: string[], target: MtLang): Promise<[string, string][] | null> {
  const key = process.env.DEEPL_API_KEY;
  if (!key) return null;
  if (!texts.length) return [];
  const out: (string | undefined)[] = texts.map((t) => memo.get(`${target}\u0000${t}`));
  const ask = [...new Set(texts.filter((_, i) => out[i] === undefined))];
  if (ask.length) {
    const host = process.env.DEEPL_API_URL ?? (key.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com");
    // 용어집(glossary.ts)의 음식 이름이 든 글은 XML로 — 이름은 <x>로 감싸 번역하지 않음
    const prepared = ask.map((t) => protect(t, target));
    const groups = [ask.filter((_, i) => prepared[i] === null), ask.filter((_, i) => prepared[i] !== null)];
    const call = async (texts: string[], tagged: boolean) => {
      const res = await fetch(`${host}/v2/translate`, {
        method: "POST",
        headers: { Authorization: `DeepL-Auth-Key ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          text: tagged ? texts.map((t) => protect(t, target)) : texts,
          target_lang: TARGET[target],
          ...(tagged && { tag_handling: "xml", ignore_tags: ["x"] }),
        }),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      const data: { translations?: { text: string }[] } = await res.json();
      texts.forEach((t, i) => {
        const done = data.translations?.[i]?.text;
        if (done === undefined) return;
        if (memo.size >= MEMO_MAX) memo.delete(memo.keys().next().value!);
        memo.set(`${target}\u0000${t}`, tagged ? unprotect(done) : done);
      });
    };
    try {
      // DeepL은 한 번에 50개까지
      const chunks = groups.flatMap((g, i) => Array.from({ length: Math.ceil(g.length / 50) }, (_, k) => [g.slice(k * 50, k * 50 + 50), i === 1] as const));
      await Promise.all(chunks.map(([g, tagged]) => call(g, tagged)));
    } catch (err) {
      console.error("[translate] 번역 실패", err);
      return null;
    }
  }
  return texts.map((t, i) => [t, (out[i] ?? memo.get(`${target}\u0000${t}`) ?? t).trim()]);
}
