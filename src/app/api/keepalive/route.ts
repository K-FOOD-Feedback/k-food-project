import { pingDb } from "@/app/admin/feedback/db";

/*
  Supabase 깨우기 — Vercel Cron이 하루 한 번 부름 (vercel.json "crons", 매일 03:00 UTC = 한국 낮 12시 무렵)
  무료 플랜은 7일 동안 안 쓰면 프로젝트가 멈춰서, 그 전에 작은 조회를 보내 멈추지 않게 함
  CRON_SECRET(Vercel 환경 변수)을 넣어 두면 Vercel이 보내는 Authorization 헤더가 맞을 때만 동작
*/
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false }, { status: 401 });
  }
  const ok = await pingDb().catch(() => false);
  console.info(`[keepalive] supabase ${ok ? "ok" : "failed"}`);
  return Response.json({ ok }, { status: ok ? 200 : 502 });
}
