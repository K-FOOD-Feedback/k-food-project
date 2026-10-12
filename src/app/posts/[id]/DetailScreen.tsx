"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type Ref } from "react";
import { clearCardTransition, peekCardTransition, setReturnTransition, type Box } from "@/app/home/cardTransition";
import { HOME_POSTS, participantsOf, type HomePost } from "@/app/home/mockPosts";
import { ArrowCta } from "@/components/Buttons";
import { HEADER_BUTTON, PageHeader } from "@/components/PageHeader";
import { useMyVote } from "@/app/home/votes";
import { PostMenu } from "@/components/PostMenu";
import { TrackedLink } from "@/components/Track";
import { MY_POST_ID } from "@/lib/write-data";
import { track } from "@/lib/analytics";
import { CommentPile } from "./CommentPile";
import { paperlogy } from "./font";
import { VoteBowl } from "./VoteBowl";

/** 상세 화면 · 한국인 (Figma 263:10329 전체, 263:10251 기기 화면의 플로팅 버튼) */
export function DetailScreen({ post }: { post: HomePost }) {
  const voted = useMyVote(post.id) !== null;
  const voteRef = useRef<HTMLDivElement>(null);
  // 투표 영역을 한 번이라도 봤으면(스크롤 또는 버튼) 플로팅 버튼을 다시 띄우지 않습니다.
  const [seenVote, setSeenVote] = useState(false);

  // ── 분석: 투표·댓글 영역을 봤는지, 얼마나 머물렀는지 (Mixpanel)
  const commentRef = useRef<HTMLDivElement | null>(null);
  const reached = useRef({ vote: false, comments: false });
  const votedRef = useRef(voted);
  useEffect(() => {
    votedRef.current = voted;
  }, [voted]);
  useEffect(() => {
    const seen = reached.current; // 같은 객체를 계속 씀
    const openedAt = performance.now();
    const onScroll = () => {
      const c = commentRef.current;
      if (c && !seen.comments && c.getBoundingClientRect().top < window.innerHeight - 140) {
        seen.comments = true;
        track("comment_section_viewed", { post_id: post.id, voted: votedRef.current });
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      const seconds = Math.round((performance.now() - openedAt) / 100) / 10;
      // 개발 모드에서 effect가 한 번 더 도는 순간(0초)은 빼고 기록
      if (seconds > 0.3)
        track("post_closed", {
          post_id: post.id,
          seconds,
          voted: votedRef.current,
          saw_vote: seen.vote,
          saw_comments: seen.comments,
        });
    };
  }, [post.id]);
  const markVoteSeen = useCallback(
    (via: "scroll" | "cta") => {
      if (reached.current.vote) return;
      reached.current.vote = true;
      track("vote_section_viewed", { post_id: post.id, via });
    },
    [post.id],
  );

  useEffect(() => {
    const el = voteRef.current;
    if (!el) return;
    // 투표 영역 윗부분이 화면 안으로 올라왔으면(이미 지나친 경우 포함) 본 것으로 칩니다.
    // 화면 아래쪽 140px은 플로팅 버튼에 가려지므로 제외합니다.
    // 스크롤 위치로 판단해서, 투표 영역을 한 번에 건너뛰어 내려가도 놓치지 않습니다.
    const check = () => {
      if (el.getBoundingClientRect().top < window.innerHeight - 140) {
        markVoteSeen("scroll");
        setSeenVote(true);
        window.removeEventListener("scroll", check);
      }
    };
    window.addEventListener("scroll", check, { passive: true });
    // 화면이 길어서 처음부터 투표 영역이 보이는 경우
    const frame = requestAnimationFrame(check);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", check);
    };
  }, [markVoteSeen]);

  const goToVote = () => {
    track("vote_cta_clicked", { post_id: post.id });
    markVoteSeen("cta");
    setSeenVote(true);
    voteRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // "한마디를 남겨보세요" 카드가 가끔 살랑 흔들려 써 보라고 알려 줌 (상세 화면만).
  // 카드는 한마디 세션(CommentPile) 담당이라 바깥에서 찾아 움직이고, 쓰는 중(포커스·글 있음)엔 멈춥니다.
  useEffect(() => {
    const label = commentRef.current?.querySelector<HTMLElement>("form > label");
    const input = label?.querySelector("textarea");
    if (!voted || !label || !input) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    label.style.transformOrigin = "50% 70%";
    const wiggle = label.animate(
      [
        { rotate: "0deg" },
        { rotate: "4deg", offset: 0.08 },
        { rotate: "-3deg", offset: 0.16 },
        { rotate: "2deg", offset: 0.24 },
        { rotate: "-1deg", offset: 0.32 },
        { rotate: "0deg", offset: 0.4 },
        { rotate: "0deg" },
      ],
      { duration: WIGGLE_MS, delay: 800, iterations: Infinity, easing: "ease-in-out" },
    );
    const sync = () => {
      if (document.activeElement === input || input.value.trim()) wiggle.pause();
      else wiggle.play();
    };
    input.addEventListener("focus", sync);
    input.addEventListener("blur", sync);
    input.addEventListener("input", sync);
    return () => {
      wiggle.cancel();
      input.removeEventListener("focus", sync);
      input.removeEventListener("blur", sync);
      input.removeEventListener("input", sync);
    };
  }, [voted]);

  const showCta = !voted && !seenVote;


  // 다음 훈수 거리: 메인 카드 순서상 다음 게시글 (마지막이면 처음으로)
  const next = HOME_POSTS[(HOME_POSTS.findIndex((p) => p.id === post.id) + 1) % HOME_POSTS.length];

  // 메인 카드에서 넘어왔으면: 카드 속 사진은 위쪽 사진 영역으로, 카드는 아래쪽 본문 카드로,
  // "00명 참여" 스티커는 참여 칩으로, "투표하러 가기"는 플로팅 "투표하기"로 이어지게 움직입니다. 헤더는 그대로.
  const [intro] = useState(() => peekCardTransition(post.id));
  const [introDone, setIntroDone] = useState(!intro);
  const tileRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLElement>(null);
  const chipRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const photoGhost = useRef<HTMLDivElement>(null);
  const detailPhoto = useRef<HTMLImageElement>(null);
  const cardGhost = useRef<HTMLDivElement>(null);
  const cardGhostText = useRef<HTMLDivElement>(null);
  const chipGhost = useRef<HTMLDivElement>(null);
  const ctaGhost = useRef<HTMLDivElement>(null);
  const fadeIns = useRef<(HTMLElement | null)[]>([]);
  // 전환을 시작할 때 투표 전이었는지 (그때만 "투표하러 가기" → 플로팅 "투표하기"로 이어짐)
  const [ctaIntro] = useState(() => !!intro?.cta && !voted);

  useLayoutEffect(() => {
    if (!intro || !tileRef.current || !articleRef.current || !photoGhost.current || !cardGhost.current) return;
    clearCardTransition();
    window.scrollTo(0, 0);
    const box = (el: Element) => el.getBoundingClientRect();
    const place = (b: Box, radius: string) => ({
      left: `${b.left}px`,
      top: `${b.top}px`,
      width: `${b.width}px`,
      height: `${b.height}px`,
      borderRadius: radius,
    });
    const timing = { duration: INTRO_MS, easing: EASE, fill: "forwards" as const };
    const animations: Animation[] = [
      // 카드(색 배경 + 본문 글)는 아래로 내려가며 본문 카드 크기로 — 글이 처음부터 같이 움직여서 늦게 뜨지 않음
      cardGhost.current.animate([place(intro.card, "34.8px"), place(box(articleRef.current), "32px")], timing),
      // 물결 사진은 위로 올라가며 상세 사진 영역으로 (둥근 모양 → 모서리 둥근 사각형)
      photoGhost.current.animate([place(intro.photo, "45%"), place(box(tileRef.current), "32px")], timing),
    ];
    // 메인 카드 사진에서 상세 첫 사진으로 자연스럽게 바뀜
    if (detailPhoto.current) animations.push(detailPhoto.current.animate([{ opacity: 0 }, { opacity: 1 }], timing));
    if (cardGhostText.current)
      animations.push(cardGhostText.current.animate([{ opacity: 0 }, { opacity: 1, offset: 0.35 }, { opacity: 1 }], timing));
    // "00명 참여" 원형 스티커 → "00명 참여 중!" 알약 칩
    if (intro.sticker && chipGhost.current && chipRef.current) {
      const chip = box(chipRef.current);
      animations.push(
        chipGhost.current.animate(
          [
            { ...place(intro.sticker, "999px"), rotate: "12deg" },
            { ...place(chip, "999px"), rotate: "0deg" },
          ],
          timing,
        ),
      );
    }
    // "투표하러 가기" → 플로팅 "투표하기"
    if (ctaIntro && intro.cta && ctaGhost.current && ctaRef.current) {
      animations.push(ctaGhost.current.animate([place(intro.cta, "999px"), place(box(ctaRef.current), "999px")], timing));
    }
    // 투표·한마디는 뒤따라 살짝 올라오며 나타남 (헤더는 움직이지 않음)
    for (const el of fadeIns.current) {
      if (!el) continue;
      animations.push(
        el.animate([{ opacity: 0, translate: "0 16px" }, { opacity: 1, translate: "0 0" }], {
          duration: 300,
          delay: INTRO_MS * 0.3,
          easing: "ease-out",
          fill: "backwards",
        }),
      );
    }
    animations[1].onfinish = () => setIntroDone(true);
    // 앱이 백그라운드여서 애니메이션 끝 알림이 늦게 와도 전환에 갇히지 않도록 시간으로도 마무리
    const fallback = window.setTimeout(() => setIntroDone(true), INTRO_MS + 150);
    return () => {
      clearTimeout(fallback);
      animations.forEach((a) => a.cancel());
    };
  }, [intro, ctaIntro]);

  // 떠날 때(뒤로 가기 등) 사진·본문 카드·참여 칩 위치를 남겨, 메인 화면이 맨 앞 카드로 이어지게 움직일 수 있게 합니다.
  // 화면이 사라지는 순간에는 Next.js가 이미 스크롤을 맨 위로 돌려 놓아서, 떠나려는 순간(링크·버튼 클릭,
  // 브라우저 뒤로 가기)에 미리 재 둡니다. 그 순간을 못 잡으면 사라질 때 잰 값을 씁니다.
  useLayoutEffect(() => {
    const tile = tileRef.current;
    const article = articleRef.current;
    const chip = chipRef.current;
    const cta = ctaRef.current;
    if (!tile || !article) return;
    // 브라우저 뒤로 가기는 알림(popstate)을 보내기 전에 스크롤을 먼저 맨 위로 되돌려 놓습니다.
    // 그래서 마지막으로 본 스크롤 위치를 따로 기억해 두고, 잴 때 그만큼 빼서 "떠나기 직전 화면 위치"로 맞춥니다.
    let lastScrollY = window.scrollY;
    const onScroll = () => {
      lastScrollY = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    // shift: 지금 스크롤과 떠나기 직전 스크롤의 차이 (브라우저 뒤로 가기일 때만 0이 아님)
    const measure = (shift = 0) => {
      const toBox = (r: DOMRect, dy = shift): Box => ({ left: r.left, top: r.top + dy, width: r.width, height: r.height });
      return {
        postId: post.id,
        photo: toBox(tile.getBoundingClientRect()),
        photoSrc: post.photos[0],
        card: toBox(article.getBoundingClientRect()),
        color: post.color,
        ...(chip && { chip: toBox(chip.getBoundingClientRect()) }),
        // 플로팅 "투표하기"는 화면에 고정이라 스크롤 보정 없이 그대로 (숨어 있으면 넘기지 않음)
        ...(cta?.getAttribute("aria-hidden") === "false" && { cta: toBox(cta.getBoundingClientRect(), 0) }),
      };
    };
    let snapshot: { at: number; value: ReturnType<typeof measure> } | null = null;
    const snap = (shift: number) => {
      snapshot = { at: Date.now(), value: measure(shift) };
      // 메인 화면은 그리기 시작할 때 이 값을 읽으므로, 이 화면이 사라지기 전에 미리 남겨 둡니다.
      setReturnTransition(snapshot.value);
    };
    // 링크·버튼 클릭: 아직 스크롤이 그대로라 지금 위치 그대로
    const onClick = () => snap(0);
    // 브라우저 뒤로 가기: 스크롤이 이미 되돌려졌으므로 마지막으로 본 스크롤만큼 빼서 맞춤
    const onPopState = () => snap(window.scrollY - lastScrollY);
    // 브라우저 뒤로·앞으로: Navigation API의 navigate 알림이 가장 먼저 옴 (이 화면이 아직 그대로일 때).
    // 지원하지 않는 브라우저는 popstate로 (조금 늦지만 스크롤 차이로 보정).
    const navigation = (window as unknown as { navigation?: EventTarget }).navigation;
    const onNavigate = (e: Event) => {
      if ((e as Event & { navigationType?: string }).navigationType === "traverse") snap(window.scrollY - lastScrollY);
    };
    // capture 단계라서 링크 이동·Next.js의 뒤로 가기 처리보다 먼저 잼
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState, true);
    navigation?.addEventListener("navigate", onNavigate);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState, true);
      navigation?.removeEventListener("navigate", onNavigate);
      window.removeEventListener("scroll", onScroll);
      const fresh = snapshot && Date.now() - snapshot.at < 2000 ? snapshot.value : measure();
      setReturnTransition(fresh);
    };
  }, [post.id, post.photos, post.color]);

  // 주소가 #vote로 열리면(예: 투표 안 하고 한마디 전체 화면에 들어왔다가 돌려보내진 경우) 투표 영역을 가운데로.
  // 메인 카드 전환이 있으면 끝난 뒤에 스크롤합니다.
  const hashHandled = useRef(false);
  useEffect(() => {
    if (hashHandled.current || !introDone) return;
    // 다른 화면에서 router로 넘어오면 주소(#vote)가 화면보다 조금 늦게 바뀌고,
    // Next.js도 #vote 위치로 한 번 스크롤(맨 위에 붙임)하므로, 잠시 뒤에 주소를 보고 가운데로 맞춥니다.
    // 주소창에 #vote를 넣고 새로 열면 브라우저가 페이지를 다 불러온 뒤 한 번 더 스크롤하므로, 그 뒤에 맞춥니다.
    let timer = 0;
    const center = () => {
      timer = window.setTimeout(() => {
        hashHandled.current = true;
        if (window.location.hash !== "#vote") return;
        voteRef.current?.scrollIntoView({ block: "center" });
        markVoteSeen("scroll");
        setSeenVote(true);
      }, 150);
    };
    if (document.readyState === "complete") center();
    else window.addEventListener("load", center, { once: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("load", center);
    };
  }, [introDone, markVoteSeen]);

  // 한마디 전체 화면에서 돌아오면: ↗를 눌렀던 스크롤 위치로 돌려 놓고,
  // 화면에 보이는 카드들이 위에서부터 하나씩 살짝 떠오르며 나타납니다.
  const [backTrip] = useState(() =>
    !intro && commentsTrip?.postId === post.id && Date.now() - commentsTrip.at < TRIP_TTL_MS ? commentsTrip : null,
  );
  const contentRef = useRef<HTMLDivElement>(null);

  // ↗(한마디 전체 보기)를 누를 때 지금 스크롤 위치를 남김 (링크는 한마디 세션의 CommentPile 안이라 바깥에서 잡음)
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.("a");
      if (link?.getAttribute("href") === `/posts/${post.id}/comments`) {
        commentsTrip = { postId: post.id, scrollY: window.scrollY, at: Date.now() };
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [post.id]);

  useLayoutEffect(() => {
    commentsTrip = null;
    const content = contentRef.current;
    if (!backTrip || !content) return;
    window.scrollTo(0, backTrip.scrollY);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // 카드 단위: 본문의 각 칸 + 한마디 묶음은 칸·이모지·입력을 따로
    const comments = commentRef.current;
    const cards = [...content.children].flatMap((el) =>
      el === comments ? [...el.querySelectorAll(":scope > div > div > *")] : [el],
    );
    const visible = cards.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.bottom > 0 && r.top < window.innerHeight && r.height > 0;
    });
    const anims = visible.map((el, i) =>
      el.animate(
        [
          { opacity: 0, transform: "translateY(16px)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: BACK_CARD_MS, delay: i * BACK_STAGGER_MS, easing: EASE, fill: "backwards" },
      ),
    );
    // Next.js가 새 화면을 맨 위로 올렸으면 다시 제자리로
    const raf = requestAnimationFrame(() => {
      if (Math.abs(window.scrollY - backTrip.scrollY) > 1) window.scrollTo(0, backTrip.scrollY);
    });
    return () => {
      cancelAnimationFrame(raf);
      anims.forEach((a) => a.cancel());
    };
  }, [backTrip]);

  const hiddenUntilIntro = intro && !introDone ? "invisible" : "";

  return (
    <main
      className={`${paperlogy.variable} relative mx-auto min-h-dvh w-full max-w-[430px] overflow-x-clip bg-background text-on-dark`}
    >
      {/* 공통 상단 바 (src/components/PageHeader — 모든 화면이 같은 위치·크기·디자인) */}
      <PageHeader
        left={
          <Link href="/home" className={HEADER_BUTTON} aria-label="뒤로 가기">
            <ChevronLeftIcon />
          </Link>
        }
        right={
          <>
            <TrackedLink href="/" event="language_clicked" props={{ from: "detail" }} className={HEADER_BUTTON} aria-label="언어 선택">
              {/* eslint-disable-next-line @next/next/no-img-element -- 작은 SVG 아이콘 */}
              <img src="/images/icon-world.svg" width={24} height={24} alt="" />
            </TrackedLink>
            {/* 더보기 메뉴 (송희 PostMenu) — 내 글이면 수정·삭제, 남의 글이면 링크 복사·신고 */}
            <PostMenu
              postId={post.id}
              isMine={post.id === MY_POST_ID}
              className={HEADER_BUTTON}
              onOpen={() => track("post_more_clicked", { post_id: post.id })}
            >
              <MoreIcon />
            </PostMenu>
          </>
        }
      />

      <div ref={contentRef} className="flex flex-col gap-1 px-2 pb-[calc(40px+env(safe-area-inset-bottom))]">
        <div ref={tileRef} className={hiddenUntilIntro}>
          <PhotoTile
            postId={post.id}
            photos={post.photos}
            participants={participantsOf(post)}
            title={post.title}
            chipRef={chipRef}
            hideChip={!!intro?.sticker && !introDone}
          />
        </div>

        <article
          ref={articleRef}
          className={`flex flex-col gap-5 rounded-[32px] px-7 py-[30px] text-on-light ${hiddenUntilIntro}`}
          style={{ background: post.color }}
        >
          <ArticleBody post={post} />
        </article>

        <div
          ref={(el) => {
            voteRef.current = el;
            fadeIns.current[0] = el;
          }}
        >
          <VoteBowl post={post} />
        </div>

        <div
          className="relative"
          ref={(el) => {
            fadeIns.current[1] = el;
            commentRef.current = el;
          }}
        >
          {/*
            투표 전에는 이모지·한마디 입력 카드를 숨기고(투표하면 나타남), 한마디 칸은 잠금 레이어로 덮어 누를 수 없게(inert) 합니다.
            (CommentPile은 한마디 세션 담당이라 안을 고치지 않고 바깥에서 감쌉니다 — 칸(section) 아래 요소들만 숨김)
          */}
          <div
            inert={!voted}
            className={
              voted
                ? "[&>div>*:not(section)]:transition-opacity [&>div>*:not(section)]:duration-500 [&>div>*:not(section)]:starting:opacity-0"
                : "[&>div>*:not(section)]:hidden"
            }
          >
            <CommentPile postId={post.id} commentCount={post.commentCount} authorFlag={post.author.flag} />
          </div>
          <CommentLock locked={!voted} onVote={goToVote} />
        </div>

        {/* 화면 맨 아래 "다음 훈수 거리" (Figma 332:3426 Question CTA) — 떠 있지 않고 내용 끝에 놓임 */}
        <div className="mt-[46px]">
          <ArrowCta
            href={`/posts/${next.id}`}
            caption="다음 훈수 거리"
            title={next.title}
            onClick={() => track("post_opened", { post_id: next.id, from: "next", from_post_id: post.id })}
          />
        </div>
      </div>


      {/* 메인 카드 → 상세 전환용 (끝나면 사라지고 진짜 사진·본문 카드가 보임) */}
      {intro && !introDone && (
        <>
          <div
            ref={cardGhost}
            aria-hidden
            className="pointer-events-none fixed z-30 overflow-hidden"
            style={{ ...boxStyle(intro.card), borderRadius: 34.8, background: intro.color }}
          >
            {/* 진짜 본문 카드와 같은 글을 같이 실어 나름 (도착하면 그대로 이어짐) */}
            <div ref={cardGhostText} className="flex flex-col gap-5 px-7 py-[30px] text-on-light">
              <ArticleBody post={post} />
            </div>
          </div>
          <div
            ref={photoGhost}
            aria-hidden
            className="pointer-events-none fixed z-30 overflow-hidden"
            style={{ ...boxStyle(intro.photo), borderRadius: "45%" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- 전환용 사진 */}
            <img src={intro.cardPhoto} alt="" className="absolute inset-0 size-full object-cover" />
            {/* eslint-disable-next-line @next/next/no-img-element -- 전환용 사진 */}
            <img ref={detailPhoto} src={post.photos[0]} alt="" className="absolute inset-0 size-full object-cover opacity-0" />
          </div>
          {intro.sticker && (
            <div
              ref={chipGhost}
              aria-hidden
              className="pointer-events-none fixed z-30 flex items-center justify-center overflow-hidden bg-black text-[16px] leading-[1.5] font-semibold whitespace-nowrap text-white"
              style={{ ...boxStyle(intro.sticker), borderRadius: 999 }}
            >
              {participantsOf(post)}명 참여 중!
            </div>
          )}
          {ctaIntro && intro.cta && (
            <div
              ref={ctaGhost}
              aria-hidden
              className="pointer-events-none fixed z-30 flex items-center justify-center overflow-hidden rounded-full bg-primary text-[20px] leading-none font-extrabold tracking-[-0.4px] whitespace-nowrap text-white"
              style={boxStyle(intro.cta)}
            >
              투표하기
            </div>
          )}
        </>
      )}

      {/* 플로팅 "투표하기" (Figma: Floating CTA (viewport)) */}
      <button
        ref={ctaRef}
        type="button"
        onClick={goToVote}
        tabIndex={showCta ? 0 : -1}
        aria-hidden={!showCta}
        className={`fixed bottom-[calc(40px+env(safe-area-inset-bottom))] left-1/2 z-20 -translate-x-1/2 rounded-full bg-primary px-8 py-6 text-[20px] leading-none font-extrabold tracking-[-0.4px] whitespace-nowrap text-white shadow-[0_18px_48px_4px_rgba(0,0,0,0.55),0_10px_24px_-6px_rgba(255,135,196,0.55)] transition-[opacity,translate,scale] duration-300 active:scale-95 ${
          showCta ? "opacity-100" : "pointer-events-none translate-y-6 opacity-0"
        } ${ctaIntro && !introDone ? "invisible" : ""}`}
      >
        투표하기
      </button>
    </main>
  );
}

/**
  투표 전에는 한마디 칸(위쪽 362px) 위에 잠금 레이어를 덮습니다 (Figma 333:4130 layer_lock).
  한마디 칸 자체는 한마디 세션 담당(CommentPile)이라, 상세 화면에서 위에 겹쳐 올립니다.
*/
function CommentLock({ locked, onVote }: { locked: boolean; onVote: () => void }) {
  return (
    <div
      aria-hidden={!locked}
      className={`absolute inset-x-0 top-0 z-10 flex h-[362px] items-center justify-center overflow-hidden rounded-[32px] bg-background/50 backdrop-blur-[8px] transition-opacity duration-500 ${
        locked ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div className="flex w-[178px] flex-col items-center gap-[30px]">
        <div className="flex flex-col items-center gap-5">
          <span className="flex size-[60px] items-center justify-center rounded-full bg-[#292929]">
            {/* eslint-disable-next-line @next/next/no-img-element -- 작은 SVG 아이콘 */}
            <img src="/images/icon-lock.svg" width={32} height={32} alt="" />
          </span>
          <p className="text-center text-[20px] leading-[1.45] font-extrabold tracking-[-0.4px] whitespace-nowrap text-white">
            투표하고 다른 사람들과
            <br />
            한마디를 나눠보세요!
          </p>
        </div>
        <button
          type="button"
          onClick={onVote}
          tabIndex={locked ? 0 : -1}
          className="rounded-full bg-primary px-5 py-3.5 text-[18px] leading-[1.45] font-extrabold tracking-[-0.36px] text-white transition-transform active:scale-95"
        >
          투표하기
        </button>
      </div>
    </div>
  );
}

const INTRO_MS = 420;
// 한마디 전체 화면에 다녀오는 중 (↗를 누를 때 남김 → 상세로 돌아와 그려질 때 씀). 화면을 바꿔도 남는 모듈 값.
let commentsTrip: { postId: string; scrollY: number; at: number } | null = null;
const TRIP_TTL_MS = 30 * 60_000;
const BACK_CARD_MS = 320;
// 한마디 입력 카드 흔들기 한 번의 길이 (앞 40%만 흔들고 나머지는 쉼)
const WIGGLE_MS = 2600;
const BACK_STAGGER_MS = 70;
const EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";

/** 본문 카드 안 글 (진짜 카드와 전환용 카드가 같은 모양을 쓰도록) */
function ArticleBody({ post }: { post: HomePost }) {
  return (
    <>
      <p className="text-[14px] leading-none font-medium tracking-[-0.28px] text-[#696969]">from. {post.author.country}</p>
      <h1 className="max-w-[204px] font-(family-name:--font-paperlogy) text-[31px] leading-[1.2] tracking-[-0.62px] break-keep">
        {post.title}
      </h1>
      <p className="text-[16px] leading-[1.55] font-medium tracking-[-0.32px] whitespace-pre-line text-[#444]">{post.body}</p>
    </>
  );
}
const boxStyle = (b: Box) => ({ left: b.left, top: b.top, width: b.width, height: b.height });

/** 사진 넘겨 보기 + 참여 인원 칩 (Figma: Tile/Photo) */
function PhotoTile({
  postId,
  photos,
  participants,
  title,
  chipRef,
  hideChip = false,
}: {
  postId: string;
  photos: string[];
  participants: number;
  title: string;
  chipRef?: Ref<HTMLParagraphElement>;
  /** 메인 카드 스티커에서 이어지는 전환 중에는 숨김 */
  hideChip?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const furthest = useRef(0); // 분석: 몇 번째 사진까지 봤는지
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-[32px] border border-black/4 bg-[#1e1e1e]">
      <div
        className="flex size-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={(e) => {
          const el = e.currentTarget;
          const next = Math.round(el.scrollLeft / el.clientWidth);
          setIndex(next);
          if (next > furthest.current) {
            furthest.current = next;
            track("photo_swiped", { post_id: postId, index: next, total: photos.length });
          }
        }}
      >
        {photos.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- 업로드한 사진(blob/외부 URL)도 그대로 보여 줘야 해서 img 사용
          <img
            key={i}
            src={src}
            alt={i === 0 ? title : ""}
            draggable={false}
            className="size-full shrink-0 snap-center object-cover"
          />
        ))}
      </div>
      <p
        ref={chipRef}
        className={`absolute top-[19px] left-[19px] rounded-full bg-black px-3 py-1.5 text-[16px] leading-[1.5] font-semibold text-white ${
          hideChip ? "invisible" : ""
        }`}
      >
        {participants}명 참여 중!
      </p>
      {photos.length > 1 && (
        <div className="absolute bottom-[13px] left-1/2 flex -translate-x-1/2 gap-1.5" aria-hidden>
          {photos.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-[width] duration-300 ${i === index ? "w-[18px] bg-white" : "w-1.5 bg-white/50"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Lucide chevron-left (MIT)
function ChevronLeftIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

// Lucide ellipsis (MIT)
function MoreIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  );
}
