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
import {
  CARD_BOTTOM,
  CARD_TOP,
  CardStack,
  cardMaskBox,
  cardPhotoOf,
  type Lang,
} from "./CardStack";
import { cardShapeAt } from "./cardShapes";
import { MainHeader } from "./MainHeader";
import { ReturnGhosts } from "./ReturnTransition";
import { HOME_POSTS, type HomePost } from "./mockPosts";
import { useVotedIds } from "./votes";
import { useViewerLang } from "../posts/[id]/viewerLang";

/** 메인 상단 두 줄 — 참여를 부르는 한마디 (한국인: 참견하러 오세요 / 외국인: 한식 올려 보세요) */
const HEADLINE = {
  ko: ["외국인 친구가 만든 한식,", "참견할 준비 됐나요? 👀"],
  en: ["Cooked some K-food?", "Let Koreans judge it 👀"],
} as const;

/** 제목 아래끝 ~ 맨 앞 카드 위끝 간격 */
const TITLE_GAP = 40;
/** 두 줄 한마디 높이 (24px × 한국어 행간 1.3 × 2줄) — 두 버전 카드 크기를 같게 계산하려고 고정값으로 */
const HEADLINE_H = 24 * 1.3 * 2;

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

  // 제목 + (40px) + 카드를 한 덩어리로 가운데에.
  // - 한국인: 헤더까지 포함한 화면 전체 높이의 가운데 (위로 헤더, 아래로 여백에 닿지 않게)
  // - 외국인: 헤더 아래 ~ 하단 버튼 위 공간의 가운데
  // 카드 크기는 두 버전이 같도록, 두 경우 중 더 좁은 쪽에 맞춰 줄임 (스크롤 없음)
  const stage = useRef<HTMLDivElement>(null);
  const headerBox = useRef<HTMLDivElement>(null);
  const koLimit = useRef<HTMLDivElement>(null);
  const enLimit = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<number | null>(null);
  const [headerH, setHeaderH] = useState(0);
  useLayoutEffect(() => {
    const main = stage.current?.closest("main");
    const top = headerBox.current;
    const ko = koLimit.current;
    const en = enLimit.current;
    if (!main || !top || !ko || !en) return;
    const measure = () => {
      const vh = main.clientHeight;
      const header = top.offsetHeight;
      const roomKo = 2 * Math.min(vh / 2 - header, ko.offsetTop - vh / 2);
      const roomEn = en.offsetTop - header;
      // 카드 더미 틀 맨 위엔 뒤 카드 자리(CARD_TOP)가 있어서, 보이는 카드까지 40px이 되도록 그만큼은 간격에 겹쳐 씀
      const room = Math.min(roomKo, roomEn);
      setHeaderH(header);
      setFit(
        Math.min(1, (room - HEADLINE_H - TITLE_GAP) / (CARD_BOTTOM - CARD_TOP)),
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(main);
    ro.observe(top);
    return () => ro.disconnect();
  }, []);
  const scale = fit ?? 1;

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
      {/* 헤더는 위에 떠 있고, 내용은 헤더 포함 화면 전체 높이의 가운데에 */}
      <div ref={headerBox} className="absolute inset-x-0 top-0 z-20">
        <MainHeader lang={lang} />
      </div>
      {/* 아래 자리 재기용 (보이지 않음): 한국인은 여백만, 외국인은 하단 버튼 자리 — 두 버전 카드 크기를 같게 맞추려고 둘 다 잼 */}
      <div
        ref={koLimit}
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[calc(24px+env(safe-area-inset-bottom))]"
      />
      <div
        ref={enLimit}
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[calc(166px+env(safe-area-inset-bottom))]"
      />
      <div className="relative min-h-0 flex-1">
        <div
          ref={stage}
          className={`absolute inset-x-0 flex flex-col items-center justify-center ${
            lang === "en"
              ? "bottom-[calc(166px+env(safe-area-inset-bottom))]"
              : "bottom-0"
          }`}
          style={{ top: lang === "en" ? headerH : 0 }}
        >
          {/* 두 줄 한마디 (가운데 정렬) */}
          <h1
            className={`shrink-0 px-6 text-center text-[24px] tracking-[-0.48px] text-white break-keep ${
              lang === "en"
                ? "font-title-en leading-[1.15]"
                : "font-(family-name:--font-paperlogy) leading-[1.3]"
            }`}
          >
            {HEADLINE[lang].map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h1>
          <div
            className="shrink-0"
            style={{
              height: CARD_BOTTOM * scale,
              marginTop: TITLE_GAP - CARD_TOP * scale,
            }}
          >
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

      {lang === "en" && (
        // 외국인 메인 하단 CTA (Figma 259:7823): 로그인 시트 → 사진 선택 → /write (동작은 송희 담당 ShareKfoodButton)
        <ShareKfoodButton className="fixed bottom-[calc(60px+env(safe-area-inset-bottom))] left-1/2 z-10 flex h-[80px] w-[259px] -translate-x-1/2 items-center justify-center rounded-full bg-primary text-[20px] font-extrabold tracking-[-0.4px] whitespace-nowrap text-white drop-shadow-[0_10px_12px_rgba(255,135,196,0.45)] transition-transform active:scale-[0.97]">
          Share your K-food
        </ShareKfoodButton>
      )}
    </main>
  );
}
