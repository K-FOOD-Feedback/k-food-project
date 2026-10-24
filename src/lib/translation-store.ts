import { createHash } from "node:crypto";
import type { MtLang } from "./deepl";

/*
  번역 저장소 — Supabase public.translations (서버에서만, 라이브러리 없이 REST)
  한 번 번역한 문장은 여기 남겨서, 다음 사람은 Claude를 다시 부르지 않고 바로 받음 (기다림 · 비용 둘 다 줄임)
  - 읽기: 공개 키로 누구나 (공개 글의 번역뿐)
  - 쓰기: save_translations(secret) 함수에 FEEDBACK_DB_SECRET을 줘야만 (아무나 엉뚱한 번역을 끼워 넣지 못하게)
  - 번역 방식(모델 · 프롬프트)을 바꾸면 VERSION을 올림 → 예전 번역은 안 쓰고 새로 번역해 쌓음
  DB 설정이 없거나 실패하면 저장소 없이 그냥 번역 (화면엔 영향 없음)
*/
const VERSION = "claude-haiku-5-5:1";

function env() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
}
const headers = (key: string) => ({ apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" });
const keyOf = (text: string, target: MtLang) => createHash("sha256").update(`${VERSION}\u0000${target}\u0000${text}`).digest("hex");

/** 저장된 번역 (원문 → 번역) */
export async function readStored(texts: string[], target: MtLang): Promise<Map<string, string>> {
  const e = env();
  const found = new Map<string, string>();
  if (!e || !texts.length) return found;
  const byKey = new Map(texts.map((t) => [keyOf(t, target), t]));
  try {
    const res = await fetch(`${e.url}/rest/v1/translations?select=key,translated&key=in.(${[...byKey.keys()].join(",")})`, {
      headers: headers(e.key),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    for (const row of (await res.json()) as { key: string; translated: string }[]) {
      const t = byKey.get(row.key);
      if (t !== undefined) found.set(t, row.translated);
    }
  } catch (err) {
    console.error("[translate] 저장된 번역 읽기 실패", err);
  }
  return found;
}

/** 새 번역 저장 (실패해도 번역은 그대로 돌려줌) */
export async function saveStored(pairs: [string, string][], target: MtLang) {
  const e = env();
  const secret = process.env.FEEDBACK_DB_SECRET;
  if (!e || !secret || !pairs.length) return;
  try {
    const items = pairs
      .filter(([s, t]) => s.length <= 2000 && t.length <= 4000)
      .map(([source, translated]) => ({ key: keyOf(source, target), target, source, translated }));
    const res = await fetch(`${e.url}/rest/v1/rpc/save_translations`, {
      method: "POST",
      headers: headers(e.key),
      body: JSON.stringify({ secret, items }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  } catch (err) {
    console.error("[translate] 번역 저장 실패", err);
  }
}
