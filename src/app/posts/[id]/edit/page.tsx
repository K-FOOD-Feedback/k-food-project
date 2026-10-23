import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { withFrom } from "@/lib/back";
import { MY_POST_ID } from "@/lib/write-data";
import { EditScreen } from "./EditScreen";

export const metadata: Metadata = { title: "Edit post" };

// 5. 수정 — 10 Edit · before votes / 11 Edit · after votes (투표가 1개라도 있으면 잠금)
export default async function Page(props: PageProps<"/posts/[id]/edit">) {
  const { id } = await props.params;
  if (id !== MY_POST_ID) notFound();
  // 닫기·저장 뒤 상세로 — 상세에 들어온 곳(?from=)을 이어 붙여서
  const { from } = await props.searchParams;
  return <EditScreen detailHref={withFrom(`/posts/${MY_POST_ID}`, from)} />;
}
