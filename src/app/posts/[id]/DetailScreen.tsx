"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { clearCardTransition, peekCardTransition, type Box } from "@/app/home/cardTransition";
import { HOME_POSTS, participantsOf, type HomePost } from "@/app/home/mockPosts";
import { ArrowCta } from "@/components/Buttons";
import { useMyVote } from "@/app/home/votes";
import { TrackedLink } from "@/components/Track";
import { track } from "@/lib/analytics";
import { CommentPile } from "./CommentPile";
import { paperlogy } from "./font";
import { VoteBowl } from "./VoteBowl";

const circle = "flex size-16 shrink-0 items-center justify-center rounded-full bg-white/8";

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

  const showCta = !voted && !seenVote;


  // 다음 훈수 거리: 메인 카드 순서상 다음 게시글 (마지막이면 처음으로)
  const next = HOME_POSTS[(HOME_POSTS.findIndex((p) => p.id === post.id) + 1) % HOME_POSTS.length];

  // 메인 카드에서 넘어왔으면: 카드 속 사진은 위쪽 사진 영역으로, 카드는 아래쪽 본문 카드로 이어지게 움직입니다.
  const [intro] = useState(() => peekCardTransition(post.id));
  const [introDone, setIntroDone] = useState(!intro);
  const tileRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLElement>(null);
  const photoGhost = useRef<HTMLDivElement>(null);
  const detailPhoto = useRef<HTMLImageElement>(null);
  const cardGhost = useRef<HTMLDivElement>(null);
  const fadeIns = useRef<(HTMLElement | null)[]>([]);

  useLayoutEffect(() => {
    if (!intro || !tileRef.current || !articleRef.current || !photoGhost.current || !cardGhost.current) return;
    clearCardTransition();
    window.scrollTo(0, 0);
    const tile = tileRef.current.getBoundingClientRect();
    const article = articleRef.current.getBoundingClientRect();
    const place = (b: Box, radius: string) => ({
      left: `${b.left}px`,
      top: `${b.top}px`,
      width: `${b.width}px`,
      height: `${b.height}px`,
      borderRadius: radius,
    });
    const timing = { duration: INTRO_MS, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)", fill: "forwards" as const };
    const animations = [
      // 카드(색 배경)는 아래로 내려가며 본문 카드 크기로
      cardGhost.current.animate([place(intro.card, "34.8px"), place(article, "32px")], timing),
      // 물결 사진은 위로 올라가며 상세 사진 영역으로 (둥근 모양 → 모서리 둥근 사각형)
      photoGhost.current.animate([place(intro.photo, "45%"), place(tile, "32px")], timing),
      // 메인 카드 사진에서 상세 첫 사진으로 자연스럽게 바뀜
      ...(detailPhoto.current ? [detailPhoto.current.animate([{ opacity: 0 }, { opacity: 0, offset: 0.35 }, { opacity: 1 }], timing)] : []),
      // 상단 버튼·투표·댓글은 뒤따라 살짝 올라오며 나타남
      ...fadeIns.current.flatMap((el) =>
        el
          ? [
              el.animate([{ opacity: 0, translate: "0 16px" }, { opacity: 1, translate: "0 0" }], {
                duration: 380,
                delay: INTRO_MS * 0.45,
                easing: "ease-out",
                fill: "backwards",
              }),
            ]
          : [],
      ),
    ];
    animations[1].onfinish = () => setIntroDone(true);
    return () => animations.forEach((a) => a.cancel());
  }, [intro]);

  // 전환이 끝나 진짜 본문 카드가 보이면, 글자만 살짝 나타나게 (배경색은 이미 같은 자리에 있었으므로)
  useLayoutEffect(() => {
    if (!intro || !introDone) return;
    for (const child of Array.from(articleRef.current?.children ?? [])) {
      child.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: "ease-out" });
    }
  }, [intro, introDone]);

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

  const hiddenUntilIntro = intro && !introDone ? "invisible" : "";

  return (
    <main
      className={`${paperlogy.variable} relative mx-auto min-h-dvh w-full max-w-[430px] overflow-x-clip bg-background text-on-dark`}
    >
      <header
        ref={(el) => {
          fadeIns.current[0] = el;
        }}
        // 스크롤해도 상단 고정 (송희) — 바탕 없이 버튼만 떠 있음. 빈 곳은 터치가 아래 내용으로 통과
        className="pointer-events-none sticky top-0 z-30 flex items-center justify-between px-2 pt-[calc(16px+env(safe-area-inset-top))] pb-4 [&_a]:pointer-events-auto [&_a]:backdrop-blur-md [&_button]:pointer-events-auto [&_button]:backdrop-blur-md">
        <Link href="/home" className={circle} aria-label="뒤로 가기">
          <ChevronLeftIcon />
        </Link>
        <div className="flex items-center gap-1">
          <TrackedLink href="/" event="language_clicked" props={{ from: "detail" }} className={circle} aria-label="언어 선택">
            {/* eslint-disable-next-line @next/next/no-img-element -- 작은 SVG 아이콘 */}
            <img src="/images/icon-world.svg" width={24} height={24} alt="" />
          </TrackedLink>
          {/* TODO: 더보기 메뉴 (내 글이면 수정·삭제 — 송희 파트와 연결) */}
          <button
            type="button"
            className={circle}
            aria-label="더보기"
            onClick={() => track("post_more_clicked", { post_id: post.id })}
          >
            <MoreIcon />
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-1 px-2 pb-[calc(40px+env(safe-area-inset-bottom))]">
        <div ref={tileRef} className={hiddenUntilIntro}>
          <PhotoTile postId={post.id} photos={post.photos} participants={participantsOf(post)} title={post.title} />
        </div>

        <article
          ref={articleRef}
          className={`flex flex-col gap-5 rounded-[32px] px-7 py-[30px] text-on-light ${hiddenUntilIntro}`}
          style={{ background: post.color }}
        >
          <p className="text-[14px] leading-none font-medium tracking-[-0.28px] text-[#696969]">from. {post.author.country}</p>
          <h1 className="max-w-[204px] font-(family-name:--font-paperlogy) text-[31px] leading-[1.2] tracking-[-0.62px] break-keep">
            {post.title}
          </h1>
          <p className="text-[16px] leading-[1.55] font-medium tracking-[-0.32px] whitespace-pre-line text-[#444]">{post.body}</p>
        </article>

        <div
          ref={(el) => {
            voteRef.current = el;
            fadeIns.current[1] = el;
          }}
        >
          <VoteBowl post={post} />
        </div>

        <div
          className="relative"
          ref={(el) => {
            fadeIns.current[2] = el;
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
            className="pointer-events-none fixed z-30"
            style={{ ...boxStyle(intro.card), borderRadius: 34.8, background: intro.color }}
          />
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
        </>
      )}

      {/* 플로팅 "투표하기" (Figma: Floating CTA (viewport)) */}
      <button
        type="button"
        onClick={goToVote}
        tabIndex={showCta ? 0 : -1}
        aria-hidden={!showCta}
        className={`fixed bottom-[calc(40px+env(safe-area-inset-bottom))] left-1/2 z-20 -translate-x-1/2 rounded-full bg-primary px-8 py-6 text-[20px] leading-none font-extrabold tracking-[-0.4px] whitespace-nowrap text-white shadow-[0_18px_48px_4px_rgba(0,0,0,0.55),0_10px_24px_-6px_rgba(255,135,196,0.55)] transition-[opacity,translate,scale] duration-300 active:scale-95 ${
          showCta ? "opacity-100" : "pointer-events-none translate-y-6 opacity-0"
        }`}
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

const INTRO_MS = 560;
const boxStyle = (b: Box) => ({ left: b.left, top: b.top, width: b.width, height: b.height });

/** 사진 넘겨 보기 + 참여 인원 칩 (Figma: Tile/Photo) */
function PhotoTile({
  postId,
  photos,
  participants,
  title,
}: {
  postId: string;
  photos: string[];
  participants: number;
  title: string;
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
      <p className="absolute top-[19px] left-[19px] rounded-full bg-black px-3 py-1.5 text-[16px] leading-[1.5] font-semibold text-white">
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
