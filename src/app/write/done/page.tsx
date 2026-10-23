import type { Metadata } from "next";
import { DoneScreen } from "./DoneScreen";

export const metadata: Metadata = { title: "Posted" };

// 08 Posted
export default function Page() {
  return <DoneScreen />;
}
