import { NextResponse, type NextRequest } from "next/server";

/*
  개발용 화면 잠금 (dev.toppytippy.com · Vercel 미리보기 주소)
  - 환경 변수 SITE_PASSWORD 가 있을 때만 브라우저 기본 로그인 창(아이디 · 비밀번호)을 띄움
  - Vercel에서 이 값을 Preview 환경에만 넣으면 → 출시용(main, toppytippy.com)은 그대로 열리고
    내 컴퓨터(localhost, .env.local 에 안 넣으면)도 그대로
  - 아이디는 아무거나, 비밀번호만 맞으면 통과 · 한 번 통과하면 브라우저가 기억함
  - 잠긴 화면은 검색에 안 잡히게 noindex
*/
export function proxy(req: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  if (!password) return NextResponse.next();

  const auth = req.headers.get("authorization") ?? "";
  if (auth.startsWith("Basic ")) {
    try {
      const decoded = atob(auth.slice(6));
      const pass = decoded.slice(decoded.indexOf(":") + 1);
      if (pass === password) {
        const res = NextResponse.next();
        res.headers.set("X-Robots-Tag", "noindex, nofollow");
        return res;
      }
    } catch {}
  }
  return new NextResponse("개발용 화면이에요. 비밀번호를 넣어 주세요.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="toppytippy dev", charset="UTF-8"', "X-Robots-Tag": "noindex, nofollow" },
  });
}

// 이미지 · 스크립트 같은 정적 파일도 같이 잠그되, Next 내부 최적화 경로는 브라우저가 이미 받은 인증으로 통과
export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
