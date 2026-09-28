"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandButton } from "@/components/Buttons";
import { BlobPhoto } from "@/components/FeedCard";
import { Icon } from "@/components/Icon";
import { Screen } from "@/components/Layout";
import { LoginSheet } from "@/components/LoginSheet";
import { useFlow } from "@/lib/flow-store";

export function LandingScreen() {
  const router = useRouter();
  const { logIn } = useFlow();
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <Screen bg="bg-cream" className="overflow-hidden pt-[env(safe-area-inset-top)]">
      <section className="relative h-[450px] shrink-0 px-5 pt-[72px]">
        <h1 className="font-display text-[72px] leading-[0.87] text-ink">
          See
          <br />
          what
          <br />
          Koreans
          <br />
          think.
        </h1>

        {/* 스티커 */}
        <BlobPhoto
          src="/images/buldak-bowl.png"
          size={145}
          priority
          className="absolute right-[18px] top-[282px]"
        />
        <span className="absolute left-7 top-[336px] -rotate-[8deg] rounded-full bg-pink px-5 py-3 text-[20px] font-extrabold leading-[1.2]">
          맛있겠다!
        </span>
        <span className="absolute left-[84px] top-[410px] rotate-6 rounded-full bg-yellow px-5 py-3 font-display text-[20px] leading-none">
          Is it Korean?
        </span>
        <span className="absolute right-[27px] top-[400px] flex size-14 items-center justify-center rounded-full bg-periwinkle">
          <Icon name="heart" />
        </span>
      </section>

      <section className="mt-auto flex flex-col items-center gap-2 px-6 pt-4 pb-[calc(24px+env(safe-area-inset-bottom))]">
        <p className="pb-2 text-[14px] font-bold leading-[1.3] text-muted">How will you join?</p>
        <BrandButton tone="primary" href="/home">
          I&apos;m Korean
        </BrandButton>
        <BrandButton tone="secondary" href="/home">
          I&apos;m not Korean
        </BrandButton>
        <button
          type="button"
          onClick={() => setLoginOpen(true)}
          className="py-2 text-[14px] font-bold leading-[1.3] text-muted"
        >
          Already joined? Log in
        </button>
      </section>

      <LoginSheet
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onLoggedIn={() => {
          logIn();
          router.push("/home");
        }}
      />
    </Screen>
  );
}
