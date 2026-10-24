import { translateWithClaude } from "@/lib/claude-translate";
import { translateTexts, type MtLang } from "@/lib/deepl";

/*
  자동 번역 — 화면(src/lib/translate.ts)이 모아서 보낸 글을 Claude(Haiku)로 옮겨 돌려줌, 안 되면 DeepL
  { texts: string[], target: "ko" | "en" | "zh" | "zht" | "ja" } → { texts: string[] } (실패하면 503 → 화면은 원문 그대로)
  아무나 무료 한도를 다 쓰지 않게: 다른 사이트에서 부른 요청은 거절, 한 번에 50개 · 6,000자까지
*/
const LANGS: MtLang[] = ["ko", "en", "zh", "zht", "ja"];
const MAX_TEXTS = 50;
const MAX_CHARS = 6000;

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) return Response.json({ ok: false }, { status: 403 });
  let data: { texts?: unknown; target?: unknown };
  try {
    data = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  const target = LANGS.find((l) => l === data.target);
  const texts = Array.isArray(data.texts) ? data.texts.filter((t): t is string => typeof t === "string").slice(0, MAX_TEXTS) : [];
  if (!target || !texts.length || texts.reduce((n, t) => n + t.length, 0) > MAX_CHARS) return Response.json({ ok: false }, { status: 400 });
  const done = (await translateWithClaude(texts, target)) ?? (await translateTexts(texts, target));
  if (!done) return Response.json({ ok: false }, { status: 503 });
  return Response.json({ ok: true, texts: done });
}
