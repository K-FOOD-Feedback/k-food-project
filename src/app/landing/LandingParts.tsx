import Link from "next/link";
import { TrackedLink } from "@/components/Track";

/*
  랜딩 시안 A/B 공용 (6. 랜딩, 담당 송희)
  시안이 정해지면 고른 쪽을 src/app/page.tsx 로 옮기고 이 폴더는 지웁니다.
*/

/** 하단 버튼 — 지금 랜딩(/)과 같음 */
export function LandingActions() {
  return (
    <div className="pointer-events-none sticky bottom-0 z-20 mt-auto">
      <div className="pointer-events-auto flex flex-col items-center bg-gradient-to-b from-background/0 via-background via-30% to-background px-6 pt-10 pb-[calc(24px+env(safe-area-inset-bottom))]">
        <p className="text-[14px] font-bold leading-[1.3] text-neutral-400">How will you join?</p>
        <div className="mt-[18px] flex w-full flex-col items-center gap-2">
          <TrackedLink
            href="/home"
            event="role_selected"
            props={{ role: "korean" }}
            superProps={{ user_type: "korean" }}
            className="flex h-[72px] w-full items-center justify-center rounded-full bg-primary font-display text-[20px] leading-none text-on-light transition active:scale-[0.99]"
          >
            I&apos;m Korean
          </TrackedLink>
          <TrackedLink
            href="/home/en"
            event="role_selected"
            props={{ role: "foreigner" }}
            superProps={{ user_type: "foreigner" }}
            className="flex h-[72px] w-full items-center justify-center rounded-full bg-secondary font-display text-[20px] leading-none text-on-light transition active:scale-[0.99]"
          >
            I&apos;m not Korean
          </TrackedLink>
          <TrackedLink
            href="/home"
            event="landing_login_clicked"
            className="py-2 text-[14px] font-bold leading-[1.3] text-neutral-400"
          >
            Already joined? Log in
          </TrackedLink>
        </div>
      </div>
    </div>
  );
}

/** 시안 비교용 스위치 (시안 확정 후 삭제) */
export function DraftSwitch({ current }: { current: "a" | "b" }) {
  return (
    <div className="fixed left-1/2 top-[calc(12px+env(safe-area-inset-top))] z-40 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white/10 p-1 text-[12px] font-bold backdrop-blur-md">
      <span className="px-2 text-neutral-400">시안</span>
      {(["a", "b"] as const).map((id) => (
        <Link
          key={id}
          href={`/landing/${id}`}
          className={`rounded-full px-3 py-1.5 uppercase ${id === current ? "bg-on-dark text-on-light" : "text-on-dark"}`}
        >
          {id}
        </Link>
      ))}
    </div>
  );
}

/** 사진 대신 쓰는 물결 모양 음식 그림 (이모지) */
export function FoodBlob({ emoji, size, className = "" }: { emoji: string; size: number; className?: string }) {
  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      <div
        className="absolute inset-0 bg-on-dark"
        style={{
          maskImage: "url(/images/blob-mask.svg)",
          WebkitMaskImage: "url(/images/blob-mask.svg)",
          maskSize: "100% 100%",
          WebkitMaskSize: "100% 100%",
        }}
      />
      <span className="absolute inset-0 flex items-center justify-center" style={{ fontSize: size * 0.5 }}>
        {emoji}
      </span>
    </div>
  );
}
