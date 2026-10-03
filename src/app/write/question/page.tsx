import type { Metadata } from "next";
import { QuestionScreen } from "./QuestionScreen";

export const metadata: Metadata = { title: "Pick a question · 오늘의 참견" };

// 05-W Pick a question · wheel
export default function Page() {
  return <QuestionScreen />;
}
