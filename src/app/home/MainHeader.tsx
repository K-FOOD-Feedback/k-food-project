"use client";

import { LanguageButton } from "@/components/LanguagePicker";
import { HEADER_BUTTON, PageHeader } from "@/components/PageHeader";
import { TrackedLink } from "@/components/Track";
import { useHasNewNotifications } from "@/lib/notifications-seen";
import { saveKoreanLang, saveViewerLang } from "../posts/[id]/viewerLang";
import type { Lang } from "./CardStack";

/** 메인 상단 버튼 — 모든 화면 공통 상단 바(PageHeader) 사용
    version: 한국인/외국인 버전 (알림·마이 주소, 분석) · lang: 지구본으로 고른 화면 언어 (버튼 이름) */
export function MainHeader({
  version = "ko",
  lang = version,
}: {
  version?: Lang;
  lang?: Lang;
}) {
  const en = version === "en";
  const enText = lang === "en";
  const hasNew = useHasNewNotifications(en ? "en" : "ko");
  return (
    <PageHeader
      right={
        <>
          {/* 알림함 (송희) — 외국인: 내 글 소식 · 한국인: 답글·투표 결과 */}
          <TrackedLink
            href={en ? "/notifications/en" : "/notifications"}
            event="notifications_clicked"
            props={{ from: "feed", viewer: en ? "foreigner" : "korean" }}
            className={`${HEADER_BUTTON} relative`}
            aria-label={enText ? "Notifications" : "알림"}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- 작은 SVG 아이콘 */}
            <img src="/images/icon-bell.svg" width={24} height={24} alt="" />
            {/* 새 알림 점 — 알림함을 열면 꺼짐 */}
            {hasNew && (
              <span
                className="absolute right-[21px] top-[19px] size-2 rounded-full bg-primary"
                aria-hidden="true"
              />
            )}
          </TrackedLink>
          {/* 언어 변경 — 버전(한국인/외국인)은 그대로, 화면 언어만 바뀜 (상세·한마디와 같은 기억 사용) */}
          <LanguageButton
            lang={lang}
            from="feed"
            onChange={en ? saveViewerLang : saveKoreanLang}
          />
          <TrackedLink
            href={en ? "/my/en" : "/my"}
            event="my_page_clicked"
            props={{ from: "feed", viewer: en ? "foreigner" : "korean" }}
            className={HEADER_BUTTON}
            aria-label={enText ? "My page" : "내 정보"}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- 작은 SVG 아이콘 */}
            <img src="/images/icon-person.svg" width={24} height={24} alt="" />
          </TrackedLink>
        </>
      }
    />
  );
}
