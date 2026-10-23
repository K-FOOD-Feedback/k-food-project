import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Screen } from "@/components/Layout";
import { isAdmin, safeNext } from "../auth";
import { PinForm } from "./PinForm";

/*
  어드민 비밀번호 /admin/login — 메인 왼쪽 어드민 버튼 → 여기서 숫자 4자리 → 의견 관리
  이미 들어와 있으면(쿠키) 바로 넘어감. 문구는 고정이라 넘칠 일 없음
*/
export const metadata: Metadata = {
  title: "어드민",
  robots: { index: false, follow: false },
};

export default async function Page(props: PageProps<"/admin/login">) {
  const q = await props.searchParams;
  const next = safeNext(q.next);
  if (await isAdmin()) redirect(next);

  return (
    <Screen className="items-center px-6 pt-[calc(160px+env(safe-area-inset-top))] pb-16">
      <h1 className="animate-rise text-center font-display text-[24px] leading-[1.3]">
        어드민 비밀번호를
        <br />
        입력해 주세요
      </h1>
      <div className="mt-9 animate-rise [animation-delay:80ms]">
        <PinForm next={next} />
      </div>
      <Link href="/home" className="mt-auto py-2 text-[14px] font-semibold text-muted">
        메인으로 돌아가기
      </Link>
    </Screen>
  );
}
