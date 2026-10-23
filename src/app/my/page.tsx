import type { Metadata } from "next";
import { KoMyScreen } from "./KoMyScreen";

export const metadata: Metadata = { title: "마이" };

// 7. 마이 · 한국인 (담당 송희) — 내가 투표한 글 · 내가 남긴 한마디를 빠르게 확인
export default function Page() {
  return <KoMyScreen />;
}
