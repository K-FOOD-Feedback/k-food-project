"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShareKfoodButton } from "@/components/ShareKfoodButton";
import { CardStack, type Lang } from "./CardStack";
import { MainHeader } from "./MainHeader";
import { HOME_POSTS } from "./mockPosts";
import { useVotedIds } from "./votes";

// 상세에 다녀와도 보던 카드에서 다시 시작하도록 기억해 둡니다 (새로고침하면 처음부터).
let lastIndex = 0;

export function HomeScreen({ lang = "ko" }: { lang?: Lang }) {
  const router = useRouter();
  const posts = HOME_POSTS;
  const [index, setIndex] = useState(() =>
    Math.min(lastIndex, posts.length - 1),
  );
  const votedIds = useVotedIds();
  const current = posts[index];
  const voted = votedIds.has(current.id);

  const changeIndex = (next: number) => {
    lastIndex = next;
    setIndex(next);
  };

  return (
    // 랜딩(src/app/page.tsx)과 같은 틀: 가운데 430px 폭의 어두운 화면
    <main className="relative mx-auto min-h-dvh w-full max-w-[430px] overflow-x-clip bg-background text-on-dark">
      <div className="pb-[calc(160px+env(safe-area-inset-bottom))]">
        <MainHeader lang={lang} />
        <CardStack
          lang={lang}
          posts={posts}
          index={index}
          votedIds={votedIds}
          onIndexChange={changeIndex}
          onOpen={(post) => router.push(`/posts/${post.id}`)}
        />
        <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
          {posts.map((p, i) => (
            <span
              key={p.id}
              className={`h-1.5 rounded-full bg-white transition-[width] duration-300 ${i === index ? "w-5" : "w-1.5"}`}
            />
          ))}
        </div>
      </div>

      {lang === "en" ? (
        // 외국인 메인 하단 CTA (Figma 259:7823): 로그인 시트 → 사진 선택 → /write (동작은 송희 담당 ShareKfoodButton)
        <ShareKfoodButton
          className="fixed bottom-[calc(60px+env(safe-area-inset-bottom))] left-1/2 z-10 flex h-[80px] w-[259px] -translate-x-1/2 items-center justify-center rounded-full bg-primary text-[20px] font-extrabold tracking-[-0.4px] whitespace-nowrap text-white drop-shadow-[0_10px_12px_rgba(255,135,196,0.45)] transition-transform active:scale-[0.97]"
        >
          Share your K-food
        </ShareKfoodButton>
      ) : (
        // 하단 CTA (Figma: KF/CTA Pill — 투표 전 Primary, 투표 후 Done)
        <Link
          href={`/posts/${current.id}${voted ? "" : "#vote"}`}
          className={`fixed bottom-[calc(60px+env(safe-area-inset-bottom))] left-1/2 z-10 flex h-[90px] w-[259px] -translate-x-1/2 items-center justify-center rounded-full text-[20px] font-extrabold tracking-[-0.4px] whitespace-nowrap transition-transform active:scale-[0.97] ${
            voted
              ? "bg-white text-background"
              : "bg-primary text-white drop-shadow-[0_10px_12px_rgba(255,135,196,0.45)]"
          }`}
        >
          {voted ? "투표 결과 보기" : "투표하러 가기"}
        </Link>
      )}
    </main>
  );
}
