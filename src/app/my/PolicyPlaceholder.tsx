"use client";

import { useRouter } from "next/navigation";
import { IconButton } from "@/components/Buttons";
import { Screen, TopBar } from "@/components/Layout";

/**
 * 이용약관 · 개인정보처리방침 자리 (담당 송희) — 내용은 송희·지현이 정한 뒤 채움
 * 가입 화면·로그인 시트에서 새 탭으로 열림 → ×는 이 탭을 닫고 원래 화면으로
 * (주소로 바로 들어온 경우처럼 닫을 수 없으면 뒤로, 그것도 없으면 처음 화면으로)
 */
export function PolicyPlaceholder({ ko, en }: { ko: string; en: string }) {
  const router = useRouter();
  const close = () => {
    window.close();
    // 닫히지 않았으면(스크립트로 연 탭이 아님) 뒤로
    window.setTimeout(() => (window.history.length > 1 ? router.back() : router.push("/")), 150);
  };
  return (
    <Screen className="pb-16">
      <TopBar left={<IconButton icon="x" label="닫기 · Close" onClick={close} />} />
      <div className="px-6 pt-4">
        <h1 className="font-display text-[28px] leading-[1.15]">{ko}</h1>
        <p className="mt-1 text-[15px] text-muted">{en}</p>
        <p className="mt-8 text-[15px] leading-[1.6] text-muted break-keep">
          정식 내용은 서비스를 시작하기 전에 올라와요.
          <br />
          The full text will be posted before launch.
        </p>
      </div>
    </Screen>
  );
}
