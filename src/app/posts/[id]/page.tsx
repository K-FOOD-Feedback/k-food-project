import { notFound } from "next/navigation";
import { Placeholder } from "@/components/Placeholder";
import { getPost } from "@/lib/posts";

export default async function Page(props: PageProps<"/posts/[id]">) {
  const { id } = await props.params;
  const post = getPost(id);
  if (!post) notFound();
  return (
    <Placeholder
      part="2·3. 상세 + 투표"
      title={`상세 — ${post.title}`}
      owner="지현"
      links={[
        { href: `/posts/${id}/comments`, label: "댓글" },
        { href: `/posts/${id}/edit`, label: "수정 (내 글일 때)" },
      ]}
    />
  );
}
