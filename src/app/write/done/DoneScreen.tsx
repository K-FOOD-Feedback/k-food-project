"use client";

import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { IconButton, PillButton } from "@/components/Buttons";
import { FeedCard } from "@/components/FeedCard";
import { Icon } from "@/components/Icon";
import { Screen, StickyBottom, TopBar } from "@/components/Layout";
import { track } from "@/lib/analytics";
import { getQuestion } from "@/lib/write-data";
import { coverOf, SAMPLE_MY_POST, useFlow, MY_POST_ID } from "@/lib/write-store";
import { ShareSheet } from "./ShareSheet";

/*
  08 Posted 연출 (ms)
     0  카드가 아래(Post 버튼 자리)에서 기울어진 채 솟아오름
   ~600 스프링처럼 흔들리며 정방향으로 섬
  1050  "Posted!" 도장 쾅 → 카드 찌그러짐 + 화면 흔들림 + 색종이
  1500~ 체크 · 문구 · 버튼 순서로 등장, 이후 카드는 둥실둥실
  카드를 손가락으로 문지르면 3D로 기울고, 탭하면 색종이가 다시 터짐
*/
const T = { stamp: 1050, check: 1500, text: 1600, cta: 1750, float: 2000 };

export function DoneScreen() {
  const { myPost } = useFlow();
  const post = myPost ?? SAMPLE_MY_POST;

  const [tilt, setTilt] = useState({ x: 0, y: 0, active: false });
  const [burst, setBurst] = useState(0); // 탭할 때마다 +1 → 색종이 다시
  const [shareOpen, setShareOpen] = useState(false);

  const tilted = useRef(false); // 분석용: 카드를 문질러 봤는지
  const cardRef = useRef<HTMLDivElement>(null); // 공유 시트가 열릴 때 카드가 여기서 출발
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    tilted.current = true;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: -py * 18, y: px * 22, active: true });
  };

  // 다시 터질 때는 지연 없이 바로
  const stampDelay = burst ? 0 : T.stamp;

  return (
    <Screen className="pb-[210px]">
      <TopBar right={<IconButton
            icon="x"
            label="Close"
            href="/home/en"
            onClick={() => track("posted_next_action", { action: "close", taps: burst, tilted: tilted.current })}
          />} />

      {/* 도장 찍힐 때 화면 흔들림 (처음 한 번) */}
      <div className="animate-jolt" style={{ animationDelay: `${T.stamp + 60}ms` }}>
        <div className="relative mx-auto h-[420px] w-full max-w-[375px] [perspective:900px]">
          {/* 3D 기울기 (손가락을 따라감) */}
          <div
            className="absolute left-1/2 top-12 w-[235px] -ml-[117.5px] cursor-pointer touch-none"
            onPointerMove={onMove}
            onPointerLeave={() => setTilt({ x: 0, y: 0, active: false })}
            onPointerUp={() => setTilt({ x: 0, y: 0, active: false })}
            onClick={() => {
              track("posted_card_tapped", { taps: burst + 1, tilted: tilted.current });
              setBurst((b) => b + 1);
            }}
            style={{
              transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
              transition: tilt.active ? "transform 120ms ease-out" : "transform 600ms cubic-bezier(0.3, 1.6, 0.5, 1)",
              transformStyle: "preserve-3d",
            }}
          >
            {/* 둥실둥실 (등장이 끝난 뒤부터) · 공유 시트가 열리면 카드가 시트로 내려간 것처럼 감춤 */}
            <div
              ref={cardRef}
              className="animate-float transition-opacity duration-200"
              style={{ animationDelay: `${T.float}ms`, opacity: shareOpen ? 0 : 1 }}
            >
              {/* 솟아올라 정방향으로 */}
              <div className="relative animate-card-enter">
                <div key={`squash-${burst}`} className="relative animate-squash" style={{ animationDelay: `${stampDelay + 40}ms` }}>
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
                <span
                  key={`stamp-${burst}`}
                  className="absolute -right-10 top-1 -rotate-[10deg] animate-stamp rounded-full bg-primary px-7 py-4 font-display text-[30px] leading-[1.1] text-on-light shadow-[0_10px_28px_rgba(0,0,0,0.45)]"
                  style={{ animationDelay: `${stampDelay}ms`, transform: "translateZ(40px)" }}
                >
                  Posted!
                </span>
              </div>
            </div>
          </div>

          <Confetti key={`confetti-${burst}`} delay={stampDelay + 40} />

          <span
            className="absolute left-[calc(50%+92px)] top-[330px] flex size-16 animate-pop items-center justify-center rounded-full bg-secondary text-on-light shadow-[0_8px_20px_rgba(0,0,0,0.35)]"
            style={{ animationDelay: `${T.check}ms` }}
          >
            <Icon name="check" size={30} strokeWidth={2.5} />
          </span>
        </div>
      </div>

      <div
        className="mx-8 mt-2 flex animate-rise flex-col items-center gap-2 text-center"
        style={{ animationDelay: `${T.text}ms` }}
      >
        <h1 className="font-display text-[28px] leading-[1.1]">You&apos;re live!</h1>
        <p className="text-[15px] leading-[1.5] text-muted">
          Koreans are on their way. We&apos;ll let you know when the first votes come in.
        </p>
      </div>

      <StickyBottom className="animate-rise [animation-delay:1750ms]">
        {/* 공유 유도: 메인 CTA는 공유, 나머지는 작게 */}
        <PillButton
          tone="primary"
          className="flex-none gap-2"
          onClick={() => {
            track("posted_next_action", { action: "share", taps: burst, tilted: tilted.current });
            track("share_sheet_opened", { from: "posted" });
            setShareOpen(true);
          }}
        >
          <Icon name="share" size={20} />
          Share with friends
        </PillButton>
        <div className="flex gap-1">
          <PillButton
            tone="white"
            href="/home/en"
            onClick={() => track("posted_next_action", { action: "home", taps: burst, tilted: tilted.current })}
          >
            Back to home
          </PillButton>
          <PillButton
            tone="white"
            href={`/my/posts/${MY_POST_ID}`}
            onClick={() => track("posted_next_action", { action: "my_post", taps: burst, tilted: tilted.current })}
          >
            See my post
          </PillButton>
        </div>
      </StickyBottom>

      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        postId={MY_POST_ID}
        origin={cardRef}
        post={{
          title: post.title,
          dish: post.dish,
          photo: coverOf(post).src,
          voteQuestion: post.voteQuestion,
          options: post.options.filter((o) => o.trim()),
          author: "Sam · Canada",
        }}
        from="posted"
      />
    </Screen>
  );
}

// 게시 축하 색종이 — 도장 자리에서 사방으로 터짐
const CONFETTI_COLORS = ["bg-primary", "bg-content", "bg-secondary", "bg-lilac", "bg-on-dark"];
const PIECES = Array.from({ length: 28 }, (_, i) => {
  const angle = (i / 28) * Math.PI * 2 + (i % 3) * 0.3;
  const dist = 110 + ((i * 37) % 110);
  return {
    x: Math.round(Math.cos(angle) * dist),
    y: Math.round(Math.sin(angle) * dist * 0.85 + 70),
    r: ((i * 83) % 360) + 180,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    shape: i % 3 === 0 ? "size-2.5 rounded-full" : i % 3 === 1 ? "h-3.5 w-1.5 rounded-sm" : "size-2 rotate-45",
    stagger: (i % 4) * 30,
  };
});

function Confetti({ delay }: { delay: number }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute left-[calc(50%+80px)] top-[90px] z-20">
      {PIECES.map((p, i) => (
        <span
          key={i}
          className={`absolute animate-confetti ${p.color} ${p.shape}`}
          style={
            {
              "--x": `${p.x}px`,
              "--y": `${p.y}px`,
              "--r": `${p.r}deg`,
              animationDelay: `${delay + p.stagger}ms`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
