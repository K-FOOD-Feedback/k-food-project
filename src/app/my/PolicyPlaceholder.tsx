"use client";

import { useRouter } from "next/navigation";
import { IconButton } from "@/components/Buttons";
import { Screen, TopBar } from "@/components/Layout";
import { useViewerUiLang } from "@/app/posts/[id]/viewerLang";

const POLICY = {
  terms: { ko: "이용약관", en: "Terms of Service", zh: "服务条款", zht: "服務條款", ja: "利用規約" },
  privacy: { ko: "개인정보처리방침", en: "Privacy Policy", zh: "隐私政策", zht: "隱私政策", ja: "プライバシーポリシー" },
};
const SOON = {
  en: "The full text will be posted before launch.",
  zh: "正式内容会在服务上线前公布。",
  zht: "正式內容會在服務上線前公佈。",
  ja: "正式な内容はサービス開始前に掲載します。",
};
const CLOSE = { en: "Close", zh: "关闭", zht: "關閉", ja: "閉じる" };

/**
 * 이용약관 · 개인정보처리방침 자리 (담당 송희) — 내용은 송희·지현이 정한 뒤 채움
 * 가입 화면·로그인 시트에서 새 탭으로 열림 → ×는 이 탭을 닫고 원래 화면으로
 * (주소로 바로 들어온 경우처럼 닫을 수 없으면 뒤로, 그것도 없으면 처음 화면으로)
 */
export function PolicyPlaceholder({ doc }: { doc: keyof typeof POLICY }) {
  const router = useRouter();
  // 한국어 + 외국인이 고른 언어(영·중·일, 한국어를 골랐으면 영어)를 같이
  const ui = useViewerUiLang();
  const fl = ui === "zh" || ui === "zht" || ui === "ja" ? ui : "en";
  const { ko } = POLICY[doc];
  const other = POLICY[doc][fl];
  const close = () => {
    window.close();
    // 닫히지 않았으면(스크립트로 연 탭이 아님) 뒤로
    window.setTimeout(() => (window.history.length > 1 ? router.back() : router.push("/")), 150);
  };
  return (
    <Screen className="pb-16">
      <TopBar left={<IconButton icon="x" label={`닫기 · ${CLOSE[fl]}`} onClick={close} />} />
      <div className="px-6 pt-4">
        <h1 className="font-display text-[32px] leading-[1.2]">{ko}</h1>
        <p className="mt-1 text-[16px] text-muted">{other}</p>
        {/* 중·일은 띄어쓰기가 없어 break-keep을 걸면 한 줄로 넘침 → 한국어 줄에만 */}
        <p className="mt-8 text-[16px] leading-[1.5] text-muted">
          <span className="break-keep">정식 내용은 서비스를 시작하기 전에 올라와요.</span>
          <br />
          {SOON[fl]}
        </p>
      </div>
    </Screen>
  );
}
