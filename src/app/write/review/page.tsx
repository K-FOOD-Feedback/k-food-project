import type { Metadata } from "next";
import { ReviewScreen } from "./ReviewScreen";

export const metadata: Metadata = { title: "Review your post · 오늘의 참견" };

// 07 Review draft
export default function Page() {
  return <ReviewScreen />;
}
