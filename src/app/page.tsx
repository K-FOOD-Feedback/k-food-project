import Image from "next/image";
import { TrackedLink, TrackView } from "@/components/Track";

/*
  1. 랜딩페이지 (Figma 259:6859)
  실제 웹에서는 기기 상태바가 따로 있으므로 Figma의 Status Bar(48px)는 그리지 않습니다.
*/
export default function Page() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-background pt-[env(safe-area-inset-top)] text-on-dark">
      <section className="relative h-[460px] shrink-0">
        {/* 진입 순서: 헤드라인 한 줄씩 → 사진 → 스티커 뿅뿅 → 하단 버튼 */}
        <h1 className="absolute left-5 top-[72px] font-display text-[72px] leading-[0.87]">
          {["See", "what", "Koreans", "think."].map((word, i) => (
            <span key={word} className="block animate-rise" style={{ animationDelay: `${i * 90}ms` }}>
              {word}
            </span>
          ))}
        </h1>

        {/* 물결 모양으로 잘린 음식 사진 */}
        <div
          className="absolute right-[17px] top-[284px] size-[145px] animate-pop overflow-hidden [animation-delay:420ms]"
          style={{
            maskImage: "url(/images/blob-mask.svg)",
            WebkitMaskImage: "url(/images/blob-mask.svg)",
            maskSize: "100% 100%",
            WebkitMaskSize: "100% 100%",
          }}
        >
          <Image
            src="/images/landing-noodles.png"
            alt="그릇에 담긴 불닭볶음면"
            width={214}
            height={149}
            priority
            className="absolute -left-[34px] -top-px h-[149px] w-[214px] max-w-none object-cover"
          />
        </div>

        {/* 스티커 */}
        <span className="absolute left-7 top-[338px] -rotate-[8deg] animate-pop rounded-full bg-primary px-5 py-3 text-[20px] font-extrabold leading-[1.2] text-on-light [animation-delay:620ms]">
          맛있겠다!
        </span>
        <span className="absolute left-[84px] top-[414px] rotate-6 animate-pop rounded-full bg-content px-5 py-3 font-display text-[20px] leading-none text-on-light [animation-delay:760ms]">
          Is it Korean?
        </span>
        <span className="absolute left-[292px] top-[400px] flex size-14 animate-pop items-center justify-center rounded-full bg-secondary text-on-light [animation-delay:900ms]">
          <HeartIcon />
        </span>
      </section>

      <TrackView event="landing_viewed" />
      <section className="mt-auto flex animate-rise flex-col items-center px-6 pb-[calc(24px+env(safe-area-inset-bottom))] [animation-delay:850ms]">
        <p className="text-[14px] font-bold leading-[1.3] text-neutral-400">How will you join?</p>
        <div className="mt-[22px] flex w-full flex-col items-center gap-2">
          {/* TODO: 한국인/외국인 구분을 저장해서 메인 화면에 넘기기 */}
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
          {/* TODO: 로그인 시트 연결 (6. 콘텐츠 작성 파트에서 만드는 로그인 시트를 재사용) */}
          <TrackedLink
            href="/home"
            event="landing_login_clicked"
            className="py-2 text-[14px] font-bold leading-[1.3] text-neutral-400"
          >
            Already joined? Log in
          </TrackedLink>
        </div>
      </section>
    </main>
  );
}

// Lucide heart (MIT)
function HeartIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}
