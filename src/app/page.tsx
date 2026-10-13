import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ROLE_COOKIE } from "@/lib/role";
import { LandingScreen } from "./landing/LandingScreen";

/*
  1. 랜딩 (담당 송희)
  한 게시물에 스크롤할수록 글 → 투표 → 한마디 → 글쓴이 답글이 붙는 장면.
  화면과 문구는 src/app/landing/ 에 있습니다.
  - 다시 온 사람(역할을 고른 적 있음)은 랜딩 없이 바로 자기 메인으로 (/?intro 면 랜딩 그대로)
*/
export default async function Page(props: PageProps<"/">) {
  const { intro } = await props.searchParams;
  const role = (await cookies()).get(ROLE_COOKIE)?.value;
  if (intro === undefined) {
    if (role === "ko") redirect("/home");
    if (role === "en") redirect("/home/en");
  }
  return <LandingScreen />;
}
