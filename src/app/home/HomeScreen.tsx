"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { ArrowCta, IconButton } from "@/components/Buttons";
import { FeedCard } from "@/components/FeedCard";
import { Icon } from "@/components/Icon";
import { Screen, StickyBottom, TopBar } from "@/components/Layout";
import { LoginSheet } from "@/components/LoginSheet";
import { PhotoImage } from "@/components/PhotoGrid";
import { usePhotoPicker } from "@/components/PhotoPicker";
import { FEED, SERVICE_NAME } from "@/lib/data";
import { coverOf, useFlow, type DraftStep } from "@/lib/flow-store";

const DRAFT_ROUTE: Record<DraftStep, string> = {
  photos: "/upload",
  question: "/upload/question",
  review: "/upload/review",
};

// 분 단위로만 바뀌는 현재 시각 (렌더 중 Date.now() 호출을 피하기 위함)
const MINUTE = 60_000;
function subscribeMinute(cb: () => void) {
  const t = window.setInterval(cb, MINUTE);
  return () => window.clearInterval(t);
}
function useNowMinute() {
  return useSyncExternalStore(
    subscribeMinute,
    () => Math.floor(Date.now() / MINUTE) * MINUTE,
    () => 0,
  );
}

function savedAgo(ts: number, now: number) {
  const min = Math.max(0, Math.round((now - ts) / MINUTE));
  if (min < 1) return "saved just now";
  if (min < 60) return `saved ${min}m ago`;
  return `saved ${Math.round(min / 60)}h ago`;
}

export function HomeScreen() {
  const router = useRouter();
  const { loggedIn, logIn, addPhotos, draft, discardDraft } = useFlow();
  // 로그인 시트를 연 이유: 업로드 시작 / 계정 버튼
  const [loginFor, setLoginFor] = useState<"upload" | "account" | null>(null);
  const post = FEED[0];
  const now = useNowMinute();

  const picker = usePhotoPicker((files) => {
    addPhotos(files, { fresh: true });
    router.push("/upload");
  });

  // 로그인 → 곧바로 사진 선택 (클릭 핸들러 안에서 열어야 브라우저가 막지 않습니다)
  const startUpload = () => {
    if (!loggedIn) {
      setLoginFor("upload");
      return;
    }
    picker.open();
  };

  const hasDraft = draft.savedStep !== null && draft.photos.length > 0;
  const draftCover = hasDraft ? coverOf(draft) : null;

  return (
    <Screen bg="bg-canvas-soft">
      <TopBar
        bg="bg-canvas-soft"
        left={<span className="pl-6 font-display text-[20px] leading-[1.2]">{SERVICE_NAME}</span>}
        right={
          <>
            <IconButton icon="globe" label="Language" />
            <IconButton
              icon="user"
              label={loggedIn ? "My post" : "Log in"}
              {...(loggedIn ? { href: "/my-post" } : { onClick: () => setLoginFor("account") })}
            />
          </>
        }
      />

      {/* 카드 스택 — 뒤 카드는 흰색 */}
      <div className="relative mx-6 mt-[18px] mb-[200px]">
        <div
          aria-hidden="true"
          className="absolute inset-0 rotate-5 rounded-[32px] bg-white shadow-[0_12px_14px_rgba(0,0,0,0.05)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -rotate-3 rounded-[32px] bg-white shadow-[0_12px_14px_rgba(0,0,0,0.05)]"
        />
        <Link
          href={`/posts/${post.id}`}
          className="relative block drop-shadow-[0_12px_14px_rgba(0,0,0,0.08)] transition active:scale-[0.99]"
        >
          <FeedCard
            title={post.cardTitle}
            author={`${post.author} · ${post.country}`}
            photo={post.cover}
            votesLabel={`${post.votes} voted`}
            questionLabel={post.question.typeLabel}
            priority
          />
        </Link>
      </div>

      <StickyBottom fade="from-canvas-soft/0 via-canvas-soft to-canvas-soft">
        {hasDraft && draftCover && (
          <div className="flex items-center gap-3 rounded-full bg-white p-1">
            <Link
              href={DRAFT_ROUTE[draft.savedStep ?? "photos"]}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <span className="relative size-14 shrink-0 overflow-hidden rounded-full">
                <PhotoImage src={draftCover.src} sizes="56px" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col leading-[1.3]">
                <span className="text-[15px] font-bold">Continue your draft</span>
                <span className="truncate text-[13px] font-medium text-muted">
                  {draft.title || "Untitled"} · {savedAgo(draft.savedAt ?? now, now)}
                </span>
              </span>
            </Link>
            <button
              type="button"
              onClick={discardDraft}
              aria-label="Discard draft"
              className="flex size-14 shrink-0 items-center justify-center rounded-full bg-canvas-soft"
            >
              <Icon name="x" size={20} />
            </button>
          </div>
        )}
        <ArrowCta
          caption="Get honest takes from Koreans"
          title="Share your K-food"
          onClick={startUpload}
        />
      </StickyBottom>

      {picker.input}
      <LoginSheet
        open={loginFor !== null}
        onClose={() => setLoginFor(null)}
        onLoggedIn={() => {
          logIn();
          setLoginFor(null);
          if (loginFor === "upload") picker.open();
        }}
      />
    </Screen>
  );
}
