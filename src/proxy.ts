import { NextResponse, type NextRequest } from "next/server";

/*
  모든 요청 앞에서 도는 두 가지 스위치 (Vercel 환경 변수로 켜고 끔)

  1. 개발용 화면 잠금 — SITE_PASSWORD (송희)
     - 값이 있을 때만 브라우저 기본 로그인 창(아이디 · 비밀번호)을 띄움
     - Vercel에서 이 값을 Preview 환경에만 넣으면 → 출시용(main, toppytippy.com)은 그대로 열리고
       내 컴퓨터(localhost, .env.local 에 안 넣으면)도 그대로
     - 아이디는 아무거나, 비밀번호만 맞으면 통과 · 한 번 통과하면 브라우저가 기억함
     - 잠긴 화면은 검색에 안 잡히게 noindex

  2. 출시 전 "곧 공개" — PRELAUNCH=1 (지현)
     - 값이 있는 배포(출시용 Production = toppytippy.com)에서는 모든 화면을 /coming-soon 으로 바꿔 보여 줌. 주소창은 그대로.
     - /api 는 막지 않음 (매일 도는 /api/keepalive 크론이 계속 돌아야 함) · public 파일(점이 들어간 주소)도 그대로
     - 출시하는 날: Vercel → Settings → Environment Variables 에서 PRELAUNCH 를 지우고 다시 배포
*/
const NOINDEX = "noindex, nofollow";

// 곧 공개로 바꾸지 않는 주소: api · Next 내부 · 곧 공개 화면 자신 · 점이 들어간 파일
const PRELAUNCH_SKIP = /^\/(api|_next|coming-soon)(\/|$)|\.[^/]*$/;

export function proxy(req: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  if (password && !hasPassword(req, password)) {
    return new NextResponse("개발용 화면이에요. 비밀번호를 넣어 주세요.", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="toppytippy dev", charset="UTF-8"', "X-Robots-Tag": NOINDEX },
    });
  }

  const res =
    process.env.PRELAUNCH === "1" && !PRELAUNCH_SKIP.test(req.nextUrl.pathname)
      ? NextResponse.rewrite(new URL("/coming-soon", req.url))
      : NextResponse.next();
  if (password) res.headers.set("X-Robots-Tag", NOINDEX);
  return res;
}

function hasPassword(req: NextRequest, password: string) {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Basic ")) return false;
  try {
    const decoded = atob(auth.slice(6));
    return decoded.slice(decoded.indexOf(":") + 1) === password;
  } catch {
    return false;
  }
}

// 이미지 · 스크립트 같은 정적 파일도 같이 잠그되, Next 내부 최적화 경로는 브라우저가 이미 받은 인증으로 통과
export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
