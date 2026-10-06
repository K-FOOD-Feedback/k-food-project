import type { Metadata } from "next";
import { PostStepScreen } from "./PostStepScreen";

export const metadata: Metadata = { title: "Your post · 오늘의 참견" };

// ③ Your post — 음식 인식 확인 + 제목·본문
export default function Page() {
  return <PostStepScreen />;
}
