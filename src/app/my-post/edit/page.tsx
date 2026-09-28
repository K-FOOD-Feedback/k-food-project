import type { Metadata } from "next";
import { EditScreen } from "./EditScreen";

export const metadata: Metadata = { title: "Edit post · 오늘의 참견" };

// 10 Edit · before votes / 11 Edit · after votes (투표가 1개라도 있으면 잠금)
export default function Page() {
  return <EditScreen />;
}
