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
  DECK_HALF_WIDTH,
  cardMaskBox,
  cardPhotoOf,
  type Lang,
} from "./CardStack";
import { cardShapeAt } from "./cardShapes";
import { MainHeader } from "./MainHeader";
import { ReturnGhosts } from "./ReturnTransition";
import { HOME_POSTS, type HomePost } from "./mockPosts";
import { useVotedIds } from "./votes";
import { titleFont } from "../posts/[id]/font";
import { useKoreanUiLang, useViewerUiLang } from "../posts/[id]/viewerLang";
import { useDocLang } from "@/lib/docLang";
import { useAutoTranslate } from "@/components/LanguagePicker";
import { useMt } from "@/lib/useMt";

/** 메인 상단 두 줄 — 참여를 부르는 한마디. [버전][화면 언어]
    한국인 버전: 참견하러 오세요 / 외국인 버전: 한식 올려 보세요 — 지구본으로 언어를 바꾸면 같은 뜻으로 바뀜 */
const HEADLINE = {
  ko: {
    ko: ["외국인 친구가 만든 한식,", "참견할 준비 됐나요? 👀"],
    en: ["K-food by friends abroad,", "Ready to weigh in? 👀"],
    zh: ["外国朋友做的韩食，", "准备好来点评了吗？👀"],
    zht: ["外國朋友做的韓食，", "準備好來點評了嗎？👀"],
    ja: ["海外の友だちが作った韓国料理、", "ひとこと言う準備はできましたか？👀"],
  },
  en: {
    en: ["Cooked some K-food?", "Let Koreans judge it 👀"],
    ko: ["한식 만들어 봤나요?", "한국인에게 평가받아 봐요 👀"],
    zh: ["做了韩食吗？", "让韩国人来评价吧 👀"],
    zht: ["做了韓食嗎？", "讓韓國人來評價吧 👀"],
    ja: ["韓国料理、作ってみましたか？", "韓国人に判定してもらいましょう 👀"],
  },
} as const;
/** 외국인 버전 하단 버튼 문구 (화면 언어) */
const SHARE_LABEL = {
  en: "Share your K-food",
  ko: "내 한식 공유하기",
  zh: "分享你的韩食",
  zht: "分享你的韓食",
  ja: "あなたの韓国料理をシェア",
} as const;

/** 제목 아래끝 ~ 맨 앞 카드 위끝 간격 */
const TITLE_GAP = 24;
/** 카드 최대 크기 (Figma 카드 대비) */
const MAX_SCALE = 1.2;
/** 두 줄 한마디 높이 (24px × 행간 1.4(모든 언어 같음) × 2줄) — 두 버전 카드 크기를 같게 계산하려고 고정값으로 */
const HEADLINE_H = 24 * 1.4 * 2;

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

export function HomeScreen({ lang = "ko" }: { lang?: "ko" | "en" }) {
  useMt();
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
  // lang = 버전(한국인 /home · 외국인 /home?lang=en, 로그인 정보로 정해짐 — 지구본으로 바뀌지 않음)
  // ui = 화면 언어 (지구본으로 고름, 상세·한마디와 같은 기억: 외국인 기본 영어 · 한국인 기본 한국어)
  // content = 글(제목) 언어 — 자동 번역이 켜져 있으면 화면 언어, 꺼져 있으면 원문(글쓴이 언어 = 영어). 상세와 같은 규칙
  const viewerLang = useViewerUiLang();
  const koreanLang = useKoreanUiLang();
  const ui: Lang = lang === "en" ? viewerLang : koreanLang;
  // 화면 언어별 본문 글꼴 (영어 Inter · 일본어 M PLUS 2 · 중국어 MiSans)
  useDocLang(ui);
  const autoTranslate = useAutoTranslate();
  const content: Lang = autoTranslate ? ui : "en";
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
      // 카드는 Figma보다 1.2배까지 키우되, 양옆 뒤 카드까지 화면 폭 안에 다 들어가고(잘리지 않게) 위아래 공간에 들어가는 만큼만
      setFit(
        Math.min(
          MAX_SCALE,
          (main.clientWidth / 2 - 4) / DECK_HALF_WIDTH,
          (room - HEADLINE_H - TITLE_GAP) / (CARD_BOTTOM - CARD_TOP),
        ),
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
    // 화면에 고정해 페이지 자체가 스크롤되지 않게 (모바일 주소창·툴바가 오르내려도 화면 높이에 꽉)
    <main className="fixed inset-0 mx-auto flex w-full max-w-[430px] flex-col overflow-hidden overscroll-none bg-background text-on-dark">
      {/* 헤더는 위에 떠 있고, 내용은 헤더 포함 화면 전체 높이의 가운데에 */}
      <div ref={headerBox} className="absolute inset-x-0 top-0 z-20">
        <MainHeader version={lang} lang={ui} />
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
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[calc(124px+env(safe-area-inset-bottom))]"
      />
      <div className="relative min-h-0 flex-1">
        <div
          ref={stage}
          className={`absolute inset-x-0 flex flex-col items-center justify-center ${
            lang === "en"
              ? "bottom-[calc(124px+env(safe-area-inset-bottom))]"
              : "bottom-0"
          }`}
          // 화면 크기를 재기 전(첫 그림)엔 감춰 둠 — 원래 크기로 그려졌다 줄어들며 헤더와 겹쳐 보이는 것 방지
          style={{
            top: lang === "en" ? headerH : 0,
            visibility: fit === null ? "hidden" : undefined,
          }}
        >
          {/* 두 줄 한마디 (가운데 정렬) */}
          <h1
            className={`shrink-0 px-6 text-center text-[24px] tracking-[-0.48px] text-white break-keep ${
              ui === "en"
                ? "font-title-en leading-[1.4]"
                : ui === "ko"
                  ? "font-(family-name:--font-paperlogy) leading-[1.4]"
                  : `leading-[1.4] ${titleFont(ui)}`
            }`}
          >
            {HEADLINE[lang][ui].map((line) => (
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
                lang={ui}
                contentLang={content}
                viewer={viewer}
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
          uiLang={ui}
          contentLang={content}
          onDone={() => setReturning(null)}
        />
      )}

      {lang === "en" && (
        // 외국인 메인 하단 CTA (Figma 259:7823): 로그인 시트 → 사진 선택 → /write (동작은 송희 담당 ShareKfoodButton)
        // 영어 문구는 Figtree(font-display), 중국어 MiSans · 일본어 M PLUS 2, 한국어는 기본 글꼴
        <ShareKfoodButton
          className={`fixed bottom-[calc(40px+env(safe-area-inset-bottom))] left-1/2 z-10 -translate-x-1/2 rounded-full bg-primary px-8 py-6 text-[20px] leading-none font-extrabold tracking-[-0.4px] whitespace-nowrap text-white shadow-[0_18px_48px_4px_rgba(0,0,0,0.55),0_10px_24px_-6px_rgba(255,135,196,0.55)] transition-transform active:scale-95 ${
            ui === "en" ? "font-display" : ui === "ko" ? "" : titleFont(ui)
          }`}
        >
          {SHARE_LABEL[ui]}
        </ShareKfoodButton>
      )}
    </main>
  );
}
