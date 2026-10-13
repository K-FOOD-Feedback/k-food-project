"use client";

import { useMyVote } from "@/app/home/votes";
import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";

const noopSubscribe = () => () => {};

/**
  한마디 전체 화면은 투표한 사람만 볼 수 있습니다.
  상세 화면에서는 투표 전에 ↗ 버튼이 잠겨 있지만, 주소·공유 링크로 바로 들어오는 길도 막습니다.
  투표 기록이 없으면 상세 화면의 투표 영역(#vote)으로 돌려보냅니다.
*/
export function VoteGate({
  postId,
  open = false,
  children,
}: {
  postId: string;
  /** 투표 없이 보는 사람 (외국인은 투표를 못 해서 그냥 봄 — 송희·지현 합의) */
  open?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const vote = useMyVote(postId);
  // 투표 기록은 이 브라우저에만 있어서, 서버에서 그린 첫 화면에서는 아직 모릅니다. 읽어 온 뒤에 true.
  const ready = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const voted = vote !== null;

  useEffect(() => {
    if (ready && !voted && !open) router.replace(`/posts/${postId}${window.location.search.match(/[?&](from=[\w-]+)/)?.[0].replace(/^&/, "?") ?? ""}#vote`); // 들어온 곳(?from=)은 유지
  }, [ready, voted, open, postId, router]);

  // 확인 전·돌려보내는 중에는 아무것도 보여 주지 않습니다 (한마디가 잠깐 비치지 않도록).
  if (!open && (!ready || !voted)) return <div className="min-h-dvh bg-background" />;
  return children;
}
