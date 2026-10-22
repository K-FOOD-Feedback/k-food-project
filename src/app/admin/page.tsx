import { redirect } from "next/navigation";

/** /admin — 지금은 의견 관리 하나뿐이라 바로 그리로 (로그인 안 했으면 거기서 비밀번호 화면으로) */
export default function Page() {
  redirect("/admin/feedback");
}
