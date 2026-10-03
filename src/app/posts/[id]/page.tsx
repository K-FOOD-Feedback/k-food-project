import { notFound } from "next/navigation";
import { getHomePost } from "@/app/home/mockPosts";
import { DetailScreen } from "./DetailScreen";

export default async function Page(props: PageProps<"/posts/[id]">) {
  const { id } = await props.params;
  const post = getHomePost(id);
  if (!post) notFound();
  return <DetailScreen post={post} />;
}
