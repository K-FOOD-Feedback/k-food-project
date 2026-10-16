/*
  의견 저장소 — Supabase K-food 프로젝트의 public.feedback 표 (서버에서만 씀 — 클라이언트 컴포넌트에서 import 금지, 라이브러리 없이 REST 호출)
  - 쓰기: 공개 키(publishable)로 "추가"만 가능 (RLS: anon insert만 허용, 읽기 정책 없음)
  - 읽기: 공개 키로는 못 읽음. admin_list_feedback(secret) 함수에 FEEDBACK_DB_SECRET을 줘야만 목록을 돌려줌
    (DB에는 비밀값의 sha256만 private.admin_secret에 저장)
  .env.local: NEXT_PUBLIC_SUPABASE_URL · NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY · FEEDBACK_DB_SECRET
*/
export type FeedbackViewer = "korean" | "foreigner";
export type FeedbackLang = "ko" | "en" | "zh" | "ja";
/** 보낸 사람 (로그인 정보) — author_name: Google 실제 이름 · nickname: 서비스 닉네임 · country: 나라 ISO 코드(한국인 KR) */
export type FeedbackAuthor = { author_name: string | null; nickname: string | null; country: string | null };
export type FeedbackRow = FeedbackAuthor & {
  id: number;
  created_at: string;
  text: string;
  viewer: FeedbackViewer;
  lang: FeedbackLang;
  /** 한국어 번역 (외국인 의견 — 번역 API가 붙기 전엔 비어 있을 수 있음) */
  text_ko: string | null;
};

export const FEEDBACK_MAX = 1000;

function env() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
}

const headers = (key: string) => ({ apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" });

/** 의견 한 줄 추가 — DB 설정이 없으면 false */
export async function saveFeedback(
  row: FeedbackAuthor & { text: string; viewer: FeedbackViewer; lang: FeedbackLang; text_ko: string | null },
) {
  const e = env();
  if (!e) return false;
  const res = await fetch(`${e.url}/rest/v1/feedback`, {
    method: "POST",
    headers: { ...headers(e.key), Prefer: "return=minimal" },
    body: JSON.stringify(row),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`feedback insert ${res.status}: ${await res.text()}`);
  return true;
}

/** 최근 의견 (최신 순, 최대 500개) — 관리 페이지 전용 */
export async function listFeedback(): Promise<FeedbackRow[]> {
  const e = env();
  const secret = process.env.FEEDBACK_DB_SECRET;
  if (!e || !secret) throw new Error("의견 DB 설정이 없어요 (.env.local)");
  const res = await fetch(`${e.url}/rest/v1/rpc/admin_list_feedback`, {
    method: "POST",
    headers: headers(e.key),
    body: JSON.stringify({ secret }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`feedback list ${res.status}: ${await res.text()}`);
  return res.json();
}

/**
  DB 깨우기 — Supabase 무료 플랜은 7일 동안 DB를 안 쓰면 프로젝트를 멈춤. 하루 한 번 아주 작은 조회를 보내 멈추지 않게 함
  (Vercel Cron → /api/keepalive, vercel.json). 공개 키로는 의견을 못 읽어서 빈 목록이 오지만, DB에는 실제로 조회가 들어감
*/
export async function pingDb() {
  const e = env();
  if (!e) return false;
  const res = await fetch(`${e.url}/rest/v1/feedback?select=id&limit=1`, { headers: headers(e.key), cache: "no-store" });
  return res.ok;
}
