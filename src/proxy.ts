import { NextResponse, type NextRequest } from "next/server";

/*
  출시 전 "곧 공개" 스위치
  - Vercel 환경 변수 PRELAUNCH=1 이 있는 배포(출시용 Production = toppytippy.com)에서는
    모든 화면을 /coming-soon 으로 바꿔 보여 줍니다. 주소창의 주소는 그대로.
  - 개발용(dev) 배포·로컬에는 이 값이 없으니 지금 앱이 그대로 보입니다.
  - 출시하는 날: Vercel → Settings → Environment Variables 에서 PRELAUNCH 를 지우고 다시 배포.
  - /api 는 막지 않습니다 (매일 도는 /api/keepalive 크론이 계속 돌아야 함).
*/
export function proxy(request: NextRequest) {
  if (process.env.PRELAUNCH !== "1") return NextResponse.next();
  return NextResponse.rewrite(new URL("/coming-soon", request.url));
}

export const config = {
  // api·Next 내부 파일·public 의 파일(점이 들어간 주소)·곧 공개 화면 자신은 빼고 모든 화면
  matcher: ["/((?!api|_next|coming-soon|.*\\..*).*)"],
};
