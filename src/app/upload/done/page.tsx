import type { Metadata } from "next";
import { DoneScreen } from "./DoneScreen";

export const metadata: Metadata = { title: "Posted · 오늘의 참견" };

// 08 Posted
export default function Page() {
  return <DoneScreen />;
}
