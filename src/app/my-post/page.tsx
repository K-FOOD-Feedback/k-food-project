import type { Metadata } from "next";
import { MyPostScreen } from "./MyPostScreen";

export const metadata: Metadata = { title: "My post · 오늘의 참견" };

/**
 * 09 My post · menu / 12 Delete confirm
 * 리뷰용: /my-post?votes=12 로 열면 "투표가 있는 글" 상태를 볼 수 있습니다.
 */
export default async function Page(props: PageProps<"/my-post">) {
  const { votes } = await props.searchParams;
  const demoVotes = Number(Array.isArray(votes) ? votes[0] : votes) || undefined;
  return <MyPostScreen demoVotes={demoVotes} />;
}
