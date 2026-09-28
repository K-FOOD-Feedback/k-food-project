import type { Metadata } from "next";
import { WritingScreen } from "./WritingScreen";

export const metadata: Metadata = { title: "Cooking up your post · 오늘의 참견" };

// 06 AI writing
export default function Page() {
  return <WritingScreen />;
}
