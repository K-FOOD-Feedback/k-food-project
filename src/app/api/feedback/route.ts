import { FEEDBACK_MAX, saveFeedback, type FeedbackLang } from "@/app/admin/feedback/db";

/*
  의견 보내기 (마이 맨 아래 "전하고 싶은 의견이 있나요?" → FeedbackSheet)
  받은 의견을 Supabase public.feedback 표에 쌓음 → 송희·지현은 /admin/feedback 에서 봄 (비밀번호)
  DB 설정(.env.local)이 없으면 서버 로그에만 남기고 성공으로 답함
  개인정보는 받지 않음: 의견 글 + 버전·화면 언어만 (답장이 필요하면 쓰는 사람이 글에 적음)
*/
const LANGS: FeedbackLang[] = ["ko", "en", "zh", "ja"];

export async function POST(request: Request) {
  let data: { text?: unknown; viewer?: unknown; lang?: unknown };
  try {
    data = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  const text = typeof data.text === "string" ? data.text.trim().slice(0, FEEDBACK_MAX) : "";
  if (!text) return Response.json({ ok: false }, { status: 400 });
  const viewer = data.viewer === "foreigner" ? "foreigner" : "korean";
  const lang = LANGS.find((l) => l === data.lang) ?? "en";

  try {
    const saved = await saveFeedback({ text, viewer, lang });
    if (!saved) console.info(`[feedback] (DB 설정 없음 — 로그만) ${viewer} · ${lang}\n${text}`);
    return Response.json({ ok: true, saved });
  } catch (err) {
    console.error("[feedback] 저장 실패", err);
    return Response.json({ ok: false }, { status: 502 });
  }
}
