"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { getHomePost } from "@/app/home/mockPosts";
import { ShareSheet } from "@/app/write/done/ShareSheet";
import type { ShareCardPost } from "@/app/write/done/ShareCard";
import { track } from "@/lib/analytics";
import { currentFrom, withFrom } from "@/lib/back";
import { coverOf, SAMPLE_MY_POST, useFlow } from "@/lib/write-store";
import { useMyAuthor } from "@/app/my/profile";
import { PillButton } from "./Buttons";
import { Icon } from "./Icon";
import { BottomSheet } from "./Layout";

/**
 * 게시글 "더보기(⋯)" 메뉴 (담당 송희 — 상세 화면 등에 끼워 씀)
 * - 내 글: 공유하기 · 수정하기 · 삭제하기(확인 시트)
 * - 남의 글: 공유하기 · 링크 복사 · 신고하기(이유 고르는 시트)
 * - 공유하기 → 글 올린 뒤와 같은 공유 시트 (스토리 카드 꾸미기)
 * - lang: 보는 사람 화면의 언어 (한국인 상세 ko · 외국인 상세와 내 글 en) — 메뉴·시트·공유 카드 모두
 * 메뉴·시트는 화면 맨 바깥(body)에 띄워서, 버튼이 어디에 있든 화면 전체를 덮습니다.
 */
const COPY = {
  ko: {
    more: "더보기",
    closeMenu: "메뉴 닫기",
    share: "공유하기",
    edit: "수정하기",
    delete: "삭제하기",
    copyLink: "링크 복사",
    report: "신고하기",
    copied: "링크를 복사했어요",
    copyFailed: "링크를 복사하지 못했어요",
    deleteLabel: "글 삭제",
    deleteTitle: "이 글을 삭제할까요?",
    deleteBody: "받은 투표와 한마디도 함께 사라지고, 되돌릴 수 없어요.",
    cancel: "취소",
    reportTitle: "이 글을 신고할까요?",
    reportBody: "이유를 골라 주세요. 확인한 뒤 조치할게요.",
    reportReason: "신고 이유",
    reported: "신고가 접수됐어요",
    reasons: ["스팸·광고예요", "욕설이나 혐오 표현이 있어요", "음식과 관계없는 사진이에요", "기타"],
  },
  en: {
    more: "More",
    closeMenu: "Close menu",
    share: "Share",
    edit: "Edit",
    delete: "Delete",
    copyLink: "Copy link",
    report: "Report",
    copied: "Link copied",
    copyFailed: "Couldn't copy the link",
    deleteLabel: "Delete post",
    deleteTitle: "Delete this post?",
    deleteBody: "Its votes and comments will be gone too. You can't undo this.",
    cancel: "Cancel",
    reportTitle: "Report this post?",
    reportBody: "Tell us why. We'll review it and take action.",
    reportReason: "Reason",
    reported: "Thanks, we got your report",
    reasons: ["Spam or ads", "Hate or abusive language", "Not a food photo", "Something else"],
  },
};

export function PostMenu({
  postId,
  isMine = false,
  lang = "ko",
  className,
  onOpen,
  children,
}: {
  postId: string;
  /** 메뉴를 열 때 쓰는 화면이 따로 남길 기록 등 */
  onOpen?: () => void;
  isMine?: boolean;
  /** 보는 사람 화면의 언어 */
  lang?: "ko" | "en";
  /** ⋯ 버튼 모양 (쓰는 화면의 버튼 스타일 그대로) */
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const { deleteMyPost, myPost } = useFlow();
  const t = COPY[lang];
  const me = useMyAuthor();
  const [shareOpen, setShareOpen] = useState(false);
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
      setToast(t.copied);
    } catch {
      setToast(t.copyFailed);
    }
  };

  // 공유 카드에 넣을 글 — 내 글은 브라우저 메모리에서, 남의 글은 목업 목록에서 (서버 전까지)
  const sharePost = (): ShareCardPost | null => {
    if (isMine) {
      const p = myPost ?? SAMPLE_MY_POST;
      return {
        title: p.title,
        dish: p.dish,
        photo: coverOf(p).src,
        voteQuestion: p.voteQuestion,
        options: p.options.filter((o) => o.trim()),
        // 글쓴이 = 나 (가입 때 정한 닉네임 · 나라)
        author: `${me.name || "Sam"} · ${me.country[lang]}`,
      };
    }
    const p = getHomePost(postId);
    if (!p) return null;
    const en = lang === "en";
    return {
      title: en ? p.en.title : p.title,
      dish: en ? p.en.title : p.title,
      photo: p.cardPhoto,
      voteQuestion: p.question.text,
      options: ((en && p.en.options) || p.question.options).map((o) => o.replace(/\n/g, " ")),
      author: `${p.author.name} · ${en ? p.en.country : p.author.country}`,
    };
  };
  const card = sharePost();
  const share = {
    icon: "share" as const,
    label: t.share,
    danger: false,
    onClick: () => {
      setOpen(false);
      track("share_sheet_opened", { from: "detail_menu", post_id: postId, mine: isMine });
      setShareOpen(true);
    },
  };

  const items = isMine
    ? [
        ...(card ? [share] : []),
        {
          icon: "pencil" as const,
          label: t.edit,
          danger: false,
          onClick: () => {
            track("post_edit_started", { post_id: postId, from: "detail_menu" });
            router.push(withFrom(`/posts/${postId}/edit`, currentFrom())); // 수정 뒤 상세의 ← 가 처음 들어온 곳으로 가게
          },
        },
        {
          icon: "trash" as const,
          label: t.delete,
          danger: true,
          onClick: () => {
            track("post_delete_sheet_opened", { post_id: postId, from: "detail_menu" });
            setSheet("delete");
          },
        },
      ]
    : [
        ...(card ? [share] : []),
        { icon: "link" as const, label: t.copyLink, danger: false, onClick: copyLink },
        {
          icon: "alert" as const,
          label: t.report,
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
        aria-label={t.more}
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
                  aria-label={t.closeMenu}
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
            <BottomSheet open={sheet === "delete"} onClose={() => setSheet(null)} label={t.deleteLabel}>
              <div className="flex w-full flex-col items-center gap-2 px-6 pt-2 text-center break-keep">
                <span className="mb-2 flex size-16 items-center justify-center rounded-full bg-surface-2 text-error">
                  <Icon name="trash" size={28} />
                </span>
                <h2 className="font-display text-[22px] leading-[1.25]">{t.deleteTitle}</h2>
                <p className="text-[15px] leading-[1.5] text-muted">{t.deleteBody}</p>
              </div>
              <div className="flex w-full gap-1">
                <PillButton
                  tone="soft"
                  onClick={() => {
                    track("post_delete_cancelled", { post_id: postId, from: "detail_menu" });
                    setSheet(null);
                  }}
                >
                  {t.cancel}
                </PillButton>
                <PillButton
                  tone="error"
                  onClick={() => {
                    track("post_deleted", { post_id: postId, from: "detail_menu" });
                    deleteMyPost();
                    setSheet(null);
                    router.push("/home?lang=en");
                  }}
                >
                  {t.delete}
                </PillButton>
              </div>
            </BottomSheet>

            {/* 신고 (남의 글) */}
            <BottomSheet open={sheet === "report"} onClose={() => setSheet(null)} label={t.report}>
              <div className="flex w-full flex-col gap-2 px-6 pt-2 break-keep">
                <h2 className="font-display text-[22px] leading-[1.25]">{t.reportTitle}</h2>
                <p className="text-[15px] leading-[1.5] text-muted">{t.reportBody}</p>
              </div>
              <div role="radiogroup" aria-label={t.reportReason} className="flex w-full flex-col gap-1">
                {t.reasons.map((r) => {
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
                  {t.cancel}
                </PillButton>
                <PillButton
                  tone={reason ? "error" : "disabled"}
                  disabled={!reason}
                  onClick={() => {
                    track("post_reported", { post_id: postId, reason: t.reasons.indexOf(reason ?? "") });
                    setSheet(null);
                    setToast(t.reported);
                  }}
                >
                  {t.report}
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
      {card && (
        <ShareSheet open={shareOpen} onClose={() => setShareOpen(false)} postId={postId} post={card} from="detail_menu" lang={lang} />
      )}
    </>
  );
}
