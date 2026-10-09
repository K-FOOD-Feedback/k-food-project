import { notFound } from "next/navigation";
import { getHomePost } from "@/app/home/mockPosts";
import { DetailScreen } from "./DetailScreen";

export default async function Page(props: PageProps<"/posts/[id]">) {
  const { id } = await props.params;
  const post = getHomePost(id);
  if (!post) notFound();
  // 다음 게시글로 넘어가면 화면 상태(투표 영역 본 여부·댓글 더미 등)를 새로 시작하도록 key를 줍니다.
  return <DetailScreen key={post.id} post={post} />;
}
