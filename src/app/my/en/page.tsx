import type { Metadata } from "next";
import { MyScreen } from "../MyScreen";

export const metadata: Metadata = { title: "My" };

// 7. 마이 · 외국인 (담당 송희) — 내 글 · 쓰다 만 글 · 설정을 빠르게 확인
export default async function Page(props: PageProps<"/my/en">) {
  const { comments } = await props.searchParams;
  // 리뷰용: ?comments=none 이면 한마디가 없는 상태
  return <MyScreen noComments={comments === "none"} />;
}
