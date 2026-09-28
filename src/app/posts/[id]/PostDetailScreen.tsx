"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowCta, IconButton, PillButton } from "@/components/Buttons";
import { Icon } from "@/components/Icon";
import { BottomSheet, Screen, StickyBottom, Tile, TopBar } from "@/components/Layout";
import { PhotoCarousel } from "@/components/PhotoCarousel";
import type { FeedPost, Sticker } from "@/lib/data";

export function PostDetailScreen({ post }: { post: FeedPost }) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [choice, setChoice] = useState<number | null>(null);
  const [voted, setVoted] = useState<number | null>(null);
  const participants = post.votes + (voted !== null ? 1 : 0);

  return (
    <Screen bg="bg-canvas" className="pb-[132px]">
      <TopBar
        bg="bg-canvas-soft"
        left={<IconButton icon="chevron-left" label="뒤로" onClick={() => router.back()} />}
        right={<IconButton icon="more" label="더보기" />}
      />

      <div className="flex flex-col gap-1 px-2">
        <PhotoCarousel photos={post.photos} bordered />

        {/* Tile/Post */}
        <Tile>
          <h1 className="px-5 pt-5 pb-4 text-[22px] font-extrabold leading-[1.3]">{post.title}</h1>
          <div className="flex flex-col gap-1 rounded-[36px] bg-yellow py-1">
            <div className="flex items-center gap-2 px-5 pt-6 pb-3">
              <span className="size-6 rounded-full bg-night" aria-hidden="true" />
              <span className="text-[13px] font-medium leading-[1.3]">
                {post.author} · {post.countryKo} · {post.postedAgo}
              </span>
            </div>
            <div className="px-5 py-3 text-[15px] leading-[1.5]">
              {post.body.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <div className="px-5 pt-2 pb-8">
              <button type="button" className="text-[13px] font-medium leading-[1.3] underline opacity-70">
                자동 번역됨 · 원문 보기
              </button>
            </div>
          </div>
        </Tile>

        {/* Tile/한마디 참견 */}
        <Tile>
          <div className="flex h-16 items-center gap-10 pl-5">
            <h2 className="flex flex-1 items-center gap-1 text-[18px] font-bold leading-[1.3] tracking-[-0.03em]">
              댓글 <span className="text-subtle">{post.commentCount}</span>
            </h2>
            <button
              type="button"
              aria-label="댓글 전체 보기"
              className="flex size-16 items-center justify-center rounded-full bg-canvas-soft"
            >
              <Icon name="arrow-up-right" />
            </button>
          </div>
          <StickerZone stickers={post.comments} />
        </Tile>
      </div>

      <StickyBottom fade="from-canvas-soft/0 via-canvas-soft via-40% to-canvas-soft">
        <ArrowCta
          caption={voted !== null ? `${participants}명 참여 중 · 투표 완료` : `${participants}명 참여 중`}
          title={post.question.short}
          onClick={() => setSheetOpen(true)}
        />
      </StickyBottom>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} label="투표">
        <div className="flex w-full flex-col gap-2 px-6">
          <p className="text-[13px] font-medium leading-[1.3] text-disabled">
            {post.question.typeLabelKo} · {participants}명 참여 중
          </p>
          <h2 className="whitespace-pre-line text-[22px] font-extrabold leading-[1.35]">
            {post.question.full}
          </h2>
        </div>
        <div role="radiogroup" aria-label={post.question.short} className="flex w-full flex-col gap-1">
          {post.question.options.map((label, i) => {
            const selected = (choice ?? voted) === i;
            return (
              <button
                key={label}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={voted !== null}
                onClick={() => setChoice(i)}
                className={`flex h-14 w-full items-center gap-3 rounded-full px-5 text-left text-[15px] font-medium leading-[1.5] transition ${
                  selected ? "bg-night text-white" : "bg-canvas-soft text-ink"
                }`}
              >
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full ${
                    selected ? "bg-white text-ink" : "border-2 border-line"
                  }`}
                >
                  {selected && <Icon name="check" size={14} strokeWidth={3} />}
                </span>
                {label}
              </button>
            );
          })}
        </div>
        <p className="w-full px-6 text-center text-[13px] font-medium leading-[1.3] text-disabled">
          {voted !== null ? "참견해 줘서 고마워요!" : "투표하면 다른 한국인들의 선택이 공개돼요"}
        </p>
        <div className="flex w-full">
          {voted !== null ? (
            <PillButton tone="soft" onClick={() => setSheetOpen(false)}>
              닫기
            </PillButton>
          ) : (
            <PillButton
              tone={choice === null ? "disabled" : "black"}
              disabled={choice === null}
              onClick={() => setVoted(choice)}
            >
              투표하기
            </PillButton>
          )}
        </div>
      </BottomSheet>
    </Screen>
  );
}

/** 댓글이 쌓여 있는 'Gravity zone' — Figma 배치를 그대로 옮긴 정적 버전 */
function StickerZone({ stickers }: { stickers: Sticker[] }) {
  return (
    <div className="relative h-[286px] w-full overflow-hidden" aria-label="댓글 미리보기">
      {stickers.map((s, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: `${(s.x / 351) * 100}%`,
            top: s.y,
            transform: `rotate(${s.rotate}deg)`,
          }}
        >
          {s.kind === "bubble" ? (
            <p
              className="whitespace-pre rounded-[32px] px-5 py-4 text-[16px] font-semibold leading-[1.4] text-black"
              style={{ background: s.color }}
            >
              {s.text}
            </p>
          ) : (
            <span
              role="img"
              aria-label="반응"
              className="flex size-[54px] items-center justify-center rounded-full text-[16px]"
              style={{ background: s.color }}
            >
              {s.emoji}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
