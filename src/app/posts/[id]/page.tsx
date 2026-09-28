import { notFound } from "next/navigation";
import { FEED, getFeedPost } from "@/lib/data";
import { PostDetailScreen } from "./PostDetailScreen";

export function generateStaticParams() {
  return FEED.map((p) => ({ id: p.id }));
}

export async function generateMetadata(props: PageProps<"/posts/[id]">) {
  const { id } = await props.params;
  const post = getFeedPost(id);
  return { title: post ? `${post.title} · 오늘의 참견` : "오늘의 참견" };
}

// E1-GL 글 상세 · V2a 투표 시트
export default async function Page(props: PageProps<"/posts/[id]">) {
  const { id } = await props.params;
  const post = getFeedPost(id);
  if (!post) notFound();
  return <PostDetailScreen post={post} />;
}
