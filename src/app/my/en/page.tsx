import type { Metadata } from "next";
import { MyScreen } from "../MyScreen";

export const metadata: Metadata = { title: "My · 오늘의 참견" };

// 7. 마이 · 외국인 (담당 송희) — 내 글 · 쓰다 만 글 · 설정을 빠르게 확인
export default function Page() {
  return <MyScreen />;
}
