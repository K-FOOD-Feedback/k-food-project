import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MY_POST_ID } from "@/lib/write-data";
import { MyPostScreen } from "./MyPostScreen";

export const metadata: Metadata = { title: "My post · 오늘의 참견" };

/**
 * 09 My post · menu / 12 Delete confirm — 내가 올린 글 (담당 송희)
 * 리뷰용: /my/posts/mine?votes=12 로 열면 "투표가 있는 글" 상태를 볼 수 있습니다.
 */
export default async function Page(props: PageProps<"/my/posts/[id]">) {
  const { id } = await props.params;
  if (id !== MY_POST_ID) notFound();
  const { votes } = await props.searchParams;
  const demoVotes = Number(Array.isArray(votes) ? votes[0] : votes) || undefined;
  return <MyPostScreen demoVotes={demoVotes} />;
}
