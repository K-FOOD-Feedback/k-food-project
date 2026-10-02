import { Placeholder } from "@/components/Placeholder";

export default async function Page(props: PageProps<"/posts/[id]/edit">) {
  const { id } = await props.params;
  return (
    <Placeholder
      part="5. 수정"
      title="글 수정"
      owner="송희"
      links={[{ href: `/posts/${id}`, label: "상세로" }]}
    />
  );
}
