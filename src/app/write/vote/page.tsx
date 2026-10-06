import type { Metadata } from "next";
import { VoteStepScreen } from "./VoteStepScreen";

export const metadata: Metadata = { title: "Your vote · 오늘의 참견" };

// ④ Your vote — 투표 제목 + 선택지 (AI가 글을 보고 만들고, 사용자가 고침)
export default function Page() {
  return <VoteStepScreen />;
}
