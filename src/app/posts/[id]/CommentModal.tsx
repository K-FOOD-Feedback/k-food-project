"use client";

import { Icon } from "@/components/Icon";
import { HEADER_BUTTON, PageHeader } from "@/components/PageHeader";
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { COMMENT_MAX, type Comment } from "./comments";
import { splitLines } from "./GravityPile";

/**
  한마디(원글) 말풍선을 누르면 뜨는 답글 레이어
  - 무답글 (Figma 375:7772): 원글 카드 + "이 한마디에 대해 어떻게 생각하나요?"
  - 답글 있음 (Figma 343:326): 원글 카드 아래로 답글들이 가운데 정렬로 쌓임
  - 답글이 많아 넘치면 (Figma 373:7649): 답글 목록만 스크롤, 위아래가 그라데이션으로 흐려짐
  - 답글 목록은 휠처럼: 가운데 온 답글이 가장 크고 진하고, 멀어질수록 작고 흐려집니다 (가운데에 착 붙음).
    답글 말풍선을 눌러 열면(focusId) 그 답글이 가운데로 와서 강조됩니다.
  - 수정 (Figma 375:8019, 내 한마디만): 원글 카드가 뒤집히며 어두운 수정 카드로 → 체크로 저장하면 다시 뒤집혀
    원래대로, 고친 한마디는 카드에 "수정됨" 표시
  닫기: X, 배경 누르기, Esc (수정 중이면 X·Esc는 수정 취소)
*/
export function CommentModal({
  comment,
  replies,
  focusId,
  onClose,
  onReply,
  onEdit,
  onDelete,
}: {
  comment: Comment;
  /** 이 한마디에 달린 답글 (오래된 순) */
  replies: Comment[];
  /** 가운데로 데려와 강조할 답글 id (더미에서 답글 말풍선을 눌러 열었을 때) */
  focusId?: string | null;
  onClose: () => void;
  onReply: (text: string) => void;
  onEdit: (text: string) => void;
  onDelete: () => void;
}) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const editField = useRef<HTMLTextAreaElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState("");
  const [draft, setDraft] = useState("");
  // 답글 목록이 칸을 넘쳐 스크롤이 생겼는지 (그때만 위아래 그라데이션)
  const [overflowing, setOverflowing] = useState(false);
  const canEdit = !!comment.mine;

  const startEdit = () => {
    setEditDraft(comment.text.replace(/\n/g, " "));
    setEditing(true);
    // 카드가 반쯤 뒤집혔을 때 입력칸에 커서를 둡니다.
    window.setTimeout(() => editField.current?.focus(), 250);
  };
  const finishEdit = () => {
    const text = editDraft.trim();
    if (text && text !== comment.text.replace(/\n/g, " ")) onEdit(text);
    setEditing(false);
  };
  // X·Esc: 수정 중이면 수정만 취소, 아니면 레이어 닫기
  const back = () => (editing ? setEditing(false) : onClose());
  const backRef = useRef(back);
  useLayoutEffect(() => {
    backRef.current = back;
  });

  useEffect(() => {
    closeButton.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") backRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 휠: 첫·끝 답글도 가운데까지 올 수 있게 위아래 여백을 두고, 스크롤할 때마다 가운데에서 먼 만큼 줄이고 흐리게
  const updateWheel = () => {
    const el = list.current;
    if (!el) return;
    const items = Array.from(el.children) as HTMLElement[];
    if (!items.length) return;
    const first = items[0].offsetHeight;
    const last = items[items.length - 1].offsetHeight;
    el.style.paddingTop = `${Math.max(0, el.clientHeight / 2 - first / 2)}px`;
    el.style.paddingBottom = `${Math.max(0, el.clientHeight / 2 - last / 2)}px`;
    setOverflowing(el.scrollHeight > el.clientHeight + 1);
    const box = el.getBoundingClientRect();
    const center = box.top + box.height / 2;
    for (const item of items) {
      const r = item.getBoundingClientRect();
      // 답글 한 칸(약 72px)만큼 멀어질 때마다 한 단계씩
      const d = Math.abs(r.top + r.height / 2 - center) / WHEEL_STEP;
      const bubble = item.firstElementChild as HTMLElement;
      bubble.style.scale = String(Math.max(0.7, 1 - 0.13 * d));
      bubble.style.opacity = String(Math.max(0.2, 1 - 0.4 * d));
    }
  };
  const updateRef = useRef(updateWheel);
  useLayoutEffect(() => {
    updateRef.current = updateWheel;
  });

  useLayoutEffect(() => {
    const el = list.current;
    if (!el) return;
    updateRef.current();
    const observer = new ResizeObserver(() => updateRef.current());
    observer.observe(el);
    return () => observer.disconnect();
  }, [replies.length]);

  // 답글 말풍선을 눌러 열었으면 그 답글을 가운데로 데려와 톡 강조합니다.
  useLayoutEffect(() => {
    const el = list.current;
    const item = focusId ? el?.querySelector<HTMLElement>(`[data-reply-id="${CSS.escape(focusId)}"]`) : null;
    if (!el || !item) return;
    el.scrollTop = item.offsetTop - el.clientHeight / 2 + item.offsetHeight / 2;
    updateRef.current();
    (item.firstElementChild as HTMLElement).animate(
      [{ translate: "0 0" }, { translate: "0 0", scale: "1.08", offset: 0.35 }, { translate: "0 0" }],
      { duration: 420, delay: 200, easing: "ease-out", composite: "add" },
    );
    // 열릴 때 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 답글을 누르면 그 답글을 가운데로 */
  const centerReply = (item: HTMLElement) => {
    const el = list.current;
    if (!el) return;
    el.scrollTo({ top: item.offsetTop - el.clientHeight / 2 + item.offsetHeight / 2, behavior: "smooth" });
  };

  const sendReply = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    onReply(text);
    // 새 답글이 보이도록 목록 맨 아래로
    requestAnimationFrame(() => list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" }));
  };

  const lines = splitLines(comment.text.replace(/\n/g, " ")).join("\n");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`한마디: ${comment.text.replace(/\n/g, " ")}`}
      className="fixed inset-y-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2"
    >
      {/* 흐린 배경 — 눌러도 닫힘. 어둡기와 흐림을 0부터 같이 올립니다
          (부모를 opacity로 페이드하면 그동안 backdrop-filter가 꺼져 있다가 끝에 툭 켜져서) */}
      <div
        className="absolute inset-0 bg-background/80 transition-[background-color,backdrop-filter,-webkit-backdrop-filter] duration-200 ease-out [-webkit-backdrop-filter:blur(8px)] [backdrop-filter:blur(8px)] starting:bg-background/0 starting:[-webkit-backdrop-filter:blur(0px)] starting:[backdrop-filter:blur(0px)]"
        onClick={onClose}
        aria-hidden
      />

      {/* 내용: 빈 곳을 누르면 아래 배경이 눌려 닫히도록 통과시킵니다. */}
      <div className="pointer-events-none relative flex h-full flex-col transition-opacity duration-200 ease-out starting:opacity-0 [&>*]:pointer-events-auto">
        <PageHeader
          left={
            <button ref={closeButton} type="button" onClick={back} aria-label={editing ? "수정 취소" : "닫기"} className={HEADER_BUTTON}>
              <Icon name="x" />
            </button>
          }
          right={
            editing ? (
              <button
                type="button"
                onClick={finishEdit}
                aria-label="수정 완료"
                className="flex size-16 shrink-0 items-center justify-center rounded-full bg-white text-black transition-transform active:scale-95"
              >
                <Icon name="check" />
              </button>
            ) : (
              canEdit && (
                <>
                  <button type="button" onClick={startEdit} aria-label="한마디 수정" className={HEADER_BUTTON}>
                    <Icon name="pencil" />
                  </button>
                  <button type="button" onClick={onDelete} aria-label="한마디 삭제" className={HEADER_BUTTON}>
                    <Icon name="trash" />
                  </button>
                </>
              )
            )
          }
        />

        {/* 원글 카드 — 수정을 누르면 Y축으로 뒤집혀 뒷면(수정 카드)이 보입니다. */}
        <div className="mx-5 mt-4 h-[130px] shrink-0 perspective-[1200px] transition-[opacity,scale] duration-250 ease-out starting:scale-95 starting:opacity-0">
          <div
            className={`relative size-full transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] transform-3d ${
              editing ? "rotate-y-180" : ""
            }`}
          >
            <div
              className="absolute inset-0 flex flex-col items-center justify-center rounded-[32px] px-10 py-[30px] backface-hidden"
              style={{ background: comment.color }}
              aria-hidden={editing}
            >
              <p className="text-center text-[22px] leading-[1.45] font-bold tracking-[-0.44px] whitespace-pre-line text-black">{lines}</p>
              {comment.edited && (
                <span className="absolute bottom-3 text-[12px] leading-none font-semibold text-black/50">수정됨</span>
              )}
            </div>
            <div
              className="absolute inset-0 flex rotate-y-180 items-center justify-center rounded-[32px] bg-surface-2 px-10 py-[30px] shadow-[0_4px_15px_rgba(0,0,0,0.25)] backface-hidden"
              aria-hidden={!editing}
            >
              <label className="w-full">
                <span className="sr-only">한마디 고치기</span>
                <textarea
                  ref={editField}
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value.replace(/\n/g, "").slice(0, COMMENT_MAX))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      finishEdit();
                    }
                  }}
                  rows={1}
                  tabIndex={editing ? 0 : -1}
                  // 글 길이만큼만 높아져서(최대 2줄) 카드 가운데에 옵니다.
                  className="block max-h-[64px] w-full resize-none overflow-hidden bg-transparent text-center [field-sizing:content] text-[22px] leading-[1.45] font-bold tracking-[-0.44px] text-on-dark outline-none"
                />
              </label>
            </div>
          </div>
        </div>

        {/* 답글 목록 (수정 중에는 감춤) */}
        <div className={`relative min-h-0 flex-1 transition-opacity duration-200 ${editing ? "pointer-events-none opacity-0" : ""}`}>
          {replies.length === 0 ? (
            <p className="absolute inset-0 flex items-center justify-center text-center text-[20px] leading-[1.45] font-extrabold tracking-[-0.4px] whitespace-pre-line text-white/70">
              {"이 한마디에 대해\n어떻게 생각하나요?"}
            </p>
          ) : (
            <div
              ref={list}
              onScroll={updateWheel}
              className={`relative flex h-full snap-y snap-mandatory flex-col items-center gap-1 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
                overflowing ? "[mask-image:linear-gradient(to_bottom,transparent,black_56px,black_calc(100%-56px),transparent)]" : ""
              }`}
            >
              {replies.map((r) => (
                <div
                  key={r.id}
                  data-reply-id={r.id}
                  onClick={(e) => centerReply(e.currentTarget)}
                  className="shrink-0 snap-center transition-[opacity,translate] duration-300 ease-out starting:translate-y-2 starting:opacity-0"
                >
                  {/* 휠 크기·흐림은 스크롤할 때 updateWheel이 직접 바꿉니다. */}
                  <p
                    className="rounded-[32px] px-6 py-4 text-center text-[20px] leading-[1.45] font-bold tracking-[-0.4px] whitespace-pre-line text-black will-change-[scale,opacity]"
                    style={{ background: r.color }}
                  >
                    {splitLines(r.text.replace(/\n/g, " ")).join("\n")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 답글 입력 (수정 중에는 감춤) */}
        <form
          onSubmit={sendReply}
          className={`flex shrink-0 items-center gap-0.5 px-2 pb-[calc(24px+env(safe-area-inset-bottom))] transition-opacity duration-200 ${
            editing ? "pointer-events-none opacity-0" : ""
          }`}
        >
          <label className="flex h-16 min-w-0 flex-1 items-center gap-2 rounded-full bg-surface-2 px-5 font-semibold">
            <span className="sr-only">답글 남기기</span>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, COMMENT_MAX))}
              placeholder="답글을 남겨보세요"
              enterKeyHint="send"
              tabIndex={editing ? -1 : 0}
              className="min-w-0 flex-1 bg-transparent text-[16px] text-on-dark outline-none placeholder:text-white/40"
            />
            <span className="shrink-0 text-[12px] text-white/40">
              {draft.length}/{COMMENT_MAX}
            </span>
          </label>
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label="답글 보내기"
            tabIndex={editing ? -1 : 0}
            className="flex size-16 shrink-0 items-center justify-center rounded-full bg-white transition-transform active:scale-90"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- 작은 SVG 아이콘 */}
            <img src="/images/icon-send.svg" width={22} height={22} alt="" className="-rotate-30" />
          </button>
        </form>
      </div>
    </div>
  );
}

/** 휠 한 칸: 답글 말풍선 높이(약 62px) + 간격 */
const WHEEL_STEP = 72;
