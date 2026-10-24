import Anthropic from "@anthropic-ai/sdk";
import type { MtLang } from "./deepl";
import { GLOSSARY } from "./glossary";

/*
  자동 번역 (Claude Haiku) — DeepL보다 문맥·말투·음식 이름을 자연스럽게 옮겨서 먼저 씀 (송희, 2026-10-25)
  .env.local: ANTHROPIC_API_KEY. 키가 없거나 실패·거절이면 null → route.ts가 DeepL로 다시 시도
  음식 이름은 용어집(glossary.ts)을 프롬프트에 넣어 고정. 같은 문장은 서버가 켜져 있는 동안 기억
  비용: 글 한 개를 4개 언어로 옮겨도 1원 안팎 (Haiku 5.5 입력 $0.10 · 출력 $0.50 / 100만 토큰)
*/
const MODEL = "claude-haiku-5-5";
const LANG_NAME: Record<MtLang, string> = {
  ko: "Korean",
  en: "English",
  zh: "Simplified Chinese",
  zht: "Traditional Chinese (Taiwan)",
  ja: "Japanese",
};

const SYSTEM = `You translate short posts and comments on Toppy Tippy, a community where people abroad share Korean food they cooked and Koreans vote and comment on it.

- Translate each item into the target language the way a native speaker would write it on a casual food community. Keep the tone (casual, polite, playful), emoji, and the feeling of internet expressions like ㅋㅋ or ㅠㅠ.
- Keep line breaks exactly: same number of lines, each line translated in place.
- Write food names with the fixed names in the glossary below, keeping modifiers in natural word order (e.g. "チーズブルダック" → English "cheese Buldak", Korean "치즈 불닭").
- If an item is already in the target language, return it unchanged.
- Return only the translations, in the same order and count as the input. No notes, quotes, or explanations.

Glossary (Korean | English | Japanese | Simplified Chinese | Traditional Chinese):
${GLOSSARY.map((t) => [t.ko, t.en, t.ja, t.zh, t.zht].join(" | ")).join("\n")}`;

const SCHEMA = {
  type: "object",
  properties: { translations: { type: "array", items: { type: "string" } } },
  required: ["translations"],
  additionalProperties: false,
};

const MEMO_MAX = 5000;
const memo = new Map<string, string>();
let client: Anthropic | null = null;

export async function translateWithClaude(texts: string[], target: MtLang): Promise<string[] | null> {
  if (!process.env.ANTHROPIC_API_KEY || !texts.length) return null;
  client ??= new Anthropic();
  const k = (t: string) => `${target}\u0000${t}`;
  const ask = [...new Set(texts.filter((t) => !memo.has(k(t))))];
  if (ask.length) {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 8000,
        // 번역은 생각할 거리가 적어서 생각 없이 · 가장 낮은 노력으로 (토큰 아끼기)
        thinking: { type: "disabled" },
        output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
        system: SYSTEM,
        messages: [{ role: "user", content: `Target language: ${LANG_NAME[target]}\nItems:\n${JSON.stringify(ask)}` }],
      });
      if (response.stop_reason !== "end_turn") {
        console.error("[translate] Claude 번역 중단", response.stop_reason);
        return null;
      }
      const text = response.content.find((b) => b.type === "text")?.text ?? "";
      const done = (JSON.parse(text) as { translations: string[] }).translations;
      if (done.length !== ask.length) {
        console.error("[translate] Claude 번역 개수가 다름", ask.length, done.length);
        return null;
      }
      ask.forEach((t, i) => {
        if (memo.size >= MEMO_MAX) memo.delete(memo.keys().next().value!);
        memo.set(k(t), done[i]);
      });
    } catch (err) {
      console.error("[translate] Claude 번역 실패", err);
      return null;
    }
  }
  return texts.map((t) => memo.get(k(t)) ?? t);
}
