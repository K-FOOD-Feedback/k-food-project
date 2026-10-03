import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MY_POST_ID } from "@/lib/write-data";
import { EditScreen } from "./EditScreen";

export const metadata: Metadata = { title: "Edit post · 오늘의 참견" };

// 5. 수정 — 10 Edit · before votes / 11 Edit · after votes (투표가 1개라도 있으면 잠금)
export default async function Page(props: PageProps<"/posts/[id]/edit">) {
  const { id } = await props.params;
  if (id !== MY_POST_ID) notFound();
  return <EditScreen />;
}
