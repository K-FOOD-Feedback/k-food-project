import { Placeholder } from "@/components/Placeholder";

export default async function Page(props: PageProps<"/posts/[id]/comments">) {
  const { id } = await props.params;
  return (
    <Placeholder
      part="4. 댓글"
      title="댓글"
      owner="지현"
      links={[{ href: `/posts/${id}`, label: "상세로" }]}
    />
  );
}
