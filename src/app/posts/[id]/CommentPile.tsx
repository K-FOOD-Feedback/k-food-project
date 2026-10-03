"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { COMMENT_MAX, QUICK_EMOJIS, useComments, type Comment } from "./comments";

// 댓글 더미 자리 (Figma "Gravity zone" 351×286 안의 중심 좌표, 아래 → 위 순서)
// 글 댓글과 이모지 댓글은 모양이 달라서 자리를 따로 둡니다. 최신 댓글이 가장 위 자리에 놓입니다.
const TEXT_SLOTS = [
  { x: 175, y: 270, r: 0 },
  { x: 178, y: 195, r: 10.38 },
  { x: 270, y: 152, r: 23.01 },
  { x: 74, y: 147, r: -39.19 },
  { x: 212, y: 69, r: 8.3 },
];
const EMOJI_SLOTS = [
  { x: 51, y: 270, r: 0 },
  { x: 288, y: 270, r: 0 },
  { x: 79, y: 221, r: -15 },
  { x: 323, y: 227, r: 0 },
];

/** 댓글 영역 (Figma: Tile/한마디 참견 + 한마디 입력 + 이모지 키) */
export function CommentPile({ postId, commentCount, authorFlag }: { postId: string; commentCount: number; authorFlag: string }) {
  const { comments, addedCount, add } = useComments(postId, authorFlag);
  const [draft, setDraft] = useState("");
  // 이번 방문에서 댓글을 달았으면, 가장 최근 댓글이 위에서 떨어지는 효과를 줍니다.
  const [sent, setSent] = useState(false);

  const texts = comments.filter((c) => c.kind === "text").slice(-TEXT_SLOTS.length);
  const emojis = comments.filter((c) => c.kind === "emoji").slice(-EMOJI_SLOTS.length);
  const placed = [
    ...texts.map((c, i) => ({ c, slot: TEXT_SLOTS[i + TEXT_SLOTS.length - texts.length] })),
    ...emojis.map((c, i) => ({ c, slot: EMOJI_SLOTS[i + EMOJI_SLOTS.length - emojis.length] })),
  ];

  const send = (kind: Comment["kind"], text: string) => {
    add(kind, text);
    setSent(true);
  };

  const dropping = sent ? comments[comments.length - 1]?.id : null;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n");
    if (!text) return;
    send("text", text);
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

        <div className="relative h-[286px] w-full" aria-label="최근 댓글">
          {placed.map(({ c, slot }) => (
            <Bubble key={c.id} comment={c} slot={slot} drop={c.id === dropping} />
          ))}
        </div>
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

      <div className="flex w-full justify-between">
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => send("emoji", emoji)}
            aria-label={`${emoji} 남기기`}
            className="flex size-[58px] items-center justify-center rounded-full bg-white/10 text-[20px] transition-transform active:scale-90"
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

function Bubble({ comment, slot, drop }: { comment: Comment; slot: { x: number; y: number; r: number }; drop: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!drop) return;
    ref.current?.animate(
      [
        { translate: "0 -260px", opacity: 0 },
        { translate: "0 0", opacity: 1 },
      ],
      { duration: 650, easing: "cubic-bezier(0.3, 1.25, 0.5, 1)" },
    );
  }, [drop]);

  const { author } = comment;
  return (
    <div
      ref={ref}
      className="absolute transition-[left,top,rotate] duration-500 ease-out"
      style={{ left: slot.x, top: slot.y, translate: "-50% -50%", rotate: `${slot.r}deg` }}
    >
      {comment.kind === "emoji" ? (
        <span
          className="flex size-[54px] items-center justify-center rounded-full text-[16px]"
          style={{ background: comment.color }}
        >
          {comment.text}
        </span>
      ) : (
        <span
          className={`relative flex items-center justify-center gap-2 rounded-[32px] text-center text-[16px] leading-[1.4] font-bold tracking-[-0.32px] whitespace-pre text-black ${
            author.kind === "korean" ? "px-5 py-4" : "py-2.5 pr-5 pl-2.5"
          }`}
          style={{ background: comment.color }}
        >
          {author.kind !== "korean" && (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-[20px] leading-none">
              {author.flag}
            </span>
          )}
          {comment.text}
          {author.kind === "author" && (
            <span className="absolute -top-2.5 left-[30px] rounded-full bg-black px-1.5 py-1 text-[10px] leading-none font-bold text-white">
              작성자
            </span>
          )}
        </span>
      )}
    </div>
  );
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
