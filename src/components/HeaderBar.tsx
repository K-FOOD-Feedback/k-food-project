import Link from "next/link";

const circle =
  "pointer-events-auto flex size-16 shrink-0 items-center justify-center rounded-full bg-glass";

/** 메인 상단의 유리 원형 버튼 (Figma: KF/Header Button) */
export function MainHeader() {
  return (
    <header className="pointer-events-none sticky top-0 z-20 flex w-full justify-end px-2 pt-[calc(8px+env(safe-area-inset-top))] pb-2">
      <div className="flex items-center gap-1">
        <Link href="/" className={circle} aria-label="언어 선택">
          {/* eslint-disable-next-line @next/next/no-img-element -- 작은 SVG 아이콘 */}
          <img src="/images/icon-world.svg" width={24} height={24} alt="" />
        </Link>
        <Link href="/my" className={circle} aria-label="내 정보">
          {/* eslint-disable-next-line @next/next/no-img-element -- 작은 SVG 아이콘 */}
          <img src="/images/icon-person.svg" width={24} height={24} alt="" />
        </Link>
      </div>
    </header>
  );
}
