import { FEEDBACK_MAX, saveFeedback, type FeedbackLang } from "@/app/admin/feedback/db";
import { translateToKorean } from "@/app/admin/feedback/translate";

/*
  의견 보내기 (마이 맨 아래 "전하고 싶은 의견이 있나요?" → FeedbackSheet)
  받은 의견을 Supabase public.feedback 표에 쌓음 → 송희·지현은 /admin/feedback 에서 봄
  DB 설정(.env.local)이 없으면 서버 로그에만 남기고 성공으로 답함
  함께 저장: 버전·화면 언어 + 보낸 사람(로그인 정보 — Google 실제 이름 · 서비스 닉네임 · 나라)
  외국인 의견은 DeepL로 한국어 번역(text_ko)도 같이 저장 — 번역이 실패해도 의견은 저장됨
*/
const LANGS: FeedbackLang[] = ["ko", "en", "zh", "ja"];

export async function POST(request: Request) {
  let data: { text?: unknown; viewer?: unknown; lang?: unknown; name?: unknown; nickname?: unknown; country?: unknown };
  try {
    data = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  const text = typeof data.text === "string" ? data.text.trim().slice(0, FEEDBACK_MAX) : "";
  if (!text) return Response.json({ ok: false }, { status: 400 });
  const viewer = data.viewer === "foreigner" ? "foreigner" : "korean";
  const lang = LANGS.find((l) => l === data.lang) ?? "en";
  const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
  const country = typeof data.country === "string" && /^[A-Z]{2}$/.test(data.country) ? data.country : null;
  const author = { author_name: str(data.name, 80), nickname: str(data.nickname, 40), country };

  try {
    const text_ko = viewer === "foreigner" ? await translateToKorean(text) : null;
    const saved = await saveFeedback({ text, viewer, lang, text_ko, ...author });
    if (!saved) console.info(`[feedback] (DB 설정 없음 — 로그만) ${viewer} · ${lang}\n${text}`);
    return Response.json({ ok: true, saved });
  } catch (err) {
    console.error("[feedback] 저장 실패", err);
    return Response.json({ ok: false }, { status: 502 });
  }
}
