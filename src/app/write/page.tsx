import type { Metadata } from "next";
import { PhotosScreen } from "./PhotosScreen";

export const metadata: Metadata = { title: "Your photos · 오늘의 참견" };

// 6. 콘텐츠 작성 — 04 Photos · 04-T 10장 초과 토스트 (로그인 시트 포함)
export default function Page() {
  return <PhotosScreen />;
}
