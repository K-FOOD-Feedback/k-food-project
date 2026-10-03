"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { participantsOf, type HomePost } from "@/app/home/mockPosts";
import { useMyVote } from "@/app/home/votes";
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

  useEffect(() => {
    const el = voteRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeenVote(true);
          io.disconnect();
        }
      },
      // 화면 아래쪽 플로팅 버튼에 가려지는 부분은 '본 것'으로 치지 않습니다.
      { rootMargin: "0px 0px -140px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const goToVote = () => {
    setSeenVote(true);
    voteRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const showCta = !voted && !seenVote;

  return (
    <main
      className={`${paperlogy.variable} relative mx-auto min-h-dvh w-full max-w-[430px] overflow-x-clip bg-background text-on-dark`}
    >
      <header className="flex items-center justify-between px-2 pt-[calc(16px+env(safe-area-inset-top))] pb-4">
        <Link href="/home" className={circle} aria-label="뒤로 가기">
          <ChevronLeftIcon />
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/" className={circle} aria-label="언어 선택">
            {/* eslint-disable-next-line @next/next/no-img-element -- 작은 SVG 아이콘 */}
            <img src="/images/icon-world.svg" width={24} height={24} alt="" />
          </Link>
          {/* TODO: 더보기 메뉴 (내 글이면 수정·삭제 — 송희 파트와 연결) */}
          <button type="button" className={circle} aria-label="더보기">
            <MoreIcon />
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-1 px-2 pb-[calc(48px+env(safe-area-inset-bottom))]">
        <PhotoTile photos={post.photos} participants={participantsOf(post)} title={post.title} />

        <article className="flex flex-col gap-5 rounded-[32px] px-7 py-[30px] text-on-light" style={{ background: post.color }}>
          <p className="text-[14px] leading-none font-medium tracking-[-0.28px] text-[#696969]">from. {post.author.country}</p>
          <h1 className="max-w-[204px] font-(family-name:--font-paperlogy) text-[31px] leading-[1.2] tracking-[-0.62px] break-keep">
            {post.title}
          </h1>
          <p className="text-[16px] leading-[1.55] font-medium tracking-[-0.32px] whitespace-pre-line text-[#444]">{post.body}</p>
        </article>

        <div ref={voteRef}>
          <VoteBowl post={post} />
        </div>

        <div>
          <CommentPile postId={post.id} commentCount={post.commentCount} authorFlag={post.author.flag} />
        </div>
      </div>

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

/** 사진 넘겨 보기 + 참여 인원 칩 (Figma: Tile/Photo) */
function PhotoTile({ photos, participants, title }: { photos: string[]; participants: number; title: string }) {
  const [index, setIndex] = useState(0);
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-[32px] border border-black/4 bg-[#1e1e1e]">
      <div
        className="flex size-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / el.clientWidth));
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
