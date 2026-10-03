"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { COMMENT_MAX, QUICK_EMOJIS, useComments } from "./comments";
import { GravityPile } from "./GravityPile";

/** 댓글 영역 (Figma: Tile/한마디 참견 + 한마디 입력 + 이모지 키) */
export function CommentPile({ postId, commentCount, authorFlag }: { postId: string; commentCount: number; authorFlag: string }) {
  const { comments, addedCount, add } = useComments(postId, authorFlag);
  const [draft, setDraft] = useState("");
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n");
    if (!text) return;
    add("text", text);
    setDraft("");
  };

  return (
    <div className="flex flex-col items-center gap-8">
      <section className="relative flex w-full flex-col gap-1 overflow-hidden rounded-[32px] bg-white/10 p-1" aria-label="댓글">
        <div className="flex h-16 items-center gap-10 pl-5">
          <h2 className="flex flex-1 items-center gap-1.5 text-[18px] leading-[1.3] font-bold tracking-[-0.54px]">
            댓글 <span className="text-neutral-400">{commentCount + addedCount}</span>
          </h2>
          <Link
            href={`/posts/${postId}/comments`}
            aria-label="댓글 전체 보기"
            className="flex size-16 items-center justify-center rounded-full bg-[#242424]"
          >
            <ArrowUpRightIcon />
          </Link>
        </div>

        <GravityPile comments={comments} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[92px] bg-linear-to-b from-[#292929]/0 to-[#292929]" />
      </section>

      {/* 한마디 입력 카드 + 보내기 */}
      <form onSubmit={onSubmit} className="relative h-[181px] w-[270px]">
        <label className="absolute inset-x-0 top-0 flex h-[152px] items-center justify-center">
          <span className="sr-only">한마디 남기기</span>
          <span className="relative flex h-[130px] w-[260px] -rotate-[4.91deg] items-center justify-center rounded-[26px] bg-[#292929] p-4">
            <textarea
              value={draft}
              onChange={(e) => setDraft(limitDraft(e.target.value))}
              onKeyDown={(e) => {
                // Enter는 줄바꿈만 합니다 (최대 2줄). 보내기는 버튼으로만.
                if (e.key === "Enter" && draft.includes("\n")) e.preventDefault();
              }}
              rows={2}
              placeholder={"떠오른 한마디를\n남겨보세요"}
              className="w-full resize-none bg-transparent text-center text-[20px] leading-[1.45] font-bold tracking-[-0.4px] text-on-dark outline-none placeholder:text-white/70"
            />
            <span className="absolute right-4 bottom-[26px] text-[10px] font-bold text-white/70">
              {charCount(draft)}/{COMMENT_MAX}
            </span>
          </span>
        </label>
        <span className="absolute top-[123px] left-[84px] flex h-[58px] w-[112px] items-center justify-center">
          <button
            type="submit"
            disabled={!draft.trim()}
            className="flex rotate-[4.89deg] items-center gap-1.5 rounded-full bg-white px-3.5 py-2.5 text-[20px] leading-[1.45] font-bold tracking-[-0.4px] text-black"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- 작은 SVG 아이콘 */}
            <img src="/images/icon-send.svg" width={22} height={22} alt="" />
            보내기
          </button>
        </span>
      </form>

      <div className="flex w-full gap-0.5">
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => add("emoji", emoji)}
            aria-label={`${emoji} 남기기`}
            className="flex aspect-square min-w-0 flex-1 items-center justify-center rounded-full bg-white/10 text-[20px] transition-transform active:scale-90"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

const MAX_LINES = 2;

/** 줄바꿈은 글자 수에 세지 않습니다. */
const charCount = (text: string) => text.replace(/\n/g, "").length;

/** 입력값을 최대 2줄, 20자로 자릅니다 (붙여넣기 포함). */
function limitDraft(value: string) {
  let left = COMMENT_MAX;
  return value
    .split("\n")
    .slice(0, MAX_LINES)
    .map((line) => {
      const kept = line.slice(0, Math.max(left, 0));
      left -= kept.length;
      return kept;
    })
    .join("\n");
}

// Lucide arrow-up-right (MIT)
function ArrowUpRightIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 7h10v10" />
      <path d="M7 17 17 7" />
    </svg>
  );
}
