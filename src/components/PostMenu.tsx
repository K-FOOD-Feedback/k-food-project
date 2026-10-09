"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { track } from "@/lib/analytics";
import { useFlow } from "@/lib/write-store";
import { PillButton } from "./Buttons";
import { Icon } from "./Icon";
import { BottomSheet } from "./Layout";

/**
 * 게시글 "더보기(⋯)" 메뉴 (담당 송희 — 상세 화면 등에 끼워 씀)
 * - 내 글: 수정하기 · 삭제하기(확인 시트)
 * - 남의 글: 링크 복사 · 신고하기(이유 고르는 시트)
 * 메뉴·시트는 화면 맨 바깥(body)에 띄워서, 버튼이 어디에 있든 화면 전체를 덮습니다.
 */
const REPORT_REASONS = ["스팸·광고예요", "욕설이나 혐오 표현이 있어요", "음식과 관계없는 사진이에요", "기타"];

export function PostMenu({
  postId,
  isMine = false,
  className,
  onOpen,
  children,
}: {
  postId: string;
  /** 메뉴를 열 때 쓰는 화면이 따로 남길 기록 등 */
  onOpen?: () => void;
  isMine?: boolean;
  /** ⋯ 버튼 모양 (쓰는 화면의 버튼 스타일 그대로) */
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const { deleteMyPost } = useFlow();
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState<"delete" | "report" | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // 메뉴는 Esc로 닫힘
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // 토스트는 잠깐 보였다 사라짐
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const copyLink = async () => {
    setOpen(false);
    track("post_shared", { channel: "copy_link", from: "detail_menu", post_id: postId });
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/posts/${postId}`);
      setToast("링크를 복사했어요");
    } catch {
      setToast("링크를 복사하지 못했어요");
    }
  };

  const items = isMine
    ? [
        { icon: "pencil" as const, label: "수정하기", danger: false, onClick: () => router.push(`/posts/${postId}/edit`) },
        { icon: "trash" as const, label: "삭제하기", danger: true, onClick: () => setSheet("delete") },
      ]
    : [
        { icon: "link" as const, label: "링크 복사", danger: false, onClick: copyLink },
        {
          icon: "alert" as const,
          label: "신고하기",
          danger: true,
          onClick: () => {
            setReason(null);
            setSheet("report");
          },
        },
      ];

  return (
    <>
      <button
        type="button"
        className={className}
        aria-label="더보기"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          track("post_menu_opened", { post_id: postId, mine: isMine });
          onOpen?.();
          setOpen(true);
        }}
      >
        {children}
      </button>

      {/* 열린 게 있을 때만 그림 (처음 화면을 그릴 땐 없음 → 서버·브라우저 결과가 같음) */}
      {(open || sheet || toast) &&
        createPortal(
          <>
            {open && (
              <>
                <button
                  type="button"
                  aria-label="메뉴 닫기"
                  tabIndex={-1}
                  onClick={() => setOpen(false)}
                  className="fixed inset-0 z-40 animate-fade-in bg-black/50"
                />
                <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+88px)] z-50 mx-auto flex w-full max-w-[430px] justify-end px-2">
                  <div
                    role="menu"
                    className="pointer-events-auto flex w-fit origin-top-right animate-menu flex-col gap-0.5 rounded-[24px] bg-surface p-1.5 text-on-dark shadow-[0_12px_32px_rgba(0,0,0,0.4)]"
                  >
                    {items.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setOpen(false);
                          item.onClick();
                        }}
                        className={`flex h-12 w-[184px] items-center gap-3 rounded-[18px] px-3 text-[14px] font-bold leading-[1.3] hover:bg-surface-2 ${
                          item.danger ? "text-error" : ""
                        }`}
                      >
                        <Icon name={item.icon} size={20} />
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* 삭제 확인 (내 글) */}
            <BottomSheet open={sheet === "delete"} onClose={() => setSheet(null)} label="글 삭제">
              <div className="flex w-full flex-col items-center gap-2 px-6 pt-2 text-center break-keep">
                <span className="mb-2 flex size-16 items-center justify-center rounded-full bg-surface-2 text-error">
                  <Icon name="trash" size={28} />
                </span>
                <h2 className="font-display text-[22px] leading-[1.25]">이 글을 삭제할까요?</h2>
                <p className="text-[15px] leading-[1.5] text-muted">받은 투표와 한마디도 함께 사라지고, 되돌릴 수 없어요.</p>
              </div>
              <div className="flex w-full gap-1">
                <PillButton tone="soft" onClick={() => setSheet(null)}>
                  취소
                </PillButton>
                <PillButton
                  tone="error"
                  onClick={() => {
                    track("post_deleted", { post_id: postId, from: "detail_menu" });
                    deleteMyPost();
                    setSheet(null);
                    router.push("/home/en");
                  }}
                >
                  삭제하기
                </PillButton>
              </div>
            </BottomSheet>

            {/* 신고 (남의 글) */}
            <BottomSheet open={sheet === "report"} onClose={() => setSheet(null)} label="신고하기">
              <div className="flex w-full flex-col gap-2 px-6 pt-2 break-keep">
                <h2 className="font-display text-[22px] leading-[1.25]">이 글을 신고할까요?</h2>
                <p className="text-[15px] leading-[1.5] text-muted">이유를 골라 주세요. 확인한 뒤 조치할게요.</p>
              </div>
              <div role="radiogroup" aria-label="신고 이유" className="flex w-full flex-col gap-1">
                {REPORT_REASONS.map((r) => {
                  const on = reason === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setReason(r)}
                      className={`flex h-14 items-center gap-3 rounded-full px-5 text-left text-[15px] font-semibold transition ${
                        on ? "bg-on-dark text-on-light" : "bg-surface-2 text-on-dark"
                      }`}
                    >
                      <span
                        className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                          on ? "border-on-light bg-on-light text-on-dark" : "border-white/30"
                        }`}
                        aria-hidden="true"
                      >
                        {on && <Icon name="check" size={12} strokeWidth={3} />}
                      </span>
                      {r}
                    </button>
                  );
                })}
              </div>
              <div className="flex w-full gap-1">
                <PillButton tone="soft" onClick={() => setSheet(null)}>
                  취소
                </PillButton>
                <PillButton
                  tone={reason ? "error" : "disabled"}
                  disabled={!reason}
                  onClick={() => {
                    track("post_reported", { post_id: postId, reason: REPORT_REASONS.indexOf(reason ?? "") });
                    setSheet(null);
                    setToast("신고가 접수됐어요");
                  }}
                >
                  신고하기
                </PillButton>
              </div>
            </BottomSheet>

            {/* 짧은 안내 */}
            {toast && (
              <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+96px)] z-50 flex justify-center px-4">
                <p
                  role="status"
                  className="flex animate-toast-in items-center gap-2 rounded-full bg-on-dark px-5 py-3 text-[14px] font-bold text-on-light shadow-[0_12px_32px_rgba(0,0,0,0.4)]"
                >
                  <Icon name="check" size={16} strokeWidth={3} />
                  {toast}
                </p>
              </div>
            )}
          </>,
          document.body,
        )}
    </>
  );
}
