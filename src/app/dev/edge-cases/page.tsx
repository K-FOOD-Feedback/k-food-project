import type { Metadata } from "next";
import { EdgeCasesScreen } from "./EdgeCasesScreen";

// 점검 화면 — 검색에 안 나오게, 앱 안에서는 이 주소로 가는 링크 없음
export const metadata: Metadata = { title: "Edge cases · 오늘의 참견", robots: { index: false, follow: false } };

export default function Page() {
  return <EdgeCasesScreen />;
}
