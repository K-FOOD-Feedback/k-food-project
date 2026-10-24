/*
  DeepL 번역 (서버에서만 — 키가 브라우저로 나가지 않게)
  .env.local: DEEPL_API_KEY (무료 키는 끝이 ":fx" → api-free 주소). 키가 없거나 실패하면 null → 화면은 원문/목업 번역 그대로
  같은 문장은 서버가 켜져 있는 동안 기억해 두고 다시 묻지 않음 (무료 한도 한 달 50만 자)
  음식 이름은 용어집(glossary.ts)을 DeepL 용어집으로 만들어 같이 씀 — 용어집이 안 되면 용어집 없이 번역
*/
import { GLOSSARY_VERSION, glossaryTsv, scriptOf } from "./glossary";

export type MtLang = "ko" | "en" | "zh" | "zht" | "ja";
type Src = "ko" | "en" | "ja" | "zh";

const TARGET: Record<MtLang, string> = { ko: "KO", en: "EN-US", zh: "ZH-HANS", zht: "ZH-HANT", ja: "JA" };
const BASE: Record<MtLang, Src> = { ko: "ko", en: "en", zh: "zh", zht: "zh", ja: "ja" };
const MEMO_MAX = 5000;
const memo = new Map<string, string>();

const env = () => {
  const key = process.env.DEEPL_API_KEY;
  if (!key) return null;
  const host = process.env.DEEPL_API_URL ?? (key.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com");
  return { host, headers: { Authorization: `DeepL-Auth-Key ${key}`, "Content-Type": "application/json" } };
};

/* ── DeepL 용어집: 언어쌍마다 하나 (이름 kfood-<표 버전>-원문-번역). 서버가 켜질 때 찾아 보고 없으면 만듦 ── */
const glossaries = new Map<string, Promise<string | null>>();
let listed: Promise<{ glossary_id: string; name: string }[]> | null = null;

function glossaryId(source: Src, target: MtLang): Promise<string | null> {
  const name = `kfood-${GLOSSARY_VERSION}-${source}-${target}`;
  if (!glossaries.has(name)) glossaries.set(name, findOrCreate(name, source, target));
  return glossaries.get(name)!;
}

async function findOrCreate(name: string, source: Src, target: MtLang): Promise<string | null> {
  const e = env();
  const entries = glossaryTsv(source, target);
  if (!e || !entries) return null;
  try {
    listed ??= fetch(`${e.host}/v2/glossaries`, { headers: e.headers, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { glossaries: [] }))
      .then((d: { glossaries?: { glossary_id: string; name: string }[] }) => {
        const all = d.glossaries ?? [];
        // 표가 바뀌기 전 용어집은 지움 (무료 계정 용어집 개수 한도)
        for (const g of all) if (g.name.startsWith("kfood-") && !g.name.startsWith(`kfood-${GLOSSARY_VERSION}-`)) void fetch(`${e.host}/v2/glossaries/${g.glossary_id}`, { method: "DELETE", headers: e.headers });
        return all;
      });
    const found = (await listed).find((g) => g.name === name);
    if (found) return found.glossary_id;
    const res = await fetch(`${e.host}/v2/glossaries`, {
      method: "POST",
      headers: e.headers,
      body: JSON.stringify({ name, source_lang: source.toUpperCase(), target_lang: BASE[target].toUpperCase(), entries, entries_format: "tsv" }),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("[translate] 용어집 만들기 실패", name, res.status, await res.text());
      return null;
    }
    return ((await res.json()) as { glossary_id: string }).glossary_id;
  } catch (err) {
    console.error("[translate] 용어집 실패", err);
    return null;
  }
}

/** 여러 줄 글은 줄마다 따로 옮겨 다시 이어 붙임 — 통째로 보내면 DeepL이 줄바꿈 자리를 문장 중간으로 옮겨서 */
export async function translateTexts(texts: string[], target: MtLang): Promise<string[] | null> {
  const lines = texts.map((t) => t.split("\n"));
  const done = await translateLines([...new Set(lines.flat().filter((l) => l.trim()))], target);
  if (!done) return null;
  return lines.map((ls) => ls.map((l) => done.get(l) ?? l).join("\n"));
}

async function translateLines(texts: string[], target: MtLang): Promise<Map<string, string> | null> {
  const e = env();
  if (!e) return null;
  const k = (t: string) => `${target}\u0000${t}`;
  const ask = texts.filter((t) => !memo.has(k(t)) && scriptOf(t) !== null);
  // 원문 언어별로 묶어서 (용어집은 원문 언어가 정해져 있어야 씀)
  const bySource = new Map<Src, string[]>();
  for (const t of ask) {
    const s = scriptOf(t)!;
    if (!bySource.has(s)) bySource.set(s, []);
    bySource.get(s)!.push(t);
  }
  const call = async (source: Src, list: string[]) => {
    const id = source === BASE[target] ? null : await glossaryId(source, target);
    const res = await fetch(`${e.host}/v2/translate`, {
      method: "POST",
      headers: e.headers,
      body: JSON.stringify({ text: list, target_lang: TARGET[target], ...(id && { source_lang: source.toUpperCase(), glossary_id: id }) }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const data: { translations?: { text: string }[] } = await res.json();
    list.forEach((t, i) => {
      const done = data.translations?.[i]?.text;
      if (done === undefined) return;
      if (memo.size >= MEMO_MAX) memo.delete(memo.keys().next().value!);
      memo.set(k(t), done.trim());
    });
  };
  try {
    // DeepL은 한 번에 50개까지
    const jobs = [...bySource].flatMap(([s, list]) => Array.from({ length: Math.ceil(list.length / 50) }, (_, i) => call(s, list.slice(i * 50, i * 50 + 50))));
    await Promise.all(jobs);
  } catch (err) {
    console.error("[translate] 번역 실패", err);
    return null;
  }
  return new Map(texts.map((t) => [t, memo.get(k(t)) ?? t]));
}
