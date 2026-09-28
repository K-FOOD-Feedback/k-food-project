import type { Metadata } from "next";
import { PhotosScreen } from "./PhotosScreen";

export const metadata: Metadata = { title: "Your photos · 오늘의 참견" };

// 04 Photos · 04-T 10장 초과 토스트
export default function Page() {
  return <PhotosScreen />;
}
