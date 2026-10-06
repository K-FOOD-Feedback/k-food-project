import { TrackedLink } from "@/components/Track";
import type { Lang } from "./CardStack";

const circle =
  "pointer-events-auto flex size-16 shrink-0 items-center justify-center rounded-full bg-white/8";

/** 메인 상단의 유리 원형 버튼 (Figma: KF/Header Button) */
export function MainHeader({ lang = "ko" }: { lang?: Lang }) {
  const en = lang === "en";
  return (
    <header className="pointer-events-none sticky top-0 z-20 flex w-full justify-end px-2 pt-[calc(8px+env(safe-area-inset-top))] pb-2">
      <div className="flex items-center gap-1">
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
