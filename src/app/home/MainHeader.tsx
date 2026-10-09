"use client";

import { TrackedLink } from "@/components/Track";
import { useHasNewNotifications } from "@/lib/notifications-seen";
import type { Lang } from "./CardStack";

const circle =
  "pointer-events-auto flex size-16 shrink-0 items-center justify-center rounded-full bg-white/8";

/** 메인 상단의 유리 원형 버튼 (Figma: KF/Header Button) */
export function MainHeader({ lang = "ko" }: { lang?: Lang }) {
  const en = lang === "en";
  const hasNew = useHasNewNotifications(en ? "en" : "ko");
  return (
    <header className="pointer-events-none sticky top-0 z-20 flex w-full justify-end px-2 pt-[calc(8px+env(safe-area-inset-top))] pb-2">
      <div className="flex items-center gap-1">
        {/* 알림함 (송희) — 외국인: 내 글 소식 · 한국인: 답글·투표 결과 */}
        <TrackedLink
          href={en ? "/notifications/en" : "/notifications"}
          event="notifications_clicked"
          props={{ from: "feed", viewer: en ? "foreigner" : "korean" }}
          className={`${circle} relative`}
          aria-label={en ? "Notifications" : "알림"}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- 작은 SVG 아이콘 */}
          <img src="/images/icon-bell.svg" width={24} height={24} alt="" />
          {/* 새 알림 점 — 알림함을 열면 꺼짐 */}
          {hasNew && <span className="absolute right-[21px] top-[19px] size-2 rounded-full bg-primary" aria-hidden="true" />}
        </TrackedLink>
        <TrackedLink href="/" event="language_clicked" props={{ from: "feed", viewer: en ? "foreigner" : "korean" }} className={circle} aria-label={en ? "Change language" : "언어 선택"}>
          {/* eslint-disable-next-line @next/next/no-img-element -- 작은 SVG 아이콘 */}
          <img src="/images/icon-world.svg" width={24} height={24} alt="" />
        </TrackedLink>
        <TrackedLink href="/my" event="my_page_clicked" props={{ from: "feed", viewer: en ? "foreigner" : "korean" }} className={circle} aria-label={en ? "My page" : "내 정보"}>
          {/* eslint-disable-next-line @next/next/no-img-element -- 작은 SVG 아이콘 */}
          <img src="/images/icon-person.svg" width={24} height={24} alt="" />
        </TrackedLink>
      </div>
    </header>
  );
}
