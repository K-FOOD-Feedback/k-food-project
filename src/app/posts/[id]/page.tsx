import { notFound } from "next/navigation";
import { getHomePost } from "@/app/home/mockPosts";
import { MyPostDetail } from "@/app/write/MyPostDetail";
import { MY_POST_ID } from "@/lib/write-data";
import { DetailScreen } from "./DetailScreen";

export default async function Page(props: PageProps<"/posts/[id]">) {
  const { id } = await props.params;
  // 내가 올린 글(송희) — 서버 전까지 브라우저 메모리에만 있어서 따로 꺼내 같은 상세 화면으로 보여 줌
  if (id === MY_POST_ID) return <MyPostDetail />;
  const post = getHomePost(id);
  if (!post) notFound();
  // 다음 게시글로 넘어가면 화면 상태(투표 영역 본 여부·댓글 더미 등)를 새로 시작하도록 key를 줍니다.
  return <DetailScreen key={post.id} post={post} />;
}
