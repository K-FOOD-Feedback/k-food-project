import type { Metadata } from "next";
import { HomeScreen } from "./HomeScreen";

export const metadata: Metadata = { title: "홈 · 오늘의 참견" };

// 01-A Home · 14 Home draft banner
export default function Page() {
  return <HomeScreen />;
}
