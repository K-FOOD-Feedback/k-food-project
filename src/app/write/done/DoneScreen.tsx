"use client";

import { IconButton, PillButton } from "@/components/Buttons";
import { FeedCard } from "@/components/FeedCard";
import { Icon } from "@/components/Icon";
import { Screen, StickyBottom, TopBar } from "@/components/Layout";
import { getQuestion } from "@/lib/write-data";
import { coverOf, SAMPLE_MY_POST, useFlow, MY_POST_ID } from "@/lib/write-store";

export function DoneScreen() {
  const { myPost } = useFlow();
  const post = myPost ?? SAMPLE_MY_POST;

  return (
    <Screen className="pb-[140px]">
      <TopBar right={<IconButton icon="x" label="Close" href="/home" />} />

      <div className="relative mx-auto h-[364px] w-full max-w-[375px]">
        <Confetti />
        {/* 카드 툭 떨어짐 → 도장 쾅 → 체크 뿅 */}
        <div className="absolute left-[46px] top-[20px] w-[235px] rotate-6 animate-drop">
          <FeedCard
            title={post.title}
            author="Sam · Canada"
            photo={coverOf(post).src}
            votesLabel="0 votes yet"
            questionLabel={getQuestion(post.questionId).label}
            color="bg-content"
            scale={0.72}
            priority
          />
        </div>
        <span className="absolute left-[190px] top-[16px] -rotate-10 animate-stamp rounded-full bg-primary px-7 py-4 font-display text-[30px] leading-[1.1] text-on-light shadow-[0_8px_24px_rgba(0,0,0,0.35)] [animation-delay:450ms]">
          Posted!
        </span>
        <span className="absolute left-[282px] top-[282px] flex size-16 animate-pop items-center justify-center rounded-full bg-secondary text-on-light [animation-delay:750ms]">
          <Icon name="check" size={30} />
        </span>
      </div>

      <div className="mx-8 mt-4 flex animate-rise flex-col items-center gap-2 text-center [animation-delay:850ms]">
        <h1 className="font-display text-[28px] leading-[1.1]">You&apos;re live!</h1>
        <p className="text-[15px] leading-[1.5] text-muted">
          Koreans are on their way. We&apos;ll let you know when the first votes come in.
        </p>
      </div>

      <StickyBottom className="animate-rise [animation-delay:950ms]">
        <div className="flex gap-1">
          <PillButton tone="white" href="/home">
            Back to home
          </PillButton>
          <PillButton tone="black" href={`/my/posts/${MY_POST_ID}`}>
            See my post
          </PillButton>
        </div>
      </StickyBottom>
    </Screen>
  );
}

// 게시 축하 색종이 — 도장이 찍히는 순간 사방으로 터짐
const CONFETTI_COLORS = ["bg-primary", "bg-content", "bg-secondary", "bg-lilac", "bg-on-dark"];
const PIECES = Array.from({ length: 22 }, (_, i) => {
  const angle = (i / 22) * Math.PI * 2 + (i % 3) * 0.3;
  const dist = 120 + ((i * 37) % 90);
  return {
    x: Math.round(Math.cos(angle) * dist),
    y: Math.round(Math.sin(angle) * dist * 0.8 + 60),
    r: ((i * 83) % 360) - 180 + 360,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    shape: i % 3 === 0 ? "size-2.5 rounded-full" : i % 3 === 1 ? "h-3 w-1.5 rounded-sm" : "size-2 rotate-45",
    delay: 520 + (i % 4) * 30,
  };
});

function Confetti() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute left-[250px] top-[60px] z-20">
      {PIECES.map((p, i) => (
        <span
          key={i}
          className={`absolute animate-confetti ${p.color} ${p.shape}`}
          style={
            {
              "--x": `${p.x}px`,
              "--y": `${p.y}px`,
              "--r": `${p.r}deg`,
              animationDelay: `${p.delay}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
