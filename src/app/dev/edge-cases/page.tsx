import type { Metadata } from "next";
import { Suspense } from "react";
import { EdgeCasesScreen } from "./EdgeCasesScreen";

// 점검 화면 — 검색에 안 나오게, 앱 안에서는 이 주소로 가는 링크 없음
export const metadata: Metadata = { title: "Edge cases", robots: { index: false, follow: false } };

export default function Page() {
  // 한마디 칸(CommentPile)이 주소(?comment=)를 읽어서 Suspense로 감쌈 — 없으면 빌드에서 미리 그리기가 실패함
  return (
    <Suspense>
      <EdgeCasesScreen />
    </Suspense>
  );
}
