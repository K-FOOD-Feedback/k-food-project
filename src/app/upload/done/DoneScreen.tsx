"use client";

import { IconButton, PillButton } from "@/components/Buttons";
import { FeedCard } from "@/components/FeedCard";
import { Icon } from "@/components/Icon";
import { Screen, StickyBottom, TopBar } from "@/components/Layout";
import { getQuestion } from "@/lib/data";
import { coverOf, SAMPLE_MY_POST, useFlow } from "@/lib/flow-store";

export function DoneScreen() {
  const { myPost } = useFlow();
  const post = myPost ?? SAMPLE_MY_POST;

  return (
    <Screen className="pb-[140px]">
      <TopBar right={<IconButton icon="x" label="Close" href="/home" />} />

      <div className="relative mx-auto h-[364px] w-full max-w-[375px]">
        <div className="absolute left-[46px] top-[20px] w-[235px] rotate-6">
          <FeedCard
            title={post.title}
            author="Sam · Canada"
            photo={coverOf(post).src}
            votesLabel="0 votes yet"
            questionLabel={getQuestion(post.questionId).label}
            color="bg-yellow"
            scale={0.72}
            priority
          />
        </div>
        <span className="absolute left-[190px] top-[16px] -rotate-10 rounded-full bg-night px-7 py-4 font-display text-[30px] leading-[1.1] text-white">
          Posted!
        </span>
        <span className="absolute left-[282px] top-[282px] flex size-16 items-center justify-center rounded-full bg-pink">
          <Icon name="check" size={30} />
        </span>
      </div>

      <div className="mx-8 mt-4 flex flex-col items-center gap-2 text-center">
        <h1 className="font-display text-[28px] leading-[1.1]">You&apos;re live!</h1>
        <p className="text-[15px] leading-[1.5] text-muted">
          Koreans are on their way. We&apos;ll let you know when the first votes come in.
        </p>
      </div>

      <StickyBottom>
        <div className="flex gap-1">
          <PillButton tone="white" href="/home">
            Back to home
          </PillButton>
          <PillButton tone="black" href="/my-post">
            See my post
          </PillButton>
        </div>
      </StickyBottom>
    </Screen>
  );
}
