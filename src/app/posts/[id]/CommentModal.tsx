"use client";

import { PillButton } from "@/components/Buttons";
import { Icon } from "@/components/Icon";
import { HEADER_BUTTON, PageHeader } from "@/components/PageHeader";
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { COMMENT_MAX, type Comment } from "./comments";
import { HIDDEN_COLOR } from "./hidden";
import { splitLines } from "./GravityPile";

/**
  한마디(원글) 말풍선을 누르면 뜨는 답글 레이어
  - 무답글 (Figma 375:7772): 원글 카드 + "이 한마디에 대해 어떻게 생각하나요?"
  - 답글 있음 (Figma 343:326): 원글 카드 아래로 답글들이 가운데 정렬로 쌓임
  - 답글이 많아 넘치면 (Figma 373:7649): 답글 목록만 스크롤, 위아래가 그라데이션으로 흐려짐
  - 답글 목록은 휠처럼: 가운데 온 답글이 가장 크고 진하고, 멀어질수록 작고 흐려집니다 (가운데에 착 붙음).
    답글 말풍선을 눌러 열면(focusId) 그 답글이 가운데로 와서 강조됩니다.
    흐린 답글을 누르면 가운데로, 가운데 답글을 누르면 오른쪽에 버튼 (Figma 377:10769 내 답글: 수정·삭제 /
    377:10770 남의 답글: 신고). 다시 누르거나 스크롤하면 버튼이 사라집니다.
    가운데 답글을 누르면 (내 답글이어도) 입력칸 위에 "↪ 그 답글"이 붙어 그 답글에 답글을 달 수 있습니다.
    신고: 이유를 적는 확인 모달이 위에 하나 더 뜨고, 신고하면 그 답글은 내 화면에서 회색 "가려진 한마디예요"로.
  - 말풍선 위 뱃지: 나 / 글쓴이, 답글이 달렸으면 ↪ 답글 수
  - 답글에 단 답글은 그 답글 바로 아래에 (오래된 순으로 이어지는 대화 순서)
  - 답글을 보내면 입력칸에서 목록 속 제자리로 톡 튀어 올라가 앉고, 그 자리가 가운데로 옵니다.
  - 답글이 넘치면 처음 열 때 첫 답글이 원글 바로 아래에서 시작 (가운데가 아니라). 내리면 점점 가운데 휠로.
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
  onEditReply,
  onDeleteReply,
  onReport,
  hiddenIds,
}: {
  comment: Comment;
  /** 이 한마디 아래 모든 답글 — 답글에 단 답글 포함 (오래된 순) */
  replies: Comment[];
  /** 가운데로 데려와 강조할 답글 id (더미에서 답글 말풍선을 눌러 열었을 때) */
  focusId?: string | null;
  onClose: () => void;
  /** 답글: 원글에 달면 replyTo 없음, 다른 답글에 달면 그 답글 id */
  onReply: (text: string, replyTo?: string) => void;
  onEdit: (text: string) => void;
  onDelete: () => void;
  onEditReply: (id: string, text: string) => void;
  onDeleteReply: (id: string) => void;
  /** 신고 — 신고한 사람 화면에서 그 한마디를 가립니다. */
  onReport: (id: string, reason: string) => void;
  /** 내가 신고해서 가린 한마디 (회색, 누를 수 없음) */
  hiddenIds: Set<string>;
}) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const editField = useRef<HTMLTextAreaElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState("");
  const [draft, setDraft] = useState("");
  // 답글 목록이 칸을 넘쳐 스크롤이 생겼는지 (그때만 위아래 그라데이션)
  const [overflowing, setOverflowing] = useState(false);
  // 휠 가운데에 온 답글, 버튼을 펼친 답글(가운데 답글만), 답글을 다는 대상(남의 답글), 고치는 중인 내 답글
  const [centerId, setCenterId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [target, setTarget] = useState<Comment | null>(null);
  const [editingReply, setEditingReply] = useState<Comment | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // 신고 확인 모달을 띄운 답글
  const [reporting, setReporting] = useState<Comment | null>(null);
  const activeScroll = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  const byId = new Map([comment, ...replies].map((c) => [c.id, c]));
  const replyCounts = new Map<string, number>();
  for (const r of replies) if (r.replyTo) replyCounts.set(r.replyTo, (replyCounts.get(r.replyTo) ?? 0) + 1);
  const thread = threadOrder(comment.id, replies);
  // 방금 보낸 답글: 목록에 나타나면 입력칸에서 날아와 앉는 모션
  const sentRef = useRef(false);
  const knownIds = useRef(new Set(replies.map((r) => r.id)));
  // 처음 열 때 첫 답글을 원글 바로 아래에 둔 경우의 스크롤 위치 (그때만 휠 기준선이 위쪽에서 시작)
  const topStart = useRef<number | null>(null);
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
  const back = () => (reporting ? setReporting(null) : editing ? setEditing(false) : onClose());
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
    // 휠 기준선: 보통은 칸 가운데. 위에서 시작했으면 첫 답글 자리에서 시작해, 스크롤한 만큼 가운데로 내려옵니다.
    let line = el.clientHeight / 2;
    let t = 1;
    if (topStart.current !== null) {
      const top = TOP_GAP + first / 2;
      t = Math.min(1, Math.abs(el.scrollTop - topStart.current) / Math.max(1, line - top));
      line = top + (line - top) * t;
      if (t >= 1) {
        // 기준선이 가운데까지 내려오면 그때부터 가운데에 착 붙는 스크롤을 켭니다.
        topStart.current = null;
        el.style.scrollSnapType = "";
      }
    }
    // 위쪽 그라데이션도 기준선이 내려오는 만큼만 (원글 바로 아래 첫 답글이 흐려지지 않게)
    el.style.setProperty("--fade-top", `${Math.round(56 * t)}px`);
    // 레이아웃 위치(변형 전)로 계산해야 당겨 놓은 위치 때문에 흔들리지 않습니다.
    const center = el.scrollTop + line;
    let nearest: HTMLElement | null = null;
    let nearestDist = Infinity;
    for (const item of items) {
      const dy = item.offsetTop + item.offsetHeight / 2 - center;
      if (Math.abs(dy) < nearestDist) {
        nearestDist = Math.abs(dy);
        nearest = item;
      }
      // 답글 한 칸만큼 멀어질 때마다 한 단계씩 작고 흐리게
      const d = Math.abs(dy) / WHEEL_STEP;
      const inner = item.firstElementChild as HTMLElement;
      inner.style.scale = String(wheelScale(d));
      inner.style.opacity = String(Math.max(WHEEL_MIN_OPACITY, 1 - WHEEL_FADE * d));
      // 줄어든 만큼 가운데 쪽으로 당겨서 말풍선 사이가 벌어지지 않게
      inner.style.translate = `0 ${-Math.sign(dy) * WHEEL_STEP * shrunk(d) * WHEEL_PULL}px`;
    }
    const id = nearest?.dataset.replyId ?? null;
    setCenterId((prev) => (prev === id ? prev : id));
  };
  const opened = useRef(false);
  const updateRef = useRef(updateWheel);
  useLayoutEffect(() => {
    updateRef.current = updateWheel;
  });

  useLayoutEffect(() => {
    const el = list.current;
    if (!el) return;
    updateRef.current();
    // 처음 열 때 답글이 넘치면(아래 그라데이션이 생길 만큼) 첫 답글을 가운데가 아니라 원글 바로 아래에
    if (topStart.current === null && !focusId && !opened.current && el.scrollHeight > el.clientHeight + 1) {
      const first = el.firstElementChild as HTMLElement;
      el.style.scrollSnapType = "none"; // 켜져 있으면 바로 가운데로 붙어 버림
      el.scrollTop = first.offsetTop - TOP_GAP;
      topStart.current = el.scrollTop;
      updateRef.current();
    }
    opened.current = true;
    const observer = new ResizeObserver(() => updateRef.current());
    observer.observe(el);
    return () => observer.disconnect();
  }, [replies.length, focusId]);

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

  /** 답글을 누르면: 흐린 답글은 가운데로, 가운데 답글은 버튼 펼치기/접기 (남의 답글이면 답글 달 대상으로) */
  const tapReply = (r: Comment, item: HTMLElement) => {
    if (r.id !== centerId || hiddenIds.has(r.id)) {
      setActiveId(null);
      centerReply(item);
      return;
    }
    if (activeId === r.id) {
      setActiveId(null);
      if (target?.id === r.id) setTarget(null);
      return;
    }
    activeScroll.current = list.current?.scrollTop ?? 0;
    setActiveId(r.id);
    setEditingReply(null);
    setTarget(r);
  };

  const onListScroll = () => {
    updateWheel();
    // 스크롤하면 펼친 버튼은 접습니다 (답글 달 대상은 그대로).
    if (activeId && Math.abs((list.current?.scrollTop ?? 0) - activeScroll.current) > 4) setActiveId(null);
  };

  const startEditReply = (r: Comment) => {
    setActiveId(null);
    setTarget(null);
    setEditingReply(r);
    setDraft(r.text.replace(/\n/g, " ").slice(0, COMMENT_MAX));
    input.current?.focus();
  };

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const sendReply = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    if (editingReply) {
      if (text !== editingReply.text.replace(/\n/g, " ")) onEditReply(editingReply.id, text);
      setEditingReply(null);
      return;
    }
    sentRef.current = true;
    onReply(text, target?.id);
    setTarget(null);
  };

  // 새 답글이 목록에 들어오면: 그 자리를 가운데로 데려오면서, 말풍선은 입력칸에서 튀어 올라와 앉습니다.
  useLayoutEffect(() => {
    const fresh = replies.filter((r) => !knownIds.current.has(r.id));
    knownIds.current = new Set(replies.map((r) => r.id));
    if (!sentRef.current) return;
    const mine = fresh.find((r) => r.mine);
    const el = list.current;
    if (!mine || !el) return;
    sentRef.current = false;
    const item = el.querySelector<HTMLElement>(`[data-reply-id="${CSS.escape(mine.id)}"]`);
    if (!item) return;
    updateRef.current(); // 위아래 여백부터 새로 맞추고
    // 처음 열 때 위에서 시작한 상태였으면 보통 휠로 돌려놓습니다.
    topStart.current = null;
    el.style.scrollSnapType = "";
    centerReply(item);
    // 입력칸 위 "↪ 답글" 줄이 닫히며 목록 높이가 바뀌므로, 한 프레임 뒤 다시 가운데로 맞춥니다.
    requestAnimationFrame(() => requestAnimationFrame(() => centerReply(item)));
    const row = item.querySelector<HTMLElement>("[data-row]");
    const form = input.current?.closest("form");
    if (!row || !form || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // 도착 자리 = 칸 가운데. 입력칸 높이에서 출발합니다.
    const box = el.getBoundingClientRect();
    const from = form.getBoundingClientRect().top + 32 - (box.top + box.height / 2);
    row.animate(
      [
        { translate: `0 ${from}px`, scale: "0.5", opacity: 0 },
        { translate: `0 ${from * 0.35}px`, scale: "0.9", opacity: 1, offset: 0.45 },
        { translate: "0 0", scale: "1" },
      ],
      { duration: 560, easing: "cubic-bezier(0.34, 1.4, 0.64, 1)" },
    );
    // 목록이 바뀔 때마다 (답글 하나가 더해질 때)
  }, [replies]);

  const banner = editingReply ?? target;
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
              <Badges comment={comment} replies={replyCounts.get(comment.id) ?? 0} card />
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
              onScroll={onListScroll}
              className={`relative flex h-full snap-y snap-mandatory flex-col items-center gap-0.5 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
                overflowing
                  ? "[mask-image:linear-gradient(to_bottom,transparent,black_var(--fade-top,56px),black_calc(100%-56px),transparent)]"
                  : ""
              }`}
            >
              {thread.map((r) => {
                const active = activeId === r.id;
                const isHidden = hiddenIds.has(r.id);
                const parent = r.replyTo && r.replyTo !== comment.id ? byId.get(r.replyTo) : undefined;
                return (
                  <div
                    key={r.id}
                    data-reply-id={r.id}
                    onClick={(e) => tapReply(r, e.currentTarget)}
                    className="shrink-0 cursor-pointer snap-center transition-[opacity,translate] duration-300 ease-out starting:translate-y-2 starting:opacity-0"
                  >
                    {/* 휠 크기·흐림·당김은 스크롤할 때 updateWheel이 직접 바꿉니다. */}
                    <div className="flex flex-col items-center gap-1 will-change-[scale,opacity,translate]">
                      {parent && (
                        <span className="flex max-w-[220px] items-center gap-1 text-[12px] leading-none font-semibold text-white/50">
                          <ReplyArrowIcon size={12} />
                          <span className="truncate">{parent.text.replace(/\n/g, " ")}</span>
                        </span>
                      )}
                      <div data-row className="flex items-center">
                        <p
                          className={`relative flex items-center gap-2 rounded-[32px] py-4 pr-6 pl-2.5 text-center text-[20px] leading-[1.45] font-bold tracking-[-0.4px] whitespace-pre-line ${
                            isHidden ? "text-black/55" : "text-black"
                          }`}
                          style={{ background: isHidden ? HIDDEN_COLOR : r.color }}
                        >
                          <span
                            className={`flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-[20px] leading-none ${isHidden ? "opacity-50 grayscale" : ""}`}
                            aria-hidden
                          >
                            {r.author.kind === "korean" ? "🇰🇷" : r.author.flag}
                          </span>
                          {splitLines(r.text.replace(/\n/g, " ")).join("\n")}
                          <Badges comment={r} replies={replyCounts.get(r.id) ?? 0} />
                        </p>
                        {/* 가운데 답글을 누르면 오른쪽에 펼쳐지는 버튼 (펼치는 동안 말풍선이 왼쪽으로 비켜남) */}
                        <div
                          className={`flex gap-1 overflow-hidden transition-[width,opacity,padding] duration-250 ease-out ${
                            active ? `pl-5 opacity-100 ${r.mine ? "w-[120px]" : "w-[68px]"}` : "w-0 pl-0 opacity-0"
                          }`}
                          onClick={(e) => e.stopPropagation()}
                          aria-hidden={!active}
                        >
                          {r.mine ? (
                            <>
                              <button type="button" tabIndex={active ? 0 : -1} onClick={() => startEditReply(r)} aria-label="답글 수정" className={REPLY_BUTTON}>
                                <Icon name="pencil" />
                              </button>
                              <button
                                type="button"
                                tabIndex={active ? 0 : -1}
                                onClick={() => {
                                  setActiveId(null);
                                  if (editingReply?.id === r.id) {
                                    setEditingReply(null);
                                    setDraft("");
                                  }
                                  onDeleteReply(r.id);
                                }}
                                aria-label="답글 삭제"
                                className={REPLY_BUTTON}
                              >
                                <Icon name="trash" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              tabIndex={active ? 0 : -1}
                              onClick={() => {
                                setActiveId(null);
                                setReporting(r);
                              }}
                              aria-label="답글 신고"
                              className={REPLY_BUTTON}
                            >
                              <ReportIcon />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 답글 입력 (수정 중에는 감춤) */}
        <form
          onSubmit={sendReply}
          className={`flex shrink-0 items-end gap-0.5 px-2 pb-[calc(24px+env(safe-area-inset-bottom))] transition-opacity duration-200 ${
            editing ? "pointer-events-none opacity-0" : ""
          }`}
        >
          <div className={`flex min-w-0 flex-1 flex-col bg-surface-2 font-semibold ${banner ? "rounded-[32px]" : "rounded-full"}`}>
            {/* 남의 답글에 답글을 달거나 내 답글을 고칠 때: 입력칸 위에 그 답글 (메시지 답장처럼) */}
            {banner && (
              <div className="flex animate-toast-in items-center gap-2 pt-3.5 pr-3 pl-5 text-[16px] text-white/60">
                {editingReply ? <Icon name="pencil" size={18} /> : <ReplyArrowIcon size={20} />}
                <span className="min-w-0 flex-1 truncate font-bold text-white">{banner.text.replace(/\n/g, " ")}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (editingReply) setDraft("");
                    setEditingReply(null);
                    setTarget(null);
                  }}
                  aria-label={editingReply ? "답글 수정 취소" : "답글 대상 취소"}
                  className="flex size-7 shrink-0 items-center justify-center rounded-full text-white/60"
                >
                  <Icon name="x" size={16} />
                </button>
              </div>
            )}
          <label className="flex h-16 min-w-0 items-center gap-2 px-5">
            <span className="sr-only">{editingReply ? "답글 고치기" : "답글 남기기"}</span>
            <input
              ref={input}
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
          </div>
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label={editingReply ? "답글 수정 완료" : "답글 보내기"}
            tabIndex={editing ? -1 : 0}
            className="flex size-16 shrink-0 items-center justify-center rounded-full bg-white transition-transform active:scale-90"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- 작은 SVG 아이콘 */}
            <img src="/images/icon-send.svg" width={22} height={22} alt="" className="-rotate-30" />
          </button>
        </form>
      </div>

      {reporting && (
        <ReportDialog
          reply={reporting}
          onCancel={() => setReporting(null)}
          onSubmit={(reason) => {
            onReport(reporting.id, reason);
            if (target?.id === reporting.id) setTarget(null);
            setReporting(null);
            setToast("신고가 접수됐어요");
          }}
        />
      )}

      {toast && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+104px)] z-10 flex justify-center px-4">
          <p
            role="status"
            className="flex animate-toast-in items-center gap-2 rounded-full bg-on-dark px-5 py-3 text-[14px] font-bold text-on-light shadow-[0_12px_32px_rgba(0,0,0,0.4)]"
          >
            <Icon name="check" size={16} strokeWidth={3} />
            {toast}
          </p>
        </div>
      )}
    </div>
  );
}

/** 대화 순서: 원글에 단 답글을 오래된 순으로, 각 답글 바로 아래에 그 답글에 단 답글들 (부모가 지워졌으면 원글 아래로) */
function threadOrder(rootId: string, replies: Comment[]): Comment[] {
  const ids = new Set(replies.map((r) => r.id));
  const kids = new Map<string, Comment[]>();
  for (const r of replies) {
    const parent = r.replyTo && ids.has(r.replyTo) ? r.replyTo : rootId;
    kids.set(parent, [...(kids.get(parent) ?? []), r]);
  }
  const out: Comment[] = [];
  const seen = new Set<string>();
  const walk = (id: string) => {
    for (const r of kids.get(id) ?? []) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      out.push(r);
      walk(r.id);
    }
  };
  walk(rootId);
  return out;
}

/** 위에서 시작할 때 첫 답글 위 여백 (원글 카드와의 간격) */
const TOP_GAP = 16;

/** 휠 한 칸: 답글 말풍선 높이(약 68px) + 간격 */
const WHEEL_STEP = 70;
/** 한 칸 멀어질 때마다 줄어드는 비율과 가장 작은 크기, 흐려지는 비율과 가장 흐린 정도 */
const WHEEL_SHRINK = 0.16;
const WHEEL_MIN_SCALE = 0.72;
const WHEEL_FADE = 0.45;
const WHEEL_MIN_OPACITY = 0.15;
/** 줄어든 만큼을 얼마나 가운데로 당길지 (0이면 안 당김 — 말풍선 사이가 벌어짐) */
const WHEEL_PULL = 0.85;

const wheelScale = (d: number) => Math.max(WHEEL_MIN_SCALE, 1 - WHEEL_SHRINK * d);
/** 가운데부터 d칸까지 말풍선들이 줄어든 높이의 합 (칸 단위) — 그만큼 당겨 붙입니다. */
function shrunk(d: number) {
  const flat = (1 - WHEEL_MIN_SCALE) / WHEEL_SHRINK; // 이 거리부터는 더 안 작아짐
  if (d <= flat) return (WHEEL_SHRINK * d * d) / 2;
  return (WHEEL_SHRINK * flat * flat) / 2 + (1 - WHEEL_MIN_SCALE) * (d - flat);
}

// Figma 377:10769 버튼 (neutral/900 = surface)
const REPLY_BUTTON = "flex size-12 shrink-0 items-center justify-center rounded-full bg-surface text-on-dark transition-transform active:scale-90";

// 답글 표시 ↪
function ReplyArrowIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      <path d="M4 5v4a6 6 0 0 0 6 6h10" />
      <path d="m15 10 5 5-5 5" />
    </svg>
  );
}

/**
  말풍선 위 뱃지 (더미 말풍선 태그와 같은 모양, 조금 크게): 나 / 글쓴이, 답글이 달렸으면 ↪ 답글 수
  card: 원글 카드 — 카드 안쪽 위에 붙임
*/
function Badges({ comment, replies, card = false }: { comment: Comment; replies: number; card?: boolean }) {
  const who = comment.mine ? "나" : comment.author.kind === "author" ? "글쓴이" : null;
  if (!who && !replies) return null;
  return (
    <span className={`absolute flex gap-1 ${card ? "top-3 left-1/2 -translate-x-1/2" : "-top-2.5 left-6"}`}>
      {who && <span className={BADGE}>{who}</span>}
      {replies > 0 && (
        <span className={`${BADGE} gap-0.5 pl-1.5`} aria-label={`답글 ${replies}개`}>
          <ReplyArrowIcon size={12} />
          {replies}
        </span>
      )}
    </span>
  );
}

const BADGE = "flex h-[22px] items-center rounded-full bg-black px-2 text-[12px] leading-none font-bold tracking-[-0.24px] whitespace-nowrap text-white";

/**
  답글 신고 확인 모달 — 답글 레이어 위에 한 겹 더 뜹니다.
  이유를 적어야 신고할 수 있고, 신고하면 그 답글은 내 화면에서 가려진다고 알려 줍니다.
*/
function ReportDialog({ reply, onCancel, onSubmit }: { reply: Comment; onCancel: () => void; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  const field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => field.current?.focus(), []);
  const ok = reason.trim().length > 0;

  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="report-title" className="absolute inset-0 z-20 flex items-center justify-center px-5">
      <div
        className="absolute inset-0 bg-background/60 transition-[background-color] duration-200 starting:bg-background/0"
        onClick={onCancel}
        aria-hidden
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (ok) onSubmit(reason.trim());
        }}
        className="relative flex w-full flex-col gap-5 rounded-[32px] bg-surface p-6 break-keep text-on-dark shadow-[0_12px_40px_rgba(0,0,0,0.5)] transition-[opacity,scale] duration-250 ease-out starting:scale-95 starting:opacity-0"
      >
        <div className="flex flex-col gap-2">
          <h2 id="report-title" className="font-display text-[22px] leading-[1.25]">
            이 답글을 신고할까요?
          </h2>
          <p className="truncate text-[15px] leading-[1.5] text-white/60">“{reply.text.replace(/\n/g, " ")}”</p>
        </div>
        <label className="flex flex-col gap-2">
          <span className="text-[14px] font-semibold">왜 신고하려고 하나요?</span>
          <textarea
            ref={field}
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, REPORT_MAX))}
            rows={3}
            placeholder="신고하는 이유를 적어주세요"
            className="resize-none rounded-[20px] bg-surface-2 px-4 py-3 text-[15px] leading-[1.5] outline-none placeholder:text-white/40"
          />
          <span className="self-end text-[12px] text-white/40">
            {reason.length}/{REPORT_MAX}
          </span>
        </label>
        <p className="flex items-start gap-2 text-[14px] leading-[1.5] text-white/70">
          <Icon name="info" size={18} className="mt-0.5 shrink-0" />
          신고하면 이 답글은 내 화면에서 가려져요. 확인한 뒤 조치할게요.
        </p>
        <div className="flex gap-1">
          <PillButton tone="soft" onClick={onCancel}>
            취소
          </PillButton>
          <PillButton type="submit" tone={ok ? "error" : "disabled"} disabled={!ok}>
            신고하기
          </PillButton>
        </div>
      </form>
    </div>
  );
}

const REPORT_MAX = 100;

// mingcute report-line (Apache-2.0) — Figma 377:10788
function ReportIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 21H22M12 9.23077L9.85714 12.6923H14.1429L12 16.1538M20.5714 21V11.3077C20.5714 9.10436 19.6684 6.99126 18.0609 5.43327C16.4535 3.87527 14.2733 3 12 3C9.72672 3 7.54654 3.87527 5.93909 5.43327C4.33163 6.99126 3.42857 9.10436 3.42857 11.3077V21H20.5714Z" />
    </svg>
  );
}
