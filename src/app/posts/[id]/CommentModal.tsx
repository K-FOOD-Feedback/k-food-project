"use client";

import { PillButton } from "@/components/Buttons";
import { Icon } from "@/components/Icon";
import { HEADER_BUTTON, PageHeader } from "@/components/PageHeader";
import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type FormEvent, type PointerEvent, type Ref } from "react";
import { COMMENT_MAX, whoOf, type Comment } from "./comments";
import { COMMENTS_COPY, type CommentsCopy, type CommentsLang } from "./copy";
import { HIDDEN_COLOR } from "./hidden";
import { splitLines } from "./GravityPile";
import { clampText, limitTyped, textLength } from "@/lib/text-length";

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
  - 답글이 칸에 다 들어가면 휠·스크롤 없이 모두 같은 크기로, 묶음째 칸 가운데에 (어느 답글이든 누르면 바로 버튼).
    많아져서 맨 위 답글이 원글 아래 24px에 닿으면 그때부터 스크롤(+그라데이션)과 휠.
  - 스크롤할 때 첫 답글은 원글 아래 24px에서 시작하고, 맨 위로 올려도 거기까지만 (원글과 사이가 벌어지지 않게).
    맨 위 근처에서는 휠 기준선이 첫 답글 자리에 있다가, 내리는 만큼 가운데로 내려와 보통 휠이 됩니다.
  - 수정 (Figma 375:8019, 내 원글·내 답글): 화면이 어두워지며 그 말풍선이 화면 가운데로 날아와 뒤집혀 수정 카드로
    → 체크로 저장하면 다시 뒤집혀 "수정됨"이 붙고 원래 자리로 돌아갑니다.
  - 아래 답글은 늘 윗 답글 뒤에 깔립니다 (겹쳐도 윗 답글이 보이게).
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
  lang = "ko",
  writeLocked = false,
  onLockedWrite,
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
  /** 화면 문구 언어 (한마디 전체 화면의 지구본으로 바꿈) */
  lang?: CommentsLang;
  /** 로그인 전 외국인: 답글 칸을 누르면 쓰는 대신 onLockedWrite (로그인 시트) */
  writeLocked?: boolean;
  onLockedWrite?: () => void;
}) {
  const t = COMMENTS_COPY[lang];
  const closeButton = useRef<HTMLButtonElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const rootCard = useRef<HTMLDivElement>(null);
  const editCard = useRef<EditCardHandle>(null);
  const list = useRef<HTMLDivElement>(null);
  // 고치는 중인 한마디 (원글 또는 내 답글)
  const [editTarget, setEditTarget] = useState<Comment | null>(null);
  const editing = !!editTarget;
  const [editDraft, setEditDraft] = useState("");
  const [draft, setDraft] = useState("");
  // 답글 목록이 칸을 넘쳐 스크롤이 생겼는지 (그때만 위아래 그라데이션)
  const [overflowing, setOverflowing] = useState(false);
  // 휠 가운데에 온 답글, 버튼을 펼친 답글(가운데 답글만), 답글을 다는 대상
  const [centerId, setCenterId] = useState<string | null>(null);
  // 손가락으로 끄는 중인지 (그동안은 가운데 답글에 붙이지 않음), 스크롤이 멈추면 붙이는 타이머
  const touching = useRef(false);
  const settleTimer = useRef(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [target, setTarget] = useState<Comment | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // 신고 확인 모달을 띄운 답글
  const [reporting, setReporting] = useState<Comment | null>(null);
  // 지우기 전 확인 창을 띄운 내 한마디·답글 (지현 요청: "삭제하시겠습니까?" 아니오/네)
  const [deleting, setDeleting] = useState<Comment | null>(null);
  // 오른쪽 위 ⋯ 메뉴 (남의 원글 한마디: 신고하기)
  const [menuOpen, setMenuOpen] = useState(false);
  const activeScroll = useRef(0);
  // 흐린 답글을 밀어 가운데로 데려오는 중 — 그 스크롤로는 펼친 버튼을 접지 않음
  const autoScroll = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const byId = new Map([comment, ...replies].map((c) => [c.id, c]));
  const replyCounts = new Map<string, number>();
  for (const r of replies) if (r.replyTo) replyCounts.set(r.replyTo, (replyCounts.get(r.replyTo) ?? 0) + 1);
  const thread = threadOrder(comment.id, replies);
  // 방금 보낸 답글: 목록에 나타나면 입력칸에서 날아와 앉는 모션
  const sentRef = useRef(false);
  const knownIds = useRef(new Set(replies.map((r) => r.id)));
  const canEdit = !!comment.mine;

  const startEdit = (c: Comment) => {
    setActiveId(null);
    setTarget(null);
    setEditDraft(c.text.replace(/\n/g, " "));
    setEditTarget(c);
  };
  const finishEdit = () => {
    if (!editTarget) return;
    const text = editDraft.trim();
    const changed = !!text && text !== editTarget.text.replace(/\n/g, " ");
    if (changed) {
      if (editTarget.id === comment.id) onEdit(text);
      else onEditReply(editTarget.id, text);
    }
    editCard.current?.close(changed ? text : null);
  };
  const cancelEdit = () => editCard.current?.close(null);
  /** 수정 카드가 날아갔다 돌아올 원래 말풍선 */
  const editSource = () =>
    !editTarget
      ? null
      : editTarget.id === comment.id
        ? rootCard.current
        : (list.current?.querySelector<HTMLElement>(`[data-reply-id="${CSS.escape(editTarget.id)}"] [data-bubble]`) ?? null);
  // X·Esc: 수정 중이면 수정만 취소, 아니면 레이어 닫기
  const back = () =>
    deleting
      ? setDeleting(null)
      : reporting
        ? setReporting(null)
        : menuOpen
          ? setMenuOpen(false)
          : editing
            ? cancelEdit()
            : onClose();
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
    // 답글 묶음 높이 (여백과 상관없는 원래 크기)
    const lastEl = items[items.length - 1];
    const content = lastEl.offsetTop + lastEl.offsetHeight - items[0].offsetTop;
    // 칸에 다 들어가면(맨 위 답글이 원글 아래 24px보다 내려와 있으면) 휠 없이 묶음째 가운데에
    // (키보드 위에 답글 대상을 둘 때는 늘 스크롤 목록으로)
    const fits = !el.dataset.line && content <= el.clientHeight - 2 * TOP_GAP;
    if (fits) {
      el.dataset.compact = "1";
      el.style.paddingTop = `${(el.clientHeight - content) / 2}px`;
      el.style.paddingBottom = "0px";
      el.scrollTop = 0;
      setOverflowing(false);
      for (const item of items) {
        const inner = item.firstElementChild as HTMLElement;
        inner.style.scale = "1";
        inner.style.opacity = "1";
        inner.style.translate = "0 0";
      }
      setCenterId(null);
      return;
    }
    delete el.dataset.compact;
    // 위는 원글 바로 아래까지만, 아래는 끝 답글도 가운데까지 올 수 있게
    // 키보드 위 기준선이 있으면 맨 위 답글도 거기(칸 맨 아래)까지 내려올 수 있게 위 여백을 늘림
    el.style.paddingTop = el.dataset.line ? `${Math.max(TOP_GAP, Number(el.dataset.line) - first / 2)}px` : `${TOP_GAP}px`;
    el.style.paddingBottom = `${Math.max(0, el.clientHeight / 2 - last / 2)}px`;
    setOverflowing(el.scrollHeight > el.clientHeight + 1);
    // 휠 기준선: 맨 위에서는 첫 답글 자리, 내리는 만큼 내려와 칸 가운데에서 멈춥니다.
    // (키보드가 떠 있고 답글 대상이 있으면 기준선은 칸 맨 아래 — 입력칸 바로 위)
    const { line, t } = wheelLine(el, first);
    // 위쪽 그라데이션도 기준선이 내려오는 만큼만 (원글 바로 아래 첫 답글이 흐려지지 않게)
    el.style.setProperty("--fade-top", `${Math.round(56 * t)}px`);
    // 레이아웃 위치(변형 전)로 계산해야 당겨 놓은 위치 때문에 흔들리지 않습니다.
    const center = el.scrollTop + line;
    const dys = items.map((item) => item.offsetTop + item.offsetHeight / 2 - center);
    const hs = items.map((item) => item.offsetHeight);
    // 답글 한 칸만큼 멀어질 때마다 한 단계씩 작고 흐리게
    const scales = dys.map((dy) => wheelScale(Math.abs(dy) / WHEEL_STEP));
    let c = 0;
    dys.forEach((dy, i) => {
      if (Math.abs(dy) < Math.abs(dys[c])) c = i;
    });
    // 줄어든 만큼 가운데 쪽으로 당겨서 말풍선 사이 간격이 그대로 유지되게 (실제 높이로 — 두 줄 답글도 안 겹침).
    // 가운데 답글부터 위아래로, 이웃끼리 줄어든 높이의 반씩을 더해 갑니다.
    const shifts = new Array<number>(items.length);
    shifts[c] = -dys[c] * (1 - scales[c]);
    for (let i = c + 1; i < items.length; i++)
      shifts[i] = shifts[i - 1] - (hs[i - 1] * (1 - scales[i - 1]) + hs[i] * (1 - scales[i])) / 2;
    for (let i = c - 1; i >= 0; i--)
      shifts[i] = shifts[i + 1] + (hs[i + 1] * (1 - scales[i + 1]) + hs[i] * (1 - scales[i])) / 2;
    items.forEach((item, i) => {
      const inner = item.firstElementChild as HTMLElement;
      inner.style.scale = String(scales[i]);
      inner.style.opacity = String(Math.max(WHEEL_MIN_OPACITY, 1 - (WHEEL_FADE * Math.abs(dys[i])) / WHEEL_STEP));
      inner.style.translate = `0 ${shifts[i]}px`;
    });
    const id = items[c]?.dataset.replyId ?? null;
    setCenterId((prev) => (prev === id ? prev : id));
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
  // 원글 말풍선을 눌러 열었으면 원글 카드가 같은 모션으로 톡.
  useLayoutEffect(() => {
    const el = list.current;
    const item = focusId ? el?.querySelector<HTMLElement>(`[data-reply-id="${CSS.escape(focusId)}"]`) : null;
    if (!item) {
      rootCard.current?.animate([{ scale: "1" }, { scale: "1.08", offset: 0.35 }, { scale: "1" }], {
        duration: 420,
        delay: 200,
        easing: "ease-out",
      });
      return;
    }
    if (!el) return;
    el.scrollTop = scrollFor(el, item);
    updateRef.current();
    (item.firstElementChild as HTMLElement).animate(
      [{ translate: "0 0" }, { translate: "0 0", scale: "1.08", offset: 0.35 }, { translate: "0 0" }],
      { duration: 420, delay: 200, easing: "ease-out", composite: "add" },
    );
    // 열릴 때 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 답글을 누르면 그 답글을 휠 기준선으로 (보통은 가운데, 맨 위 답글들은 원글 바로 아래 근처) */
  const centerReply = (item: HTMLElement) => {
    const el = list.current;
    if (!el) return;
    el.scrollTo({ top: scrollFor(el, item), behavior: "smooth" });
  };

  /**
    답글을 한 번 누르면: 가운데로 데려와 강조 + 오른쪽 버튼 + 답글 대상(입력칸에 커서)까지 한 번에.
    펼친 답글을 다시 누르면 접기. 가려진 답글은 가운데로만.
  */
  const tapReply = (r: Comment, item: HTMLElement) => {
    if (hiddenIds.has(r.id)) {
      setActiveId(null);
      centerReply(item);
      return;
    }
    if (activeId === r.id) {
      setActiveId(null);
      if (target?.id === r.id) setTarget(null);
      return;
    }
    openAndCenter(r, item);
  };

  /** 펼치면서 (흐린 답글이면) 가운데로 — 그 스크롤로는 펼친 버튼을 접지 않음 */
  const openAndCenter = (r: Comment, item: HTMLElement) => {
    openReply(r);
    const el = list.current;
    if (!el || el.dataset.compact) return;
    activeScroll.current = scrollFor(el, item);
    autoScroll.current = Math.abs(activeScroll.current - el.scrollTop) > 1;
    if (autoScroll.current) centerReply(item);
  };

  /** 답글 버튼 펼치기 + 그 답글을 답글 달 대상으로 (누르기·왼쪽으로 밀기 공통) */
  const openReply = (r: Comment) => {
    activeScroll.current = list.current?.scrollTop ?? 0;
    setActiveId(r.id);
    setTarget(r);
    // 바로 답글을 쓸 수 있게 입력칸에 커서를 둡니다.
    input.current?.focus({ preventScroll: true });
  };

  /**
    답글 말풍선을 왼쪽으로 밀면 누른 것과 같은 동작 (버튼 펼치기 + 답글 대상), 오른쪽으로 밀면 접기.
    흐린 답글을 밀면 가운데로 데려오면서 바로 펼칩니다. 미는 동안 말풍선이 손을 살짝 따라옵니다.
  */
  const swipe = useRef<{ id: string; x: number; y: number; dx: number; mode: "?" | "x" | "y"; row: HTMLElement | null } | null>(null);
  const swiped = useRef(false);
  const onSwipeStart = (e: PointerEvent<HTMLElement>, r: Comment) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    swipe.current = { id: r.id, x: e.clientX, y: e.clientY, dx: 0, mode: "?", row: e.currentTarget.querySelector("[data-row]") };
  };
  const onSwipeMove = (e: PointerEvent<HTMLElement>) => {
    const g = swipe.current;
    if (!g || g.mode === "y") return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (g.mode === "?") {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      // 옆으로 더 많이 움직였을 때만 밀기 (위아래면 목록 스크롤)
      g.mode = Math.abs(dx) > Math.abs(dy) * 1.2 ? "x" : "y";
      if (g.mode === "y") return;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    g.dx = dx;
    if (g.row) {
      g.row.style.transition = "none";
      // 손을 따라오되 점점 무겁게 (왼쪽 최대 약 48px)
      g.row.style.translate = `${dx < 0 ? -48 * Math.tanh(-dx / 90) : 16 * Math.tanh(dx / 90)}px 0`;
    }
  };
  const onSwipeEnd = (r: Comment, item: HTMLElement) => {
    const g = swipe.current;
    swipe.current = null;
    if (!g || g.mode !== "x") return;
    swiped.current = true; // 손을 뗄 때 따라오는 click은 무시
    if (g.row) {
      g.row.style.transition = "translate 260ms cubic-bezier(0.34, 1.4, 0.64, 1)";
      g.row.style.translate = "0 0";
    }
    if (g.dx <= -SWIPE_MIN) {
      if (hiddenIds.has(r.id)) return centerReply(item);
      openAndCenter(r, item);
    } else if (g.dx >= SWIPE_MIN && activeId === r.id) {
      setActiveId(null);
      if (target?.id === r.id) setTarget(null);
    }
  };

  /**
    스크롤이 멈추면 휠 기준선에 가장 가까운 답글로 착 붙입니다.
    (브라우저의 scroll-snap은 늘 칸 가운데 기준이라, 맨 위 구간에서 기준선과 어긋나 튀어서 직접 붙임)
  */
  const settle = () => {
    const el = list.current;
    if (!el || el.dataset.compact || el.dataset.line || touching.current) return;
    const item = centerId ? el.querySelector<HTMLElement>(`[data-reply-id="${CSS.escape(centerId)}"]`) : null;
    if (!item) return;
    const top = scrollFor(el, item);
    if (Math.abs(top - el.scrollTop) > 1) el.scrollTo({ top, behavior: "smooth" });
  };
  const settleRef = useRef(settle);
  useLayoutEffect(() => {
    settleRef.current = settle;
  });
  const scheduleSettle = () => {
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => settleRef.current(), 140);
  };
  useEffect(() => () => window.clearTimeout(settleTimer.current), []);

  const onListScroll = () => {
    updateWheel();
    scheduleSettle();
    // 스크롤하면 펼친 버튼은 접습니다 (답글 달 대상은 그대로).
    const st = list.current?.scrollTop ?? 0;
    if (autoScroll.current) {
      if (Math.abs(st - activeScroll.current) <= 1) autoScroll.current = false;
    } else if (activeId && Math.abs(st - activeScroll.current) > 4) setActiveId(null);
  };

  /*
    폰 키보드: 아이폰은 키보드가 떠도 화면(레이어) 높이가 그대로라 입력칸·버튼이 키보드에 가려집니다.
    보이는 영역(visualViewport)에 레이어를 맞춰서 입력칸이 키보드 바로 위에 오게 하고,
    답글 대상이 있으면 그 답글을 입력칸 바로 위(목록 맨 아래)로 데려옵니다.
  */
  const [keyboard, setKeyboard] = useState(false);
  // 키보드가 올라오는 동안 보이는 높이가 여러 번 바뀌므로, 바뀔 때마다 대상 위치를 다시 맞춤
  const [viewHeight, setViewHeight] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    const box = root.current;
    if (!vv || !box) return;
    const fit = () => {
      const open = window.innerHeight - vv.height > 120;
      box.style.top = `${vv.offsetTop}px`;
      box.style.height = `${vv.height}px`;
      box.style.bottom = "auto";
      setKeyboard((prev) => (prev === open ? prev : open));
      setViewHeight(Math.round(vv.height));
    };
    fit();
    vv.addEventListener("resize", fit);
    vv.addEventListener("scroll", fit);
    return () => {
      vv.removeEventListener("resize", fit);
      vv.removeEventListener("scroll", fit);
    };
  }, []);

  // 키보드가 떠 있는 동안 답글 대상을 입력칸 바로 위에, 내려가면 보통 휠로
  useLayoutEffect(() => {
    const el = list.current;
    if (!el) return;
    const item = keyboard && target ? el.querySelector<HTMLElement>(`[data-reply-id="${CSS.escape(target.id)}"]`) : null;
    if (item) el.dataset.line = String(el.clientHeight - item.offsetHeight / 2 - KEYBOARD_GAP);
    else delete el.dataset.line;
    updateRef.current();
    // 키보드가 뜨면 대상을 입력칸 바로 위로, 내려가면 다시 가운데로 (펼친 버튼은 그대로)
    const goal = item ?? (target ? el.querySelector<HTMLElement>(`[data-reply-id="${CSS.escape(target.id)}"]`) : null);
    if (goal && !el.dataset.compact) {
      activeScroll.current = scrollFor(el, goal);
      autoScroll.current = Math.abs(activeScroll.current - el.scrollTop) > 1;
      if (item) el.scrollTop = activeScroll.current; // 키보드가 올라오는 동안 바로 맞춤
      else el.scrollTo({ top: activeScroll.current, behavior: "smooth" });
      updateRef.current();
    }
    // 대상 답글이 바뀌거나 키보드가 뜨고 내릴 때, 보이는 높이가 바뀔 때
  }, [keyboard, target, viewHeight]);

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
    centerReply(item);
    // 입력칸 위 "↪ 답글" 줄이 닫히며 목록 높이가 바뀌므로, 한 프레임 뒤 다시 가운데로 맞춥니다.
    requestAnimationFrame(() => requestAnimationFrame(() => centerReply(item)));
    const row = item.querySelector<HTMLElement>("[data-row]");
    const form = input.current?.closest("form");
    if (!row || !form || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // 도착 자리 = 스크롤이 끝났을 때 그 답글 자리. 입력칸 높이에서 출발합니다.
    const box = el.getBoundingClientRect();
    const arrive = item.offsetTop + item.offsetHeight / 2 - scrollFor(el, item);
    const from = form.getBoundingClientRect().top + 32 - (box.top + arrive);
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

  const banner = target;
  const lines = splitLines(comment.text.replace(/\n/g, " ")).join("\n");

  return (
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label={t.layer(comment.text.replace(/\n/g, " "))}
      className="fixed inset-y-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2"
    >
      {/* 흐린 배경 — 눌러도 닫힘. 어둡기와 흐림을 0부터 같이 올립니다
          (부모를 opacity로 페이드하면 그동안 backdrop-filter가 꺼져 있다가 끝에 툭 켜져서) */}
      <div
        className="bleed-top absolute inset-0 bg-background/80 transition-[background-color,backdrop-filter,-webkit-backdrop-filter] duration-200 ease-out [-webkit-backdrop-filter:blur(8px)] [backdrop-filter:blur(8px)] starting:bg-background/0 starting:[-webkit-backdrop-filter:blur(0px)] starting:[backdrop-filter:blur(0px)]"
        onClick={onClose}
        aria-hidden
      />

      {/* 내용: 빈 곳을 누르면 아래 배경이 눌려 닫히도록 통과시킵니다.
          답글 목록 칸처럼 화면을 덮는 칸의 빈 곳도 — 버튼·입력칸·원글 카드·답글이 아닌 곳을 누르면 닫힘 (송희) */}
      <div
        className="pointer-events-none relative flex h-full flex-col transition-opacity duration-200 ease-out starting:opacity-0 [&>*]:pointer-events-auto"
        onClick={(e) => {
          if (editing || reporting || deleting) return;
          if ((e.target as Element).closest("button, a, input, textarea, label, form, [data-keep-open], [data-reply-id]")) return;
          // 답글을 골라 둔 상태면 첫 탭은 선택만 풀고, 한 번 더 누르면 닫힘
          if (activeId) return setActiveId(null);
          onClose();
        }}
      >
        {/* 수정 중에도 위 버튼(취소·완료)은 어두운 막 위에 */}
        <div className="relative z-30">
        <PageHeader
          left={
            <button ref={closeButton} type="button" onClick={back} aria-label={editing ? t.cancelEdit : t.close} className={HEADER_BUTTON}>
              <Icon name="x" />
            </button>
          }
          right={
            editing ? (
              <button
                type="button"
                onClick={finishEdit}
                aria-label={t.doneEdit}
                className="flex size-16 shrink-0 items-center justify-center rounded-full bg-white text-black transition-transform active:scale-95"
              >
                <Icon name="check" />
              </button>
            ) : canEdit ? (
              <>
                <button type="button" onClick={() => startEdit(comment)} aria-label={t.editComment} className={HEADER_BUTTON}>
                  <Icon name="pencil" />
                </button>
                <button type="button" onClick={() => setDeleting(comment)} aria-label={t.deleteComment} className={HEADER_BUTTON}>
                  <Icon name="trash" />
                </button>
              </>
            ) : (
              !hiddenIds.has(comment.id) && (
                // 남의 원글 한마디: ⋯ → 신고하기 (답글 신고와 같은 신고 모달)
                <div data-keep-open className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-label={t.more}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    className={HEADER_BUTTON}
                  >
                    <Icon name="more" />
                  </button>
                  {menuOpen && (
                    <>
                      {/* 메뉴 밖을 누르면 닫힘 */}
                      <div className="fixed inset-0 z-0" onClick={() => setMenuOpen(false)} aria-hidden />
                      <div
                        role="menu"
                        className="absolute top-[calc(100%+8px)] right-0 z-10 min-w-[160px] origin-top-right overflow-hidden rounded-[20px] bg-surface p-2 shadow-[0_12px_32px_rgba(0,0,0,0.45)] transition-[opacity,scale] duration-150 ease-out starting:scale-95 starting:opacity-0"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setMenuOpen(false);
                            setActiveId(null);
                            setReporting(comment);
                          }}
                          className="flex h-12 w-full items-center gap-3 rounded-[20px] px-4 text-left text-[16px] font-semibold text-on-dark active:bg-white/10"
                        >
                          <ReportIcon />
                          {t.report}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )
            )
          }
        />
        </div>

        {/* 원글 카드 — 수정하면 이 카드가 화면 가운데로 날아가 뒤집힙니다 (EditCard). 그동안 제자리는 비워 둠 */}
        <div data-keep-open className="mx-6 mt-4 h-[130px] shrink-0 transition-[opacity,scale] duration-250 ease-out starting:scale-95 starting:opacity-0">
          <div
            ref={rootCard}
            className={`relative flex size-full flex-col items-center justify-center rounded-[32px] px-8 py-8 ${
              editTarget?.id === comment.id ? "invisible" : ""
            }`}
            style={{ background: comment.color }}
          >
            <p className="text-center text-[24px] leading-[1.5] font-bold tracking-[-0.44px] whitespace-pre-line text-black">{lines}</p>
            <Badges comment={comment} replies={replyCounts.get(comment.id) ?? 0} t={t} card />
            {comment.edited && <span className="absolute bottom-3 text-[12px] leading-none font-semibold text-black/50">{t.edited}</span>}
          </div>
        </div>

        {/* 답글 목록 */}
        <div className="relative min-h-0 flex-1">
          {replies.length === 0 ? (
            <p className="absolute inset-0 flex items-center justify-center text-center text-[20px] leading-[1.5] font-extrabold tracking-[-0.4px] whitespace-pre-line text-white/70">
              {t.emptyReplies}
            </p>
          ) : (
            <div
              ref={list}
              onScroll={onListScroll}
              onTouchStart={() => {
                touching.current = true;
                window.clearTimeout(settleTimer.current);
              }}
              onTouchEnd={() => {
                touching.current = false;
                scheduleSettle();
              }}
              className={`relative flex h-full flex-col items-center gap-1 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
                overflowing
                  ? "[mask-image:linear-gradient(to_bottom,transparent,black_var(--fade-top,56px),black_calc(100%-56px),transparent)]"
                  : ""
              }`}
            >
              {thread.map((r, i) => {
                const active = activeId === r.id;
                const hasBadge = !!r.mine || r.author.kind === "author" || replyCounts.has(r.id);
                const isHidden = hiddenIds.has(r.id);
                const parent = r.replyTo && r.replyTo !== comment.id ? byId.get(r.replyTo) : undefined;
                return (
                  <div
                    key={r.id}
                    data-reply-id={r.id}
                    onClick={(e) => {
                      if (swiped.current) {
                        swiped.current = false;
                        return;
                      }
                      tapReply(r, e.currentTarget);
                    }}
                    onPointerDown={(e) => onSwipeStart(e, r)}
                    onPointerMove={onSwipeMove}
                    onPointerUp={(e) => onSwipeEnd(r, e.currentTarget)}
                    onPointerCancel={(e) => onSwipeEnd(r, e.currentTarget)}
                    // 아래 답글일수록 뒤에 깔리게
                    style={{ zIndex: thread.length - i }}
                    // 위아래는 목록 스크롤, 옆으로는 밀기
                    className="relative shrink-0 cursor-pointer touch-pan-y transition-[opacity,translate] duration-300 ease-out starting:translate-y-2 starting:opacity-0"
                  >
                    {/* 휠 크기·흐림·당김은 스크롤할 때 updateWheel이 직접 바꿉니다. */}
                    {/* 말풍선 사이는 늘 뱃지 높이만큼(12px) 띄웁니다. 답글에 단 답글은 "↪ 원 답글" 줄 위를 띄우고,
                        그 줄과 말풍선 사이는 뱃지가 있을 때만 띄움 */}
                    <div className={`flex flex-col items-center gap-1 will-change-[scale,opacity,translate] ${parent ? "pt-3" : ""}`}>
                      {parent && (
                        <span className="flex max-w-[280px] items-center gap-1 text-[12px] leading-none font-semibold text-white/50">
                          <ReplyArrowIcon size={12} />
                          <span className="truncate">{parent.text.replace(/\n/g, " ")}</span>
                        </span>
                      )}
                      <div data-row className={`flex items-center ${!parent || hasBadge ? "pt-3" : ""}`}>
                        <p
                          data-bubble
                          className={`relative flex items-center gap-2 ${editTarget?.id === r.id ? "invisible" : ""} rounded-[32px] py-4 pr-6 pl-3 text-center text-[20px] leading-[1.5] font-bold tracking-[-0.4px] whitespace-pre-line ${
                            isHidden ? "text-black/55" : "text-black"
                          }`}
                          style={{ background: isHidden ? HIDDEN_COLOR : r.color }}
                        >
                          <span
                            className={`flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-[20px] leading-none ${isHidden ? "opacity-60 grayscale" : ""}`}
                            aria-hidden
                          >
                            {r.author.kind === "korean" ? "🇰🇷" : r.author.flag}
                          </span>
                          {splitLines(r.text.replace(/\n/g, " ")).join("\n")}
                          {r.edited && !isHidden && <span className="self-end pb-1 text-[12px] leading-none font-semibold text-black/45">{t.edited}</span>}
                          <Badges comment={r} replies={replyCounts.get(r.id) ?? 0} t={t} />
                        </p>
                        {/* 가운데 답글을 누르면 오른쪽에 펼쳐지는 버튼 (펼치는 동안 말풍선이 왼쪽으로 비켜남) */}
                        <div
                          className={`flex gap-1 overflow-hidden transition-[width,opacity,padding] duration-250 ease-out ${
                            active ? `pl-3 opacity-100 ${r.mine ? "w-[110px]" : "w-14"}` : "w-0 pl-0 opacity-0"
                          }`}
                          onClick={(e) => e.stopPropagation()}
                          aria-hidden={!active}
                        >
                          {r.mine ? (
                            <>
                              <button type="button" tabIndex={active ? 0 : -1} onClick={() => startEdit(r)} aria-label={t.editReply} className={REPLY_BUTTON}>
                                <Icon name="pencil" />
                              </button>
                              <button
                                type="button"
                                tabIndex={active ? 0 : -1}
                                onClick={() => setDeleting(r)}
                                aria-label={t.deleteReply}
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
                              aria-label={t.reportReply}
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

        {/* 답글 입력 */}
        <form onSubmit={sendReply} className="flex shrink-0 items-end gap-1 px-2 pb-[calc(24px+env(safe-area-inset-bottom))]">
          <div className={`flex min-w-0 flex-1 flex-col bg-surface-2 font-semibold ${banner ? "rounded-[32px]" : "rounded-full"}`}>
            {/* 답글에 답글을 달 때: 입력칸 위에 그 답글 (메시지 답장처럼) */}
            {banner && (
              <div className="flex animate-toast-in items-center gap-2 pt-4 pr-3 pl-5 text-[16px] text-white/60">
                <ReplyArrowIcon size={20} />
                <span className="min-w-0 flex-1 truncate font-bold text-white">{banner.text.replace(/\n/g, " ")}</span>
                <button
                  type="button"
                  onClick={() => setTarget(null)}
                  aria-label={t.cancelReplyTo}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-white/60"
                >
                  <Icon name="x" size={16} />
                </button>
              </div>
            )}
          <label className="flex h-16 min-w-0 items-center gap-2 px-5">
            <span className="sr-only">{t.leaveReplyLabel}</span>
            <input
              ref={input}
              value={draft}
              readOnly={writeLocked}
              onClick={writeLocked ? onLockedWrite : undefined}
              onChange={(e) => setDraft(limitTyped(e, COMMENT_MAX))}
              onCompositionEnd={(e) => setDraft(clampText(e.currentTarget.value, COMMENT_MAX))}
              placeholder={t.leaveReply}
              enterKeyHint="send"
              tabIndex={editing ? -1 : 0}
              className="min-w-0 flex-1 bg-transparent text-[16px] text-on-dark outline-none placeholder:text-white/40"
            />
            <span className="shrink-0 text-[12px] text-white/40">
              {textLength(draft)}/{COMMENT_MAX}
            </span>
          </label>
          </div>
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label={t.sendReply}
            tabIndex={editing ? -1 : 0}
            className="flex size-16 shrink-0 items-center justify-center rounded-full bg-white transition-transform active:scale-90"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- 작은 SVG 아이콘 */}
            <img src="/images/icon-send.svg" width={22} height={22} alt="" className="-rotate-30" />
          </button>
        </form>
      </div>

      {editTarget && (
        <EditCard
          ref={editCard}
          comment={editTarget}
          draft={editDraft}
          onDraft={setEditDraft}
          onSubmit={finishEdit}
          container={() => root.current}
          source={editSource}
          onClosed={() => setEditTarget(null)}
          t={t}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title={t.deleteAsk}
          quote={deleting.text}
          no={t.no}
          yes={t.yes}
          onNo={() => setDeleting(null)}
          onYes={() => {
            if (deleting.id === comment.id) onDelete();
            else {
              setActiveId(null);
              if (target?.id === deleting.id) setTarget(null);
              onDeleteReply(deleting.id);
            }
            setDeleting(null);
          }}
        />
      )}

      {reporting && (
        <ReportDialog
          t={t}
          reply={reporting}
          isRoot={reporting.id === comment.id}
          onCancel={() => setReporting(null)}
          onSubmit={(reason) => {
            onReport(reporting.id, reason);
            if (target?.id === reporting.id) setTarget(null);
            setReporting(null);
            setToast(t.reported);
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

/** 첫 답글 위 여백 — 말풍선 위 뱃지 자리(12px)와 합쳐 원글 카드와 24px */
const TOP_GAP = 12;

/**
  휠 기준선 (칸 위에서부터 px)과 맨 위 구간 진행도 t (0 = 맨 위, 1 = 보통 휠).
  맨 위에서는 첫 답글 가운데에 있다가, 스크롤한 만큼 내려와 칸 가운데에서 멈춥니다.
*/
function wheelLine(el: HTMLElement, firstHeight: number) {
  if (el.dataset.line) {
    const line = Number(el.dataset.line);
    return { line, t: 1, top: line, range: 1 };
  }
  const top = TOP_GAP + firstHeight / 2;
  const mid = el.clientHeight / 2;
  const range = Math.max(1, mid - top);
  const t = Math.min(1, el.scrollTop / range);
  return { line: top + (mid - top) * t, t, top, range };
}

/** 이 답글이 휠 기준선에 오는 스크롤 위치 (wheelLine의 반대 계산) */
function scrollFor(el: HTMLElement, item: HTMLElement) {
  if (el.dataset.compact) return el.scrollTop; // 휠 없는 짧은 목록은 그대로
  const c0 = item.offsetTop + item.offsetHeight / 2;
  if (el.dataset.line) return Math.max(0, c0 - Number(el.dataset.line)); // 키보드 위 고정 기준선
  const first = el.firstElementChild as HTMLElement;
  const { top, range } = wheelLine(el, first.offsetHeight);
  const c = item.offsetTop + item.offsetHeight / 2;
  // 맨 위 구간: 기준선이 스크롤의 2배 빠르기로 내려옴 → c = top + 2s
  if (c <= top + 2 * range) return Math.max(0, (c - top) / 2);
  return c - el.clientHeight / 2;
}

/** 키보드가 떠 있을 때 답글 대상과 입력칸 사이 */
const KEYBOARD_GAP = 12;

/** 이만큼(px) 옆으로 밀어야 밀기로 침 */
const SWIPE_MIN = 36;

/** 휠 한 칸: 답글 말풍선 높이(약 68px) + 간격 */
const WHEEL_STEP = 70;
/** 한 칸 멀어질 때마다 줄어드는 비율과 가장 작은 크기, 흐려지는 비율과 가장 흐린 정도 */
const WHEEL_SHRINK = 0.16;
const WHEEL_MIN_SCALE = 0.72;
const WHEEL_FADE = 0.45;
const WHEEL_MIN_OPACITY = 0.15;

const wheelScale = (d: number) => Math.max(WHEEL_MIN_SCALE, 1 - WHEEL_SHRINK * d);

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

type EditCardHandle = {
  /** 수정 끝: 새 글(바뀌었으면)로 앞면을 바꾸고 뒤집어 원래 자리로 돌아간 뒤 onClosed */
  close: (newText: string | null) => void;
};

/**
  수정 카드 (Figma 375:8019) — 화면이 어두워지며 원래 말풍선 자리에서 화면 가운데로 날아와 뒤집혀 수정 칸이 됩니다.
  끝나면 다시 뒤집혀(고쳤으면 새 글 + "수정됨") 원래 자리로 날아가 돌아갑니다.
*/
function EditCard({
  ref,
  comment,
  draft,
  onDraft,
  onSubmit,
  container,
  source,
  onClosed,
  t,
}: {
  ref: Ref<EditCardHandle>;
  comment: Comment;
  draft: string;
  onDraft: (text: string) => void;
  onSubmit: () => void;
  container: () => HTMLElement | null;
  source: () => HTMLElement | null;
  onClosed: () => void;
  t: CommentsCopy;
}) {
  const card = useRef<HTMLDivElement>(null);
  const flipper = useRef<HTMLDivElement>(null);
  const dim = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const [front, setFront] = useState({ text: comment.text, edited: !!comment.edited });
  const closing = useRef(false);

  /** 원래 말풍선 자리 / 화면 가운데 자리 (레이어 기준) */
  const rects = () => {
    const box = container()?.getBoundingClientRect();
    const src = source()?.getBoundingClientRect();
    if (!box) return null;
    const w = box.width - 40;
    const center = { left: 20, top: Math.max(96, box.height / 2 - EDIT_H / 2 - 40), width: w, height: EDIT_H };
    const from = src
      ? { left: src.left - box.left, top: src.top - box.top, width: src.width, height: src.height }
      : { ...center, top: center.top + 40 };
    return { from, center };
  };
  const px = (r: { left: number; top: number; width: number; height: number }) => ({
    left: `${r.left}px`,
    top: `${r.top}px`,
    width: `${r.width}px`,
    height: `${r.height}px`,
  });

  useLayoutEffect(() => {
    const r = rects();
    if (!r || !card.current || !flipper.current || !dim.current) return;
    Object.assign(card.current.style, px(r.center));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const d = reduce ? 0 : 1;
    dim.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240 * d, easing: "ease-out" });
    card.current.animate([px(r.from), px(r.center)], { duration: 340 * d, easing: "cubic-bezier(0.3, 0.9, 0.3, 1)" });
    flipper.current.animate([{ transform: "rotateY(0deg)" }, { transform: "rotateY(180deg)" }], {
      duration: 460 * d,
      delay: 200 * d,
      easing: "cubic-bezier(0.4, 0, 0.2, 1)",
      fill: "both",
    });
    // 반쯤 뒤집혔을 때 입력칸에 커서
    const t = window.setTimeout(() => field.current?.focus({ preventScroll: true }), 420 * d);
    return () => window.clearTimeout(t);
    // 열릴 때 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    close: async (newText) => {
      if (closing.current || !card.current || !flipper.current || !dim.current) return;
      closing.current = true;
      field.current?.blur();
      if (newText) setFront({ text: newText, edited: true });
      const d = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1;
      // 다시 뒤집어 앞면(새 글 + 수정됨)을 보여 주고
      await flipper.current.animate([{ transform: "rotateY(180deg)" }, { transform: "rotateY(0deg)" }], {
        duration: 420 * d,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)",
        fill: "both",
      }).finished;
      // "수정됨"이 보이도록 잠깐 머문 뒤 원래 자리로 (고친 말풍선은 크기가 바뀌었을 수 있어 지금 다시 잼)
      if (newText) await new Promise((r) => setTimeout(r, 380 * d));
      const r = rects();
      if (r) {
        dim.current.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300 * d, easing: "ease-in", fill: "forwards" });
        await card.current.animate([px(r.center), px(r.from)], {
          duration: 320 * d,
          easing: "cubic-bezier(0.5, 0, 0.3, 1)",
          fill: "forwards",
        }).finished;
      }
      onClosed();
    },
  }));

  return (
    <div className="absolute inset-0 z-20">
      {/* 어두운 막 — 눌러도 닫히지 않음 (수정 취소는 위 X) */}
      <div ref={dim} className="absolute inset-0 bg-background/75 [-webkit-backdrop-filter:blur(6px)] [backdrop-filter:blur(6px)]" />
      <div ref={card} className="absolute perspective-[1200px]">
        <div ref={flipper} className="relative size-full transform-3d">
          {/* 앞면: 말풍선 모습 */}
          <div
            className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-[32px] px-6 backface-hidden"
            style={{ background: comment.color }}
            aria-hidden
          >
            <p className="text-center text-[24px] leading-[1.5] font-bold tracking-[-0.44px] whitespace-pre-line text-black">
              {splitLines(front.text.replace(/\n/g, " ")).join("\n")}
            </p>
            {front.edited && <span className="absolute bottom-3 text-[12px] leading-none font-semibold text-black/50">{t.edited}</span>}
          </div>
          {/* 뒷면: 수정 칸 */}
          <div className="absolute inset-0 flex rotate-y-180 items-center justify-center rounded-[32px] bg-surface-2 px-8 shadow-[0_4px_15px_rgba(0,0,0,0.25)] backface-hidden">
            <label className="w-full">
              <span className="sr-only">{t.editLabel}</span>
              <textarea
                ref={field}
                value={draft}
                onChange={(e) => onDraft(limitTyped(e, COMMENT_MAX, e.target.value.replace(/\n/g, "")))}
                onCompositionEnd={(e) => onDraft(clampText(e.currentTarget.value.replace(/\n/g, ""), COMMENT_MAX))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onSubmit();
                  }
                }}
                rows={1}
                // 글 길이만큼만 높아져서(최대 2줄) 카드 가운데에 옵니다.
                className="block max-h-[64px] w-full resize-none overflow-hidden bg-transparent text-center [field-sizing:content] text-[24px] leading-[1.5] font-bold tracking-[-0.44px] text-on-dark outline-none"
              />
            </label>
            <span className="absolute right-5 bottom-3 text-[12px] text-white/40">
              {textLength(draft)}/{COMMENT_MAX}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 수정 카드 높이 (원글 카드와 같음) */
const EDIT_H = 130;

/**
  말풍선 위 뱃지 (더미 말풍선 태그와 같은 모양, 조금 크게): 나 / 글쓴이, 답글이 달렸으면 ↪ 답글 수
  card: 원글 카드 — 카드 안쪽 위에 붙임
*/
function Badges({ comment, replies, t, card = false }: { comment: Comment; replies: number; t: CommentsCopy; card?: boolean }) {
  const who = whoOf(comment, t);
  if (!who && !replies) return null;
  return (
    <span className={`absolute flex gap-1 ${card ? "top-3 left-1/2 -translate-x-1/2" : "-top-2.5 left-6"}`}>
      {who && <span className={BADGE}>{who}</span>}
      {replies > 0 && (
        <span className={`${BADGE} gap-1 pl-2`} aria-label={t.replyCount(replies)}>
          <ReplyArrowIcon size={12} />
          {replies}
        </span>
      )}
    </span>
  );
}

const BADGE = "flex h-6 items-center rounded-full bg-black px-2 text-[12px] leading-none font-bold tracking-[-0.24px] whitespace-nowrap text-white";

/**
  답글 신고 확인 모달 — 답글 레이어 위에 한 겹 더 뜹니다.
  이유를 적어야 신고할 수 있고, 신고하면 그 답글은 내 화면에서 가려진다고 알려 줍니다.
*/
function ReportDialog({
  reply,
  isRoot = false,
  onCancel,
  onSubmit,
  t,
}: {
  reply: Comment;
  /** 원글 한마디 신고(⋯ 메뉴) — 문구만 "한마디"로 */
  isRoot?: boolean;
  onCancel: () => void;
  onSubmit: (reason: string) => void;
  t: CommentsCopy;
}) {
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
        className="relative flex w-full flex-col gap-6 rounded-[32px] bg-surface p-6 break-keep text-on-dark shadow-[0_12px_40px_rgba(0,0,0,0.5)] transition-[opacity,scale] duration-250 ease-out starting:scale-95 starting:opacity-0"
      >
        <div className="flex flex-col gap-2">
          <h2 id="report-title" className="font-display text-[24px] leading-[1.2]">
            {isRoot ? t.reportCommentTitle : t.reportTitle}
          </h2>
          <p className="truncate text-[16px] leading-[1.5] text-white/60">“{reply.text.replace(/\n/g, " ")}”</p>
        </div>
        <label className="flex flex-col gap-2">
          <span className="text-[14px] font-semibold">{t.reportAsk}</span>
          <textarea
            ref={field}
            value={reason}
            onChange={(e) => setReason(limitTyped(e, REPORT_MAX))}
            onCompositionEnd={(e) => setReason(clampText(e.currentTarget.value, REPORT_MAX))}
            rows={3}
            placeholder={t.reportPlaceholder}
            className="resize-none rounded-[20px] bg-surface-2 px-4 py-3 text-[16px] leading-[1.5] outline-none placeholder:text-white/40"
          />
          <span className="self-end text-[12px] text-white/40">
            {textLength(reason)}/{REPORT_MAX}
          </span>
        </label>
        <p className="flex items-start gap-2 text-[14px] leading-[1.5] text-white/70">
          <Icon name="info" size={20} className="mt-1 shrink-0" />
          {isRoot ? t.reportCommentNote : t.reportNote}
        </p>
        <div className="flex gap-1">
          <PillButton tone="soft" onClick={onCancel}>
            {t.cancel}
          </PillButton>
          <PillButton type="submit" tone={ok ? "error" : "disabled"} disabled={!ok}>
            {t.report}
          </PillButton>
        </div>
      </form>
    </div>
  );
}

/** 신고 이유 — 칸 단위 (한국어 100자 · 영어 200자) */
const REPORT_MAX = 200;

/**
  지우기 전 확인 창 — 신고 확인 창과 같은 모양. 실수로 지우지 않게 "아니오"에 먼저 초점이 갑니다.
*/
function ConfirmDialog({
  title,
  quote,
  no,
  yes,
  onNo,
  onYes,
}: {
  title: string;
  /** 지울 글 (따옴표로 한 줄 미리보기) */
  quote: string;
  no: string;
  yes: string;
  onNo: () => void;
  onYes: () => void;
}) {
  const noButton = useRef<HTMLDivElement>(null);
  useEffect(() => noButton.current?.querySelector("button")?.focus(), []);

  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" className="absolute inset-0 z-20 flex items-center justify-center px-5">
      <div
        className="absolute inset-0 bg-background/60 transition-[background-color] duration-200 starting:bg-background/0"
        onClick={onNo}
        aria-hidden
      />
      <div className="relative flex w-full flex-col gap-6 rounded-[32px] bg-surface p-6 break-keep text-on-dark shadow-[0_12px_40px_rgba(0,0,0,0.5)] transition-[opacity,scale] duration-250 ease-out starting:scale-95 starting:opacity-0">
        <div className="flex flex-col gap-2">
          <h2 id="confirm-title" className="font-display text-[24px] leading-[1.2]">
            {title}
          </h2>
          <p className="truncate text-[16px] leading-[1.5] text-white/60">“{quote.replace(/\n/g, " ")}”</p>
        </div>
        <div ref={noButton} className="flex gap-1">
          <PillButton tone="soft" onClick={onNo}>
            {no}
          </PillButton>
          <PillButton tone="error" onClick={onYes}>
            {yes}
          </PillButton>
        </div>
      </div>
    </div>
  );
}

// mingcute report-line (Apache-2.0) — Figma 377:10788
function ReportIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 21H22M12 9.23077L9.85714 12.6923H14.1429L12 16.1538M20.5714 21V11.3077C20.5714 9.10436 19.6684 6.99126 18.0609 5.43327C16.4535 3.87527 14.2733 3 12 3C9.72672 3 7.54654 3.87527 5.93909 5.43327C4.33163 6.99126 3.42857 9.10436 3.42857 11.3077V21H20.5714Z" />
    </svg>
  );
}
