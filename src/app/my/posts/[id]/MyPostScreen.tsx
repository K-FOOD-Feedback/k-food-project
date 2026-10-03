"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { IconButton, PillButton } from "@/components/Buttons";
import { Icon } from "@/components/Icon";
import { BottomSheet, Screen, Tile, TopBar } from "@/components/Layout";
import { PhotoCarousel } from "@/components/PhotoCarousel";
import { getQuestion } from "@/lib/write-data";
import { SAMPLE_MY_POST, useFlow, MY_POST_ID } from "@/lib/write-store";

export function MyPostScreen({ demoVotes }: { demoVotes?: number }) {
  const router = useRouter();
  const { myPost, updateMyPost, deleteMyPost } = useFlow();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // 리뷰용 ?votes=12 → 투표·댓글이 쌓인 상태로 전환
  useEffect(() => {
    if (demoVotes) updateMyPost({ votes: demoVotes, comments: 4, views: 318 });
  }, [demoVotes, updateMyPost]);

  const post = myPost ?? SAMPLE_MY_POST;

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <Screen className="pb-10">
      <TopBar
        left={<IconButton icon="chevron-left" label="Back" href="/home/en" />}
        right={
          <IconButton
            icon="more"
            label="Post options"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen(true)}
          />
        }
      />

      <div className="stagger flex flex-col gap-1 px-2">
        <PhotoCarousel photos={post.photos.map((p) => p.src)} height={300} indicator="none" />

        <Tile>
          <h1 className="px-5 pt-5 pb-4 text-[22px] font-extrabold leading-[1.3]">{post.title}</h1>
          <dl className="flex items-center rounded-[24px] bg-surface-2 px-2 py-3">
            {(
              [
                ["Votes", post.votes],
                ["Comments", post.comments],
                ["Views", post.views],
              ] as const
            ).map(([label, value], i) => (
              <div key={label} className="flex flex-1 items-center">
                {i > 0 && <span className="h-[30px] w-px bg-white/10" aria-hidden="true" />}
                <div className="flex flex-1 flex-col-reverse items-center gap-1">
                  <dd className="text-[16px] font-semibold leading-[1.5] tabular-nums">{value}</dd>
                  <dt className="text-[13px] leading-[1.4] text-muted">{label}</dt>
                </div>
              </div>
            ))}
          </dl>
          <div className="flex flex-col gap-1 rounded-[28px] bg-content py-1 text-on-light">
            <div className="px-5 pt-5 pb-1">
              <span className="inline-flex rounded-full bg-white px-3 py-[7px] text-[13px] font-semibold leading-[1.3]">
                {getQuestion(post.questionId).label}
              </span>
            </div>
            <p className="px-5 pt-3 pb-5 text-[15px] leading-[1.5]">{post.story}</p>
          </div>
        </Tile>
      </div>

      {/* 더보기 메뉴 */}
      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-40 animate-fade-in bg-black/60"
          />
          <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+16px)] z-50 mx-auto flex w-full max-w-[430px] flex-col items-end gap-2 px-2">
            {/* 딤 위로 올라온 더보기 버튼 */}
            <IconButton
              icon="more"
              label="Close menu"
              aria-expanded
              onClick={() => setMenuOpen(false)}
              className="pointer-events-auto"
            />
            <div
              role="menu"
              className="pointer-events-auto flex w-fit origin-top-right animate-menu flex-col gap-0.5 rounded-[24px] bg-surface p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.4)]"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => router.push(`/posts/${MY_POST_ID}/edit`)}
                className="flex h-12 w-[184px] items-center gap-3 rounded-[18px] px-3 text-[14px] font-bold leading-[1.3] hover:bg-surface-2"
              >
                <Icon name="pencil" size={20} />
                Edit post
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setDeleteOpen(true);
                }}
                className="flex h-12 w-[184px] items-center gap-3 rounded-[18px] px-3 text-[14px] font-bold leading-[1.3] text-error hover:bg-surface-2"
              >
                <Icon name="trash" size={20} />
                Delete post
              </button>
            </div>
          </div>
        </>
      )}

      {/* 12 Delete confirm */}
      <BottomSheet open={deleteOpen} onClose={() => setDeleteOpen(false)} label="Delete post">
        <div className="flex w-full flex-col items-center gap-3 px-6 pt-2 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-surface-2 text-error">
            <Icon name="trash" size={28} />
          </span>
          <h2 className="font-display text-[22px] leading-[1.2]">Delete this post?</h2>
          <p className="text-[15px] leading-[1.5] text-muted">
            {post.votes > 0 || post.comments > 0
              ? `Its ${post.votes} votes and ${post.comments} comments will be gone too. `
              : ""}
            This can&apos;t be undone.
          </p>
        </div>
        <div className="flex w-full gap-1">
          <PillButton tone="soft" onClick={() => setDeleteOpen(false)}>
            Cancel
          </PillButton>
          <PillButton
            tone="error"
            onClick={() => {
              deleteMyPost();
              router.push("/home/en");
            }}
          >
            Delete
          </PillButton>
        </div>
      </BottomSheet>
    </Screen>
  );
}
