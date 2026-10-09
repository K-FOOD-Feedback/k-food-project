import type { Metadata } from "next";
import { backHrefFrom } from "@/lib/back";
import { PhotosScreen } from "./PhotosScreen";

export const metadata: Metadata = { title: "Your photos · 오늘의 참견" };

// 6. 콘텐츠 작성 — 04 Photos · 04-T 10장 초과 토스트 (로그인 시트 포함)
// 알림함(쓰다 만 글)에서 왔으면 뒤로가기는 알림함으로
export default async function Page(props: PageProps<"/write">) {
  const { from } = await props.searchParams;
  return <PhotosScreen backHref={backHrefFrom(from, "/home/en")} />;
}
