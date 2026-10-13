"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ShareKfoodButton } from "@/components/ShareKfoodButton";
import { track, useTrackOnce } from "@/lib/analytics";
import {
  measureCard,
  peekReturnTransition,
  setCardTransition,
} from "./cardTransition";
import { CardStack, cardMaskBox, cardPhotoOf, type Lang } from "./CardStack";
import { cardShapeAt } from "./cardShapes";
import { MainHeader } from "./MainHeader";
import { ReturnGhosts } from "./ReturnTransition";
import { HOME_POSTS, type HomePost } from "./mockPosts";
import { useVotedIds } from "./votes";
import { useViewerLang } from "../posts/[id]/viewerLang";

/** 카드 더미(CardStack) 원래 높이 — 화면이 낮으면 이 높이가 들어가도록 통째로 줄임 */
const STACK_HEIGHT = 480;

// 상세에 다녀와도 보던 카드에서 다시 시작하도록 기억해 둡니다 (새로고침하면 처음부터).
let lastIndex = 0;

// 한 번 풀어 둔 사진을 붙잡아 두어(브라우저가 버리지 않게) 다음에 같은 사진을 그릴 때 바로 그려지게 합니다.
const decoded = new Map<string, HTMLImageElement>();
function decodePhoto(src: string) {
  if (!src || decoded.has(src)) return;
  const img = new Image();
  img.src = src;
  decoded.set(src, img);
  img.decode().catch(() => decoded.delete(src));
}

export function HomeScreen({ lang = "ko" }: { lang?: Lang }) {
  const router = useRouter();
  const posts = HOME_POSTS;
  const [index, setIndex] = useState(() =>
    Math.min(lastIndex, posts.length - 1),
  );
  // 상세에서 뒤로 돌아왔으면: 상세의 사진·본문 카드·참여 칩이 맨 앞 카드로 줄어들며 돌아옵니다.
  const [returning, setReturning] = useState(() => {
    const t = peekReturnTransition();
    return t && t.postId === posts[Math.min(lastIndex, posts.length - 1)].id
      ? t
      : null;
  });
  const votedIds = useVotedIds();
  // 상세에서 돌아오는 전환의 상세 글 언어: 한국인 메인이면 늘 한국어, 외국인 메인이면 상세에서 고른 언어(기본 영어)
  const viewerLang = useViewerLang();
  const detailLang = lang === "en" ? viewerLang : "ko";
  const current = posts[index];

  // 화면 높이에 맞추기: 헤더와 하단 버튼 사이 빈 칸에 카드 더미가 다 들어가도록, 모자라면 통째로 줄임 (스크롤 없음)
  const stage = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const measure = () => setFit(Math.min(1, el.clientHeight / STACK_HEIGHT));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = fit ?? 1;
  const voted = votedIds.has(current.id);

  const changeIndex = (next: number) => {
    lastIndex = next;
    setIndex(next);
  };

  // 상세 화면을 미리 받아 두어, 카드를 누르면 바로 전환이 시작되게 합니다.
  useEffect(() => {
    for (const p of posts) router.prefetch(`/posts/${p.id}`);
  }, [router, posts]);

  // 카드 사진(= 상세 첫 사진)을 미리 풀어 두어, 상세에서 돌아오는 전환의 사진이 처음 한 장면부터 바로 그려지게 합니다
  // (풀리기 전에 그려지면 그 순간 사진 자리가 비어 깜빡여 보임)
  useEffect(() => {
    for (const p of posts) decodePhoto(cardPhotoOf(p));
  }, [posts]);

  /** 카드·CTA 어느 쪽으로 가든, 맨 앞 카드에서 상세 화면으로 이어지는 전환과 함께 상세 맨 위로 이동합니다. */
  const viewer = lang === "en" ? "foreigner" : "korean";
  useTrackOnce("feed_viewed", { viewer, posts: posts.length });

  const openPost = (
    post: HomePost,
    cardEl: Element | null,
    from: "card" | "cta" = "card",
  ) => {
    track("post_opened", {
      post_id: post.id,
      from,
      viewer,
      position: posts.indexOf(post),
      already_voted: votedIds.has(post.id),
    });
    const shape = cardShapeAt(posts.indexOf(post));
    if (cardEl)
      setCardTransition({
        postId: post.id,
        ...measureCard(cardEl, cardMaskBox(shape.scale * scale)),
        cardPhoto: cardPhotoOf(post),
        photoMask: shape.mask,
        color: post.color,
      });
    // 외국인 메인에서 열면 상세의 ← 가 외국인 메인으로 (src/lib/back.ts)
    router.push(
      lang === "en" ? `/posts/${post.id}?from=home-en` : `/posts/${post.id}`,
    );
  };

  return (
    // 랜딩(src/app/page.tsx)과 같은 틀: 가운데 430px 폭의 어두운 화면
    <main className="relative mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-background text-on-dark">
      <MainHeader lang={lang} />
      {/* 헤더 아래 ~ 하단 버튼 위: 카드 더미를 가운데에 (화면이 낮으면 줄여서) */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={stage}
          className="absolute inset-x-0 top-0 bottom-[calc(166px+env(safe-area-inset-bottom))] flex items-center justify-center"
        >
          <div style={{ height: STACK_HEIGHT * scale }}>
            <div style={{ scale, transformOrigin: "top center" }}>
              <CardStack
                lang={lang}
                posts={posts}
                index={index}
                votedIds={votedIds}
                onIndexChange={changeIndex}
                onOpen={openPost}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 화면 크기를 잰 뒤에 시작 (카드가 줄어든 크기 기준으로 자리를 잡아야 해서) */}
      {returning && fit !== null && (
        <ReturnGhosts
          transition={returning}
          post={current}
          shape={cardShapeAt(index)}
          fit={scale}
          detailLang={detailLang}
          onDone={() => setReturning(null)}
        />
      )}

      {lang === "en" ? (
        // 외국인 메인 하단 CTA (Figma 259:7823): 로그인 시트 → 사진 선택 → /write (동작은 송희 담당 ShareKfoodButton)
        <ShareKfoodButton className="fixed bottom-[calc(60px+env(safe-area-inset-bottom))] left-1/2 z-10 flex h-[80px] w-[259px] -translate-x-1/2 items-center justify-center rounded-full bg-primary text-[20px] font-extrabold tracking-[-0.4px] whitespace-nowrap text-white drop-shadow-[0_10px_12px_rgba(255,135,196,0.45)] transition-transform active:scale-[0.97]">
          Share your K-food
        </ShareKfoodButton>
      ) : (
        // 하단 CTA (Figma: KF/CTA Pill — 투표 전 Primary, 투표 후 Done)
        <button
          type="button"
          data-main-cta
          onClick={() => {
            track("feed_cta_clicked", { post_id: current.id, voted });
            openPost(
              current,
              document.querySelector("[data-front-card]"),
              "cta",
            );
          }}
          className={`fixed bottom-[calc(60px+env(safe-area-inset-bottom))] left-1/2 z-10 flex h-[90px] w-[259px] -translate-x-1/2 items-center justify-center rounded-full text-[20px] font-extrabold tracking-[-0.4px] whitespace-nowrap transition-transform active:scale-[0.97] ${
            voted
              ? "bg-white text-background"
              : "bg-primary text-white drop-shadow-[0_10px_12px_rgba(255,135,196,0.45)]"
          }`}
        >
          {voted ? "투표 결과 보기" : "투표하러 가기"}
        </button>
      )}
    </main>
  );
}
