"use client";

import { useMyVote } from "@/app/home/votes";
import { useAutoTranslate } from "@/components/LanguagePicker";
import { useSearchParams } from "next/navigation";
import { TrackedLink } from "@/components/Track";
import { track } from "@/lib/analytics";
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { CommentModal } from "./CommentModal";
import { COMMENT_MAX, QUICK_EMOJIS, translateToEnglish, useComments, type Comment } from "./comments";
import { COMMENTS_COPY, type Lang } from "./copy";
import { HIDDEN_COLOR, useHiddenComments } from "./hidden";
import { estimateWidth, GravityPile, type PileHandle } from "./GravityPile";

/** 날아가는 원의 지름. 실제 말풍선보다 작게 날아가서, 떨어질 때 본래 크기로 커집니다. */
const CIRCLE = 20;
/** 원은 도착 지점보다 이만큼 위까지 솟았다가 내려오며 도착합니다 (그 낙하 속도 그대로 말풍선이 이어서 떨어짐). */
const RISE = 40;
/** 원이 날아가는 시간 (한마디·이모지 같음) */
const FLIGHT_MS = 300;

type Flight = {
  id: number;
  kind: Comment["kind"];
  text: string;
  color: string;
  /** 출발: 한마디 카드(상세)·입력칸(전체 화면) 또는 누른 이모지 버튼 */
  from: DOMRect;
  /** 한마디 출발 모양: 기울어진 카드(상세) 또는 알약 입력칸(전체 화면) */
  fromField: boolean;
  /** 도착: 화면 좌표 */
  to: { x: number; y: number };
  /** 도착 자리 (댓글 칸 기준) */
  dropX: number;
  dropY: number;
};

/**
  댓글 영역 (Figma: Tile/한마디 참견 + 한마디 입력 + 이모지 키)
  variant "preview": 상세 화면 — 댓글 칸 286px, ↗ 버튼으로 댓글 전체 화면 이동
  variant "full": 댓글 전체 화면 (Figma 332:3245) — 카드 없이 제목 + 게시글 제목, 남는 높이를 다 쓰고,
    칸을 스크롤해서 묻힌 댓글까지 볼 수 있음. 입력은 한 줄 알약 입력칸 + 보내기 원 버튼
*/
export function CommentPile({
  postId,
  commentCount,
  authorFlag,
  postTitle,
  variant = "preview",
  lang = "ko",
  commentsHref,
  writeLocked = false,
  onLockedWrite,
}: {
  postId: string;
  commentCount: number;
  authorFlag: string;
  /** 전체 화면 제목 아래에 보이는 게시글 제목 */
  postTitle?: string;
  variant?: "preview" | "full";
  /** 화면 문구 언어 — 한마디 전체 화면에서 지구본으로 바꿀 수 있음 */
  lang?: Lang;
  /** ↗ 버튼 주소 (외국인 상세는 ?viewer=en 이 붙음). 없으면 /posts/[id]/comments */
  commentsHref?: string;
  /** 로그인 전 외국인: 입력칸·이모지·답글 칸을 누르면 쓰는 대신 onLockedWrite (로그인 시트) */
  writeLocked?: boolean;
  onLockedWrite?: () => void;
}) {
  const full = variant === "full";
  const scrolledOld = useRef(false); // 분석: 전체 화면에서 예전 댓글까지 스크롤했는지
  const { comments: all, addedCount, add, edit, remove, nextColor, ready } = useComments(postId, authorFlag);
  const t = COMMENTS_COPY[lang];
  // 영어 화면에서 자동 번역이 켜져 있으면 한마디도 영어로 보여 줍니다 (언어 창 아래 켬/끔).
  const autoTranslate = useAutoTranslate();
  const translate = lang === "en" && autoTranslate;
  // 내가 신고해서 가린 한마디는 빼지 않고 회색 "가려진 한마디예요"로 보여 줍니다 (숫자도 그대로).
  const { hidden, hide } = useHiddenComments(postId);
  const comments =
    hidden.size || translate
      ? all.map((c) =>
          hidden.has(c.id)
            ? { ...c, kind: "text" as const, text: t.hidden, color: HIDDEN_COLOR }
            : translate
              ? translateToEnglish(c)
              : c,
        )
      : all;
  const [draft, setDraft] = useState("");
  const card = useRef<HTMLElement>(null);
  const zone = useRef<HTMLDivElement>(null);
  const titleRow = useRef<HTMLDivElement>(null);
  const pile = useRef<PileHandle>(null);
  // 보내기·이모지를 누른 뒤 댓글 칸으로 날아가는 중인 원들 (도착하면 댓글로 추가)
  const [flights, setFlights] = useState<Flight[]>([]);
  // 전체 화면: 칸 위·아래가 스크롤로 가려졌을 때만 그쪽에 그라데이션을 보여 줍니다.
  // 위: 아래로 스크롤해서 위쪽 한마디가 가려졌을 때 / 아래: 묻힌 한마디가 남아 있을 때 (맨 아래면 없음)
  const [fades, setFades] = useState({ top: false, bottom: false });
  const measureFades = () => {
    const box = zone.current?.firstElementChild;
    if (!box) return;
    const top = box.scrollTop > 4;
    const bottom = box.scrollTop + box.clientHeight < box.scrollHeight - 4;
    setFades((f) => (f.top === top && f.bottom === bottom ? f : { top, bottom }));
  };
  const measureRef = useRef(measureFades);
  useLayoutEffect(() => {
    measureRef.current = measureFades;
  });
  // 한마디가 쌓여 칸 안쪽이 길어지면(스크롤 없이도) 아래가 가려질 수 있어서 다시 잽니다.
  useEffect(() => {
    const box = zone.current?.firstElementChild;
    const content = box?.firstElementChild;
    if (!full || !box || !content) return;
    const observer = new ResizeObserver(() => measureRef.current());
    observer.observe(box);
    observer.observe(content);
    return () => observer.disconnect();
  }, [full]);
  const nextId = useRef(0);
  // 한마디 상세 주소 (송희) — ?comment=한마디id 로 들어오면 그 한마디 레이어를 바로 엶 (마이·알림에서 바로 가기)
  // 답글 id면 원글 레이어를 열고 그 답글을 강조합니다.
  const linkedId = useSearchParams().get("comment");
  // 전체 화면: 누른 한마디(원글) id — 레이어가 떠 있는 동안. 고치면 바로 보이도록 목록에서 다시 찾습니다.
  const [openedId, setOpenedId] = useState<string | null>(full ? linkedId : null);
  // 답글 말풍선을 눌러 원글 레이어를 열었으면, 레이어에서 가운데로 데려와 강조할 그 답글 id
  const [focusReplyId, setFocusReplyId] = useState<string | null>(full ? linkedId : null);
  const byId = new Map(comments.map((c) => [c.id, c]));
  // 레이어를 열고 닫을 때 주소도 같이 바꿈 (화면은 다시 그리지 않고 주소만)
  const setLink = (id: string | null) => {
    if (!full) return;
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("comment", id);
    else url.searchParams.delete("comment");
    window.history.replaceState(window.history.state, "", url);
  };
  /** 답글에 단 답글도 맨 위 원글까지 거슬러 올라갑니다 (부모가 지워져 끊기면 거기서 멈춤). */
  const rootOf = (c: Comment) => {
    let cur = c;
    const seen = new Set<string>();
    while (cur.replyTo && !seen.has(cur.id)) {
      seen.add(cur.id);
      const parent = byId.get(cur.replyTo);
      if (!parent) break;
      cur = parent;
    }
    return cur;
  };
  // 열린 레이어의 원글 — 고치면 바로 보이도록 목록에서 다시 찾음. 답글 id로 열렸으면 그 원글
  const openedFrom = openedId ? byId.get(openedId) : undefined;
  const opened = openedFrom ? rootOf(openedFrom) : undefined;
  // 전체 화면: 이모지 말풍선을 누르면 떠오르는 이모지 묶음들
  const [bursts, setBursts] = useState<Burst[]>([]);

  /**
    말풍선을 누르면: 원글 한마디는 답글 레이어, 이모지는 인스타 라방처럼 같은 이모지가 뾰로롱 떠오름.
    답글을 누르면 원글의 답글 레이어가 열리고 그 답글이 가운데에서 강조됩니다.
  */
  const select = (comment: Comment, el: HTMLElement) => {
    if (comment.kind !== "emoji") {
      const root = rootOf(comment);
      setOpenedId(root.id);
      setFocusReplyId(root.id === comment.id ? null : comment.id);
      setLink(comment.id);
      return;
    }
    // 누른 이모지 원이 톡 하고 커졌다 돌아옵니다.
    (el.firstElementChild as HTMLElement | null)?.animate([{ scale: "1" }, { scale: "1.18" }, { scale: "1" }], {
      duration: 260,
      easing: "ease-out",
    });
    const r = el.getBoundingClientRect();
    const id = nextId.current++;
    setBursts((list) => [...list, { id, emoji: comment.text, x: r.left + r.width / 2, y: r.top + r.height / 2 }]);
  };

  // 상세 화면: 투표를 마치면 잠금이 풀리면서 맨 위 한마디들이 다시 와르르 쏟아집니다.
  // (ready 전에는 투표 기록을 아직 못 읽은 상태라, 그때의 '투표 전'은 세지 않습니다)
  const voted = useMyVote(postId) !== null;
  const wasVoted = useRef<boolean | null>(null);
  useEffect(() => {
    if (full || !ready) return;
    if (wasVoted.current === false && voted) pile.current?.replayRain();
    wasVoted.current = voted;
  }, [full, ready, voted]);

  /** 출발 요소에서 원으로 바뀌어 댓글 칸으로 날아간 뒤 댓글이 됩니다. */
  const launch = async (kind: Comment["kind"], text: string, fromEl: HTMLElement | null) => {
    track("comment_sent", {
      post_id: postId,
      type: kind,
      length: kind === "emoji" ? 0 : text.length,
      emoji: kind === "emoji" ? text : undefined,
      lines: text.split("\n").length,
      screen: full ? "comments" : "detail",
    });
    const zoneEl = zone.current;
    if (!fromEl || !zoneEl || !pile.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      add(kind, text);
      return;
    }
    // 댓글창 윗부분이 화면 밖이면 먼저 보이게 올려 줍니다 (떨어지는 모습이 보이도록).
    // 전체 화면: 댓글 칸을 아래로 스크롤해 둔 상태면 맨 위로 올려서 떨어지는 모습이 보이게
    const scrollBox = zoneEl.firstElementChild;
    if (full && scrollBox && scrollBox.scrollTop > 0) {
      pile.current.scrollToTop();
      await new Promise((r) => setTimeout(r, 300));
    }
    if (zoneEl.getBoundingClientRect().top < 16) {
      zoneEl.scrollIntoView({ behavior: "smooth", block: "center" });
      await new Promise((r) => setTimeout(r, 380));
    }
    const z = zoneEl.getBoundingClientRect();
    // "댓글 N" 제목 줄 높이로 날아가서, 거기서부터 떨어집니다.
    const title = titleRow.current?.getBoundingClientRect();
    const arriveY = title ? title.top + title.height / 2 : z.top;
    // 더미가 가장 낮은 곳을 미리 정해, 원이 바로 그 위로 날아가게 합니다.
    const dropX = pile.current.planDrop(estimateWidth(kind, text));
    const flight: Flight = {
      id: nextId.current++,
      kind,
      text,
      color: nextColor(flights.length),
      from: fromEl.getBoundingClientRect(),
      fromField: full,
      to: { x: z.left + dropX, y: arriveY },
      dropX,
      dropY: arriveY - z.top,
    };
    setFlights((list) => [...list, flight]);
  };

  /** vy: 원이 도착할 때의 낙하 속도 (물리 한 걸음 = 1/60초당 px) */
  const arrive = (flight: Flight, vy: number) => {
    pile.current?.setNextDrop({ x: flight.dropX, y: flight.dropY, d: CIRCLE, vy });
    add(flight.kind, flight.text);
    setFlights((list) => list.filter((f) => f.id !== flight.id));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n");
    if (!text) return;
    setDraft("");
    launch("text", text, card.current);
  };

  const emojiKeys = (
    <div className={`flex w-full gap-0.5 ${full ? "px-2" : ""}`}>
      {QUICK_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={(e) => (writeLocked ? onLockedWrite?.() : launch("emoji", emoji, e.currentTarget))}
          aria-label={t.leaveEmoji(emoji)}
          className="flex aspect-square min-w-0 flex-1 items-center justify-center rounded-full bg-white/10 text-[20px] transition-transform active:scale-90"
        >
          {emoji}
        </button>
      ))}
    </div>
  );

  const flying = flights.map((f) => <FlyingCircle key={f.id} flight={f} onArrive={(vy) => arrive(f, vy)} />);

  if (full) {
    const count = commentCount + addedCount;
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div ref={titleRow} className="flex flex-col gap-3 px-5">
          <h2 className="flex items-center gap-1.5 text-[18px] leading-[1.3] font-bold tracking-[-0.54px]">
            {t.title} <span className="text-neutral-400">{count}</span>
          </h2>
          {postTitle && (
            <p className="font-(family-name:--font-paperlogy) text-[24px] leading-[1.4] tracking-[-0.48px] break-keep text-neutral-400">
              {postTitle}
            </p>
          )}
        </div>

        <section aria-label={t.section} className="relative flex min-h-0 flex-1 flex-col">
          <div
            ref={zone}
            className="flex min-h-0 flex-1 flex-col"
            onScrollCapture={() => {
              measureFades();
              if (!scrolledOld.current) {
                scrolledOld.current = true;
                track("old_comments_scrolled", { post_id: postId });
              }
            }}
          >
            <GravityPile
              ref={pile}
              comments={comments}
              ready={ready}
              className="min-h-0 flex-1"
              scrollable
              rainOnOpen={14}
              lang={lang}
              onOverflowChange={measureFades}
              onSelect={select}
            />
          </div>
          <div
            className={`pointer-events-none absolute inset-x-0 top-0 h-[92px] bg-linear-to-b from-background to-background/0 transition-opacity duration-300 ${
              fades.top ? "opacity-100" : "opacity-0"
            }`}
          />
          <div
            className={`pointer-events-none absolute inset-x-0 bottom-0 h-[92px] bg-linear-to-b from-background/0 to-background transition-opacity duration-300 ${
              fades.bottom ? "opacity-100" : "opacity-0"
            }`}
          />
        </section>

        {emojiKeys}

        {/* 한마디 입력칸 + 보내기 (Figma 332:3284 — 한마디 전체 화면만. 상세 화면은 아래 기울어진 카드 그대로) */}
        <form onSubmit={onSubmit} className="flex items-center gap-0.5 px-2">
          <label
            ref={(el) => {
              card.current = el;
            }}
            className="flex h-16 min-w-0 flex-1 items-center gap-2 rounded-full bg-surface-2 px-5 font-semibold"
          >
            <span className="sr-only">{t.leaveLabel}</span>
            <input
              value={draft}
              readOnly={writeLocked}
              onClick={writeLocked ? onLockedWrite : undefined}
              onChange={(e) => setDraft(limitDraft(e.target.value.replace(/\n/g, "")))}
              placeholder={t.leave}
              enterKeyHint="send"
              className="min-w-0 flex-1 bg-transparent text-[16px] text-on-dark outline-none placeholder:text-white/40"
            />
            <span className="shrink-0 text-[12px] text-white/40">
              {charCount(draft)}/{COMMENT_MAX}
            </span>
          </label>
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label={t.send}
            className="flex size-16 shrink-0 items-center justify-center rounded-full bg-white transition-transform active:scale-90"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- 작은 SVG 아이콘 */}
            <img src="/images/icon-send.svg" width={22} height={22} alt="" className="-rotate-30" />
          </button>
        </form>

        {flying}
        {bursts.map((b) => (
          <EmojiBurst key={b.id} burst={b} onDone={() => setBursts((list) => list.filter((x) => x.id !== b.id))} />
        ))}
        {/* 주소로 들어온 id가 답글이면 원글을 엶 */}
        {opened && (
          <CommentModal
            comment={opened}
            replies={comments.filter((c) => c.id !== opened.id && rootOf(c).id === opened.id)}
            focusId={focusReplyId}
            onClose={() => {
              setOpenedId(null);
              setLink(null);
            }}
            onReply={(text, replyTo) => add("text", text, replyTo ?? opened.id)}
            onEditReply={edit}
            onDeleteReply={remove}
            onReport={(id) => hide(id)}
            hiddenIds={hidden}
            lang={lang}
            writeLocked={writeLocked}
            onLockedWrite={onLockedWrite}
            onEdit={(text) => edit(opened.id, text)}
            onDelete={() => {
              remove(opened.id);
              setOpenedId(null);
              setLink(null);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <section
        className="relative flex w-full flex-col gap-1 overflow-hidden rounded-[32px] bg-white/10 p-1"
        aria-label={t.section}
      >
        <div ref={titleRow} className="flex h-16 items-center gap-10 pl-5">
          <h2 className="flex flex-1 items-center gap-1.5 text-[18px] leading-[1.3] font-bold tracking-[-0.54px]">
            {t.title} <span className="text-neutral-400">{commentCount + addedCount}</span>
          </h2>
          {/* 상세 화면(DetailScreen)이 이 주소로 가는 링크 클릭을 감지해 돌아올 때의 전환·스크롤 위치를 씁니다.
              href를 바꾸면 상세 화면 담당 세션에 알려 주세요. */}
          <TrackedLink
              href={commentsHref ?? `/posts/${postId}/comments`}
              event="comments_opened"
              props={{ post_id: postId, comment_count: commentCount + addedCount }}
              aria-label={t.openAll}
              className="flex size-16 items-center justify-center rounded-full bg-[#242424]"
            >
              <ArrowUpRightIcon />
            </TrackedLink>
        </div>

        <div ref={zone}>
          {/* 칸이 작아서 맨 위에 쌓일 최신 6개만 쏟아집니다 (많아도 금방 끝나게) */}
          <GravityPile ref={pile} comments={comments} ready={ready} rainOnOpen={6} lang={lang} />
        </div>
        {/* data-fade: 상세 화면이 잠금 상태에서 칸 내용을 흐릴 때 이 그라데이션은 흐리지 않도록 (흐리면 아래 끝이 비쳐 보임) */}
        <div data-fade className="pointer-events-none absolute inset-x-0 bottom-0 h-[92px] bg-linear-to-b from-[#292929]/0 to-[#292929]" />
      </section>

      {/* 이모지 키 → 한마디 입력 카드 순서 (Figma 332:3426) */}
      {emojiKeys}

      {/* 한마디 입력 카드 + 보내기 */}
      <form onSubmit={onSubmit} className="relative h-[181px] w-[270px]">
        <label className="absolute inset-x-0 top-0 flex h-[152px] items-center justify-center">
          <span className="sr-only">{t.leaveLabel}</span>
          <span ref={card} className="relative flex h-[130px] w-[260px] -rotate-[4.91deg] items-center justify-center rounded-[26px] bg-[#292929] px-6 py-[30px]">
            <textarea
              value={draft}
              readOnly={writeLocked}
              onClick={writeLocked ? onLockedWrite : undefined}
              onChange={(e) => setDraft(fitTwoLines(e.target, limitDraft(e.target.value)))}
              onKeyDown={(e) => {
                // Enter는 줄바꿈만 합니다 (최대 2줄). 보내기는 버튼으로만.
                if (e.key === "Enter" && draft.includes("\n")) e.preventDefault();
              }}
              rows={2}
              placeholder={t.leaveCard}
              className="w-full resize-none overflow-hidden bg-transparent text-center text-[20px] leading-[1.45] font-bold tracking-[-0.4px] text-on-dark outline-none placeholder:text-white/70"
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
            {t.send}
          </button>
        </span>
      </form>

      {flying}
    </div>
  );
}

/**
  날아가는 원. 출발 요소(한마디 카드·이모지 버튼) 모양에서 시작해, 안이 빈 작은 색 원으로 바뀌고,
  도착 지점 위로 솟구쳤다가 내려오는 속도 그대로 도착합니다 (도착해서 멈칫하지 않도록).
*/
function FlyingCircle({ flight, onArrive }: { flight: Flight; onArrive: (vy: number) => void }) {
  const outer = useRef<HTMLDivElement>(null);
  const el = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const node = el.current;
    if (!node || !outer.current) return;
    const { from, to, kind, color } = flight;
    const dx = to.x - (from.left + from.width / 2);
    const dy = to.y - (from.top + from.height / 2);
    const isText = kind === "text";
    const duration = FLIGHT_MS;
    const morphAt = isText ? 0.22 : 0.16;
    // 던진 공처럼 같은 중력으로 오르고 내립니다: 오르는 거리 : 내리는 거리 = 시간² 비율.
    // 그래서 꼭대기 근처에 머무는 시간이 짧고 자연스럽습니다.
    const riseDist = Math.max(RISE, -(dy - RISE) - 6);
    const flyMs = duration * (1 - morphAt);
    const fallMs = (flyMs * Math.sqrt(RISE)) / (Math.sqrt(riseDist) + Math.sqrt(RISE));
    const apexAt = 1 - fallMs / duration;
    const start = isText && flight.fromField
      ? { width: `${from.width}px`, height: `${from.height}px`, borderRadius: "999px", backgroundColor: "rgb(255 255 255 / 0)", rotate: "0deg" }
      : isText
      ? { width: "260px", height: "130px", borderRadius: "26px", backgroundColor: "#292929", rotate: "-4.91deg" }
      : { width: `${from.width}px`, height: `${from.height}px`, borderRadius: "999px", backgroundColor: "rgb(255 255 255 / 0.1)", rotate: "0deg" };
    const circle = { width: `${CIRCLE}px`, height: `${CIRCLE}px`, borderRadius: "999px", backgroundColor: color, rotate: "0deg" };
    // 가로와 세로를 따로 움직입니다. 세로는 꼭대기에서 잠깐 멈추지만(던진 공처럼) 가로는 계속 움직여서
    // 멈칫하는 대신 매끄러운 포물선으로 보입니다.
    outer.current.animate(
      [
        { translate: "0px 0px", offset: 0 },
        { translate: "0px 0px", offset: morphAt, easing: "cubic-bezier(0.4, 0, 0.6, 1)" },
        { translate: `${dx}px 0px` },
      ],
      { duration, fill: "forwards" },
    );
    const y = (v: number) => `-50% calc(-50% + ${v}px)`;
    const animation = node.animate(
      [
        // 제자리에서 작은 원으로 바뀌고
        { ...start, translate: y(0), easing: "ease-out" },
        // 도착 지점 위쪽으로 솟구쳤다가 (점점 느려지며 = ease-out quad)
        { ...circle, translate: y(-6), offset: morphAt, easing: "cubic-bezier(0.333, 0.667, 0.667, 1)" },
        // 아래로 떨어지며 (점점 빨라지며 = ease-in quad)
        { ...circle, translate: y(dy - RISE), offset: apexAt, easing: "cubic-bezier(0.333, 0, 0.667, 0.333)" },
        // 도착 — 이 속도를 말풍선이 이어받아 계속 떨어집니다.
        { ...circle, translate: y(dy) },
      ],
      { duration, fill: "forwards" },
    );
    // 한마디 글자는 원으로 바뀌기 전에 바로 사라집니다 (날아가는 원은 빈 원).
    if (isText) label.current?.animate([{ opacity: 1 }, { opacity: 0, offset: 0.1 }, { opacity: 0 }], { duration, fill: "forwards" });
    // ease-in quad의 끝 속도 = 2 × 거리 ÷ 시간 → 물리 한 걸음(1/60초)당 px
    animation.onfinish = () => onArrive(((2 * RISE) / fallMs) * (1000 / 60));
    return () => animation.cancel();
    // 원 하나당 한 번만 날아갑니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { from, kind, text } = flight;
  return (
    <div
      ref={outer}
      aria-hidden
      className="pointer-events-none fixed z-30 size-0"
      style={{ left: from.left + from.width / 2, top: from.top + from.height / 2 }}
    >
      <div ref={el} className="absolute top-0 left-0 flex items-center justify-center overflow-hidden text-center">
        {kind === "text" && (
          <span ref={label} className="px-4 text-[20px] leading-[1.45] font-bold tracking-[-0.4px] whitespace-pre text-on-dark">
            {text}
          </span>
        )}
      </div>
    </div>
  );
}

type Burst = { id: number; emoji: string; x: number; y: number };

/** 한 번 누를 때 떠오르는 이모지 수 */
const BURST_COUNT = 6;

/**
  인스타그램 라이브 하트처럼: 누른 이모지 자리에서 같은 이모지 여러 개가 차례로
  좌우로 살랑이며 위로 떠오르다 사라집니다. 겹쳐 여러 번 눌러도 각각 떠오릅니다.
*/
function EmojiBurst({ burst, onDone }: { burst: Burst; onDone: () => void }) {
  const refs = useRef<(HTMLSpanElement | null)[]>([]);

  useLayoutEffect(() => {
    // 움직임 줄이기 설정이면 하나만 살짝 떠올랐다 사라집니다.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animations = refs.current.slice(0, reduce ? 1 : BURST_COUNT).map((node, i) => {
      if (!node) return null;
      const rise = reduce ? 40 : 170 + Math.random() * 90;
      const sway = (Math.random() - 0.5) * 70;
      const size = 0.85 + Math.random() * 0.4;
      const at = (dx: number, dy: number) => `calc(-50% + ${dx}px) calc(-50% - ${dy}px)`;
      return node.animate(
        [
          { translate: at(0, 0), scale: `${size * 0.4}`, opacity: 0 },
          { translate: at(sway * 0.4, rise * 0.2), scale: `${size * 1.15}`, opacity: 1, offset: 0.15 },
          { translate: at(-sway * 0.5, rise * 0.6), scale: `${size}`, opacity: 1, offset: 0.6 },
          { translate: at(sway, rise), scale: `${size * 0.9}`, opacity: 0 },
        ],
        { duration: reduce ? 600 : 1300 + Math.random() * 400, delay: i * 90, easing: "ease-out", fill: "both" },
      );
    });
    Promise.all(animations.map((a) => a?.finished)).then(onDone, () => {});
    return () => animations.forEach((a) => a?.cancel());
    // 묶음 하나당 한 번만 떠오릅니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed z-30 size-0" style={{ left: burst.x, top: burst.y }}>
      {Array.from({ length: BURST_COUNT }, (_, i) => (
        <span
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="absolute top-0 left-0 text-[28px] leading-none opacity-0"
        >
          {burst.emoji}
        </span>
      ))}
    </div>
  );
}

const MAX_LINES = 2;

/** 줄바꿈은 글자 수에 세지 않습니다. */
const charCount = (text: string) => text.replace(/\n/g, "").length;

/**
  화면에 보이는 줄도 2줄까지만: 한 줄이 카드 폭을 넘어 저절로 줄바꿈되면 3줄이 될 수 있어서,
  넣어 보고 2줄 높이를 넘으면 넘치지 않을 때까지 끝에서부터 글자를 뺍니다.
  (타이핑은 그 글자가 안 들어가고, 붙여넣기는 들어갈 만큼만 들어갑니다)
*/
function fitTwoLines(el: HTMLTextAreaElement, value: string) {
  let text = value;
  el.value = text;
  // rows={2}라 칸 높이(clientHeight)가 곧 2줄 높이입니다.
  while (text && el.scrollHeight > el.clientHeight + 1) {
    text = Array.from(text).slice(0, -1).join("");
    el.value = text;
  }
  return text;
}

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

// Lucide arrow-up-right (MIT)
function ArrowUpRightIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 7h10v10" />
      <path d="M7 17 17 7" />
    </svg>
  );
}
