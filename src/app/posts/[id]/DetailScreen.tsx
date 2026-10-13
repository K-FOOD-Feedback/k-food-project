"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type Ref } from "react";
import { clearCardTransition, peekCardTransition, setReturnTransition, type Box } from "@/app/home/cardTransition";
import { HOME_POSTS, participantsOf, type HomePost } from "@/app/home/mockPosts";
import { ArrowCta } from "@/components/Buttons";
import { Icon } from "@/components/Icon";
import { LanguageButton } from "@/components/LanguagePicker";
import { HEADER_BUTTON, PageHeader } from "@/components/PageHeader";
import { useMyVote } from "@/app/home/votes";
import { PostMenu } from "@/components/PostMenu";
import { TrackedLink } from "@/components/Track";
import { MY_POST_ID } from "@/lib/write-data";
import { track } from "@/lib/analytics";
import { CommentPile } from "./CommentPile";
import { paperlogy } from "./font";
import { VoteBowl } from "./VoteBowl";

/** 상세 화면 · 한국인 (Figma 263:10329 전체, 263:10251 기기 화면의 플로팅 버튼) */
export function DetailScreen({ post }: { post: HomePost }) {
  const voted = useMyVote(post.id) !== null;
  const voteRef = useRef<HTMLDivElement>(null);
  // 투표 영역을 한 번이라도 봤으면(스크롤 또는 버튼) 플로팅 버튼을 다시 띄우지 않습니다.
  const [seenVote, setSeenVote] = useState(false);

  // ── 분석: 투표·댓글 영역을 봤는지, 얼마나 머물렀는지 (Mixpanel)
  const commentRef = useRef<HTMLDivElement | null>(null);
  const reached = useRef({ vote: false, comments: false });
  const votedRef = useRef(voted);
  useEffect(() => {
    votedRef.current = voted;
  }, [voted]);
  useEffect(() => {
    const seen = reached.current; // 같은 객체를 계속 씀
    const openedAt = performance.now();
    const onScroll = () => {
      const c = commentRef.current;
      if (c && !seen.comments && c.getBoundingClientRect().top < window.innerHeight - 140) {
        seen.comments = true;
        track("comment_section_viewed", { post_id: post.id, voted: votedRef.current });
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      const seconds = Math.round((performance.now() - openedAt) / 100) / 10;
      // 개발 모드에서 effect가 한 번 더 도는 순간(0초)은 빼고 기록
      if (seconds > 0.3)
        track("post_closed", {
          post_id: post.id,
          seconds,
          voted: votedRef.current,
          saw_vote: seen.vote,
          saw_comments: seen.comments,
        });
    };
  }, [post.id]);
  const markVoteSeen = useCallback(
    (via: "scroll" | "cta") => {
      if (reached.current.vote) return;
      reached.current.vote = true;
      track("vote_section_viewed", { post_id: post.id, via });
    },
    [post.id],
  );

  useEffect(() => {
    const el = voteRef.current;
    if (!el) return;
    // 투표 영역 윗부분이 화면 안으로 올라왔으면(이미 지나친 경우 포함) 본 것으로 칩니다.
    // 화면 아래쪽 140px은 플로팅 버튼에 가려지므로 제외합니다.
    // 스크롤 위치로 판단해서, 투표 영역을 한 번에 건너뛰어 내려가도 놓치지 않습니다.
    const check = () => {
      if (el.getBoundingClientRect().top < window.innerHeight - 140) {
        markVoteSeen("scroll");
        setSeenVote(true);
        window.removeEventListener("scroll", check);
      }
    };
    window.addEventListener("scroll", check, { passive: true });
    // 화면이 길어서 처음부터 투표 영역이 보이는 경우
    const frame = requestAnimationFrame(check);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", check);
    };
  }, [markVoteSeen]);

  const goToVote = () => {
    track("vote_cta_clicked", { post_id: post.id });
    markVoteSeen("cta");
    setSeenVote(true);
    voteRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // "한마디를 남겨보세요" 카드가 가끔 살랑 흔들려 써 보라고 알려 줌 (상세 화면만).
  // 카드는 한마디 세션(CommentPile) 담당이라 바깥에서 찾아 움직이고, 쓰는 중(포커스·글 있음)엔 멈춥니다.
  useEffect(() => {
    const label = commentRef.current?.querySelector<HTMLElement>("form > label");
    const input = label?.querySelector("textarea");
    if (!voted || !label || !input) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    label.style.transformOrigin = "50% 70%";
    const wiggle = label.animate(
      [
        { rotate: "0deg" },
        { rotate: "4deg", offset: 0.08 },
        { rotate: "-3deg", offset: 0.16 },
        { rotate: "2deg", offset: 0.24 },
        { rotate: "-1deg", offset: 0.32 },
        { rotate: "0deg", offset: 0.4 },
        { rotate: "0deg" },
      ],
      { duration: WIGGLE_MS, delay: 800, iterations: Infinity, easing: "ease-in-out" },
    );
    const sync = () => {
      if (document.activeElement === input || input.value.trim()) wiggle.pause();
      else wiggle.play();
    };
    input.addEventListener("focus", sync);
    input.addEventListener("blur", sync);
    input.addEventListener("input", sync);
    return () => {
      wiggle.cancel();
      input.removeEventListener("focus", sync);
      input.removeEventListener("blur", sync);
      input.removeEventListener("input", sync);
    };
  }, [voted]);

  const showCta = !voted && !seenVote;


  // 다음 훈수 거리: 메인 카드 순서상 다음 게시글 (마지막이면 처음으로), 이전은 그 반대
  const order = HOME_POSTS.findIndex((p) => p.id === post.id);
  const next = HOME_POSTS[(order + 1) % HOME_POSTS.length];
  const prev = HOME_POSTS[(order - 1 + HOME_POSTS.length) % HOME_POSTS.length];

  // 메인 카드에서 넘어왔으면: 카드 속 사진은 위쪽 사진 영역으로, 카드는 아래쪽 본문 카드로,
  // "00명 참여" 스티커는 참여 칩으로, "투표하러 가기"는 플로팅 "투표하기"로 이어지게 움직입니다. 헤더는 그대로.
  const [intro] = useState(() => peekCardTransition(post.id));
  const [introDone, setIntroDone] = useState(!intro);
  const tileRef = useRef<HTMLDivElement>(null);
  const shownPhoto = useRef(0); // 사진 칸에서 지금 보고 있는 사진 번호
  const articleRef = useRef<HTMLElement>(null);
  const chipRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const photoGhost = useRef<HTMLDivElement>(null);
  const detailPhoto = useRef<HTMLImageElement>(null);
  const cardGhost = useRef<HTMLDivElement>(null);
  const cardGhostText = useRef<HTMLDivElement>(null);
  const chipGhost = useRef<HTMLDivElement>(null);
  const ctaGhost = useRef<HTMLDivElement>(null);
  const fadeIns = useRef<(HTMLElement | null)[]>([]);
  // 전환을 시작할 때 투표 전이었는지 (그때만 "투표하러 가기" → 플로팅 "투표하기"로 이어짐)
  const [ctaIntro] = useState(() => !!intro?.cta && !voted);

  useLayoutEffect(() => {
    if (!intro || !tileRef.current || !articleRef.current || !photoGhost.current || !cardGhost.current) return;
    clearCardTransition();
    window.scrollTo(0, 0);
    const box = (el: Element) => el.getBoundingClientRect();
    const place = (b: Box, radius: string) => ({
      left: `${b.left}px`,
      top: `${b.top}px`,
      width: `${b.width}px`,
      height: `${b.height}px`,
      borderRadius: radius,
    });
    const timing = { duration: INTRO_MS, easing: EASE, fill: "forwards" as const };
    const animations: Animation[] = [
      // 카드(색 배경 + 본문 글)는 아래로 내려가며 본문 카드 크기로 — 글이 처음부터 같이 움직여서 늦게 뜨지 않음
      cardGhost.current.animate([place(intro.card, "34.8px"), place(box(articleRef.current), "32px")], timing),
      // 물결 사진은 위로 올라가며 상세 사진 영역으로 (둥근 모양 → 모서리 둥근 사각형)
      photoGhost.current.animate([place(intro.photo, "45%"), place(box(tileRef.current), "32px")], timing),
    ];
    // 메인 카드 사진에서 상세 첫 사진으로 자연스럽게 바뀜
    if (detailPhoto.current) animations.push(detailPhoto.current.animate([{ opacity: 0 }, { opacity: 1 }], timing));
    if (cardGhostText.current)
      animations.push(cardGhostText.current.animate([{ opacity: 0 }, { opacity: 1, offset: 0.35 }, { opacity: 1 }], timing));
    // "00명 참여" 원형 스티커 → "00명 참여 중!" 알약 칩
    if (intro.sticker && chipGhost.current && chipRef.current) {
      const chip = box(chipRef.current);
      animations.push(
        chipGhost.current.animate(
          [
            { ...place(intro.sticker, "999px"), rotate: "12deg" },
            { ...place(chip, "999px"), rotate: "0deg" },
          ],
          timing,
        ),
      );
    }
    // "투표하러 가기" → 플로팅 "투표하기"
    if (ctaIntro && intro.cta && ctaGhost.current && ctaRef.current) {
      animations.push(ctaGhost.current.animate([place(intro.cta, "999px"), place(box(ctaRef.current), "999px")], timing));
    }
    // 투표·한마디는 뒤따라 살짝 올라오며 나타남 (헤더는 움직이지 않음)
    for (const el of fadeIns.current) {
      if (!el) continue;
      animations.push(
        el.animate([{ opacity: 0, translate: "0 16px" }, { opacity: 1, translate: "0 0" }], {
          duration: 300,
          delay: INTRO_MS * 0.3,
          easing: "ease-out",
          fill: "backwards",
        }),
      );
    }
    animations[1].onfinish = () => setIntroDone(true);
    // 앱이 백그라운드여서 애니메이션 끝 알림이 늦게 와도 전환에 갇히지 않도록 시간으로도 마무리
    const fallback = window.setTimeout(() => setIntroDone(true), INTRO_MS + 150);
    return () => {
      clearTimeout(fallback);
      animations.forEach((a) => a.cancel());
    };
  }, [intro, ctaIntro]);

  // 떠날 때(뒤로 가기 등) 사진·본문 카드·참여 칩 위치를 남겨, 메인 화면이 맨 앞 카드로 이어지게 움직일 수 있게 합니다.
  // 화면이 사라지는 순간에는 Next.js가 이미 스크롤을 맨 위로 돌려 놓아서, 떠나려는 순간(링크·버튼 클릭,
  // 브라우저 뒤로 가기)에 미리 재 둡니다. 그 순간을 못 잡으면 사라질 때 잰 값을 씁니다.
  useLayoutEffect(() => {
    const tile = tileRef.current;
    const article = articleRef.current;
    const chip = chipRef.current;
    const cta = ctaRef.current;
    if (!tile || !article) return;
    // 브라우저 뒤로 가기는 알림(popstate)을 보내기 전에 스크롤을 먼저 맨 위로 되돌려 놓습니다.
    // 그래서 마지막으로 본 스크롤 위치를 따로 기억해 두고, 잴 때 그만큼 빼서 "떠나기 직전 화면 위치"로 맞춥니다.
    let lastScrollY = window.scrollY;
    const onScroll = () => {
      lastScrollY = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    // shift: 지금 스크롤과 떠나기 직전 스크롤의 차이 (브라우저 뒤로 가기일 때만 0이 아님)
    const measure = (shift = 0) => {
      const toBox = (r: DOMRect, dy = shift): Box => ({ left: r.left, top: r.top + dy, width: r.width, height: r.height });
      return {
        postId: post.id,
        photo: toBox(tile.getBoundingClientRect()),
        // 떠날 때 보고 있던 사진 (메인이 이 사진에서 첫 사진으로 넘긴 뒤 카드로 합침)
        photoSrc: post.photos[shownPhoto.current] ?? post.photos[0],
        card: toBox(article.getBoundingClientRect()),
        color: post.color,
        ...(chip && { chip: toBox(chip.getBoundingClientRect()) }),
        // 플로팅 "투표하기"는 화면에 고정이라 스크롤 보정 없이 그대로 (숨어 있으면 넘기지 않음)
        ...(cta?.getAttribute("aria-hidden") === "false" && { cta: toBox(cta.getBoundingClientRect(), 0) }),
      };
    };
    let snapshot: { at: number; value: ReturnType<typeof measure> } | null = null;
    const snap = (shift: number) => {
      snapshot = { at: Date.now(), value: measure(shift) };
      // 메인 화면은 그리기 시작할 때 이 값을 읽으므로, 이 화면이 사라지기 전에 미리 남겨 둡니다.
      setReturnTransition(snapshot.value);
    };
    // 링크·버튼 클릭: 아직 스크롤이 그대로라 지금 위치 그대로
    const onClick = () => snap(0);
    // 브라우저 뒤로 가기: 스크롤이 이미 되돌려졌으므로 마지막으로 본 스크롤만큼 빼서 맞춤
    const onPopState = () => snap(window.scrollY - lastScrollY);
    // 브라우저 뒤로·앞으로: Navigation API의 navigate 알림이 가장 먼저 옴 (이 화면이 아직 그대로일 때).
    // 지원하지 않는 브라우저는 popstate로 (조금 늦지만 스크롤 차이로 보정).
    const navigation = (window as unknown as { navigation?: EventTarget }).navigation;
    const onNavigate = (e: Event) => {
      if ((e as Event & { navigationType?: string }).navigationType === "traverse") snap(window.scrollY - lastScrollY);
    };
    // capture 단계라서 링크 이동·Next.js의 뒤로 가기 처리보다 먼저 잼
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState, true);
    navigation?.addEventListener("navigate", onNavigate);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState, true);
      navigation?.removeEventListener("navigate", onNavigate);
      window.removeEventListener("scroll", onScroll);
      const fresh = snapshot && Date.now() - snapshot.at < 2000 ? snapshot.value : measure();
      setReturnTransition(fresh);
    };
  }, [post.id, post.photos, post.color]);

  // 주소가 #vote로 열리면(예: 투표 안 하고 한마디 전체 화면에 들어왔다가 돌려보내진 경우) 투표 영역을 가운데로.
  // 메인 카드 전환이 있으면 끝난 뒤에 스크롤합니다.
  const hashHandled = useRef(false);
  useEffect(() => {
    if (hashHandled.current || !introDone) return;
    // 다른 화면에서 router로 넘어오면 주소(#vote)가 화면보다 조금 늦게 바뀌고,
    // Next.js도 #vote 위치로 한 번 스크롤(맨 위에 붙임)하므로, 잠시 뒤에 주소를 보고 가운데로 맞춥니다.
    // 주소창에 #vote를 넣고 새로 열면 브라우저가 페이지를 다 불러온 뒤 한 번 더 스크롤하므로, 그 뒤에 맞춥니다.
    let timer = 0;
    const center = () => {
      timer = window.setTimeout(() => {
        hashHandled.current = true;
        if (window.location.hash !== "#vote") return;
        voteRef.current?.scrollIntoView({ block: "center" });
        markVoteSeen("scroll");
        setSeenVote(true);
      }, 150);
    };
    if (document.readyState === "complete") center();
    else window.addEventListener("load", center, { once: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("load", center);
    };
  }, [introDone, markVoteSeen]);

  // "다음 훈수 거리" 버튼으로 넘어왔으면: 맨 위부터 사진 → 본문 → 투표 → 공유 → 한마디 → 다음 버튼 순서로
  // 하나씩 살짝 떠오르며 나타납니다.
  const [nextIn] = useState(() =>
    !intro && nextTrip?.postId === post.id && Date.now() - nextTrip.at < 3000 ? nextTrip : null,
  );
  useLayoutEffect(() => {
    nextTrip = null;
    const content = articleRef.current?.parentElement;
    if (!nextIn || !content) return;
    window.scrollTo(0, 0);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // 옆으로 넘겨서 왔으면: 넘긴 쪽 반대편에서 화면 전체가 미끄러져 들어옴
    if (nextIn.swipe) {
      const from = nextIn.swipe === "next" ? 1 : -1;
      const slide = content.animate(
        [
          { opacity: 0, transform: `translateX(${from * SWIPE_IN_PX}px)` },
          { opacity: 1, transform: "none" },
        ],
        { duration: SWIPE_IN_MS, easing: NEXT_EASE, fill: "backwards" },
      );
      const done = window.setTimeout(() => slide.finish(), SWIPE_IN_MS + 300);
      return () => {
        clearTimeout(done);
        slide.cancel();
      };
    }
    // 아래에서 살짝 떠올라 자리 잡음 (처음엔 조금 작고 흐릿하다가 부드럽게 감속)
    const anims = [...content.children].map((el, i) =>
      el.animate(
        [
          { opacity: 0, transform: "translateY(48px) scale(0.97)", filter: "blur(4px)" },
          { opacity: 1, transform: "none", filter: "blur(0)" },
        ],
        { duration: NEXT_MS, delay: 80 + i * NEXT_STAGGER_MS, easing: NEXT_EASE, fill: "backwards" },
      ),
    );
    // 탭이 가려져 애니메이션이 멈춰도 정해진 시간 뒤에는 모두 보이게
    const fallback = window.setTimeout(
      () => anims.forEach((a) => a.finish()),
      NEXT_MS + NEXT_STAGGER_MS * anims.length + 300,
    );
    return () => {
      clearTimeout(fallback);
      anims.forEach((a) => a.cancel());
    };
  }, [nextIn]);

  // 좌우로 밀면(휴대폰은 손가락, 웹은 마우스로 끌기) 이전·다음 훈수 거리로: 화면이 옆으로 밀리다가,
  // 충분히 밀었으면 그 방향으로 빠져나가고 새 글이 반대편에서 들어옴. 덜 밀면 제자리로.
  const router = useRouter();
  useEffect(() => {
    const content = articleRef.current?.parentElement;
    if (!content) return;
    let start: { x: number; y: number; t: number } | null = null;
    let mode: "undecided" | "swipe" | "scroll" = "undecided";
    let dx = 0;
    const setOffset = (x: number) => {
      content.style.transform = x ? `translateX(${x}px)` : "";
      content.style.opacity = x ? `${1 - Math.min(Math.abs(x) / 600, 0.4)}` : "";
    };
    // 손가락(터치)과 마우스 끌기를 같은 방식으로 처리
    const begin = (x: number, y: number, target: Element) => {
      // 사진 넘기기·토큰 끌기·입력칸·열린 창 안에서는 화면 넘기기를 하지 않음
      if (target.closest("[data-photo-scroller], .touch-none, input, textarea, [role=dialog]")) {
        start = null;
        return;
      }
      start = { x, y, t: performance.now() };
      mode = "undecided";
      dx = 0;
      content.style.transition = "";
    };
    const drag = (x0: number, y0: number) => {
      if (!start) return;
      const x = x0 - start.x;
      const y = y0 - start.y;
      if (mode === "undecided" && Math.hypot(x, y) > 10) {
        mode = Math.abs(x) > Math.abs(y) * 1.4 ? "swipe" : "scroll";
        if (mode === "swipe") {
          // 마우스로 끌 때 글자가 같이 선택되지 않게
          window.getSelection()?.removeAllRanges();
          document.body.style.userSelect = "none";
        }
      }
      if (mode !== "swipe") return;
      dx = x;
      setOffset(x * 0.6); // 살짝 무겁게 따라옴
    };
    const finish = () => {
      document.body.style.userSelect = "";
      if (!start || mode !== "swipe") {
        start = null;
        return;
      }
      // 끌다가 놓은 자리의 버튼·링크가 눌리지 않게 바로 다음 클릭 한 번은 무시
      const swallow = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
      };
      document.addEventListener("click", swallow, { capture: true, once: true });
      window.setTimeout(() => document.removeEventListener("click", swallow, true), 0);
      const speed = Math.abs(dx) / Math.max(1, performance.now() - start.t); // px/ms
      start = null;
      const go = Math.abs(dx) > SWIPE_GO_PX || (speed > 0.5 && Math.abs(dx) > 30);
      if (!go) {
        content.style.transition = "transform 300ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 300ms";
        setOffset(0);
        return;
      }
      const dir = dx < 0 ? "next" : "prev";
      const target = dir === "next" ? next : prev;
      content.style.transition = `transform ${SWIPE_OUT_MS}ms ease-in, opacity ${SWIPE_OUT_MS}ms ease-in`;
      content.style.transform = `translateX(${dx < 0 ? -SWIPE_OUT_PX : SWIPE_OUT_PX}px)`;
      content.style.opacity = "0";
      track("post_opened", { post_id: target.id, from: "swipe", from_post_id: post.id, direction: dir });
      nextTrip = { postId: target.id, at: Date.now(), swipe: dir };
      window.setTimeout(() => router.push(`/posts/${target.id}`), SWIPE_OUT_MS - 40);
    };
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return void (start = null);
      begin(e.touches[0].clientX, e.touches[0].clientY, e.target as Element);
    };
    const onTouchMove = (e: TouchEvent) => drag(e.touches[0].clientX, e.touches[0].clientY);
    // 웹(마우스): 왼쪽 버튼으로 끌기
    const onMouseDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button === 0) begin(e.clientX, e.clientY, e.target as Element);
    };
    const onMouseMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse") drag(e.clientX, e.clientY);
    };
    const onMouseUp = (e: PointerEvent) => {
      if (e.pointerType === "mouse") finish();
    };
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", finish);
    document.addEventListener("touchcancel", finish);
    document.addEventListener("pointerdown", onMouseDown);
    document.addEventListener("pointermove", onMouseMove);
    document.addEventListener("pointerup", onMouseUp);
    document.addEventListener("pointercancel", onMouseUp);
    return () => {
      document.body.style.userSelect = "";
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", finish);
      document.removeEventListener("touchcancel", finish);
      document.removeEventListener("pointerdown", onMouseDown);
      document.removeEventListener("pointermove", onMouseMove);
      document.removeEventListener("pointerup", onMouseUp);
      document.removeEventListener("pointercancel", onMouseUp);
    };
  }, [router, next, prev, post.id]);

  // 한마디 전체 화면에서 돌아오면: ↗를 눌렀던 스크롤 위치로 돌려 놓고,
  // 화면에 보이는 카드들이 위에서부터 하나씩 살짝 떠오르며 나타납니다.
  const [backTrip] = useState(() =>
    !intro && commentsTrip?.postId === post.id && Date.now() - commentsTrip.at < TRIP_TTL_MS ? commentsTrip : null,
  );
  const contentRef = useRef<HTMLDivElement>(null);

  // ↗(한마디 전체 보기)를 누를 때 지금 스크롤 위치를 남김 (링크는 한마디 세션의 CommentPile 안이라 바깥에서 잡음)
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.("a");
      if (link?.getAttribute("href") === `/posts/${post.id}/comments`) {
        commentsTrip = { postId: post.id, scrollY: window.scrollY, at: Date.now() };
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [post.id]);

  useLayoutEffect(() => {
    commentsTrip = null;
    const content = contentRef.current;
    if (!backTrip || !content) return;
    window.scrollTo(0, backTrip.scrollY);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // 카드 단위: 본문의 각 칸 + 한마디 묶음은 칸·이모지·입력을 따로
    const comments = commentRef.current;
    const cards = [...content.children].flatMap((el) =>
      el === comments ? [...el.querySelectorAll(":scope > div > div > *")] : [el],
    );
    const visible = cards.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.bottom > 0 && r.top < window.innerHeight && r.height > 0;
    });
    const anims = visible.map((el, i) =>
      el.animate(
        [
          { opacity: 0, transform: "translateY(16px)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: BACK_CARD_MS, delay: i * BACK_STAGGER_MS, easing: EASE, fill: "backwards" },
      ),
    );
    // Next.js가 새 화면을 맨 위로 올렸으면 다시 제자리로
    const raf = requestAnimationFrame(() => {
      if (Math.abs(window.scrollY - backTrip.scrollY) > 1) window.scrollTo(0, backTrip.scrollY);
    });
    return () => {
      cancelAnimationFrame(raf);
      anims.forEach((a) => a.cancel());
    };
  }, [backTrip]);

  const hiddenUntilIntro = intro && !introDone ? "invisible" : "";

  return (
    <main
      className={`${paperlogy.variable} relative mx-auto min-h-dvh w-full max-w-[430px] overflow-x-clip bg-background text-on-dark`}
    >
      {/* 공통 상단 바 (src/components/PageHeader — 모든 화면이 같은 위치·크기·디자인) */}
      <PageHeader
        left={
          <Link href="/home" className={HEADER_BUTTON} aria-label="뒤로 가기">
            <ChevronLeftIcon />
          </Link>
        }
        right={
          <>
            {/* 지구본: 메인과 같은 언어 변경 창 (공통 LanguageButton) */}
            <LanguageButton lang="ko" from="detail" />
            {/* 더보기 메뉴 (송희 PostMenu) — 내 글이면 수정·삭제, 남의 글이면 링크 복사·신고 */}
            <PostMenu
              postId={post.id}
              isMine={post.id === MY_POST_ID}
              className={HEADER_BUTTON}
              onOpen={() => track("post_more_clicked", { post_id: post.id })}
            >
              <MoreIcon />
            </PostMenu>
          </>
        }
      />

      <div ref={contentRef} className="flex flex-col gap-1 px-2 pb-[calc(40px+env(safe-area-inset-bottom))]">
        <div ref={tileRef} className={hiddenUntilIntro}>
          <PhotoTile
            postId={post.id}
            photos={post.photos}
            participants={participantsOf(post)}
            title={post.title}
            chipRef={chipRef}
            hideChip={!!intro?.sticker && !introDone}
            onShow={(i) => {
              shownPhoto.current = i;
            }}
          />
        </div>

        <article
          ref={articleRef}
          className={`flex flex-col gap-5 rounded-[32px] px-7 py-[30px] text-on-light ${hiddenUntilIntro}`}
          style={{ background: post.color }}
        >
          <ArticleBody post={post} />
        </article>

        <div
          ref={(el) => {
            voteRef.current = el;
            fadeIns.current[0] = el;
          }}
        >
          <VoteBowl post={post} />
        </div>

        {/* 투표 완료 후: 투표 ↔ 한마디 사이 공유 카드 (누르면 휴대폰·브라우저 공유창) */}
        {voted && <ShareVoteCard post={post} />}

        <div
          className="relative"
          ref={(el) => {
            fadeIns.current[1] = el;
            commentRef.current = el;
          }}
        >
          {/*
            투표 전에는 이모지·한마디 입력 카드를 숨기고(투표하면 나타남), 한마디 칸은 잠금 레이어로 덮어 누를 수 없게(inert) 합니다.
            (CommentPile은 한마디 세션 담당이라 안을 고치지 않고 바깥에서 감쌉니다 — 칸(section) 아래 요소들만 숨김)
          */}
          <div
            inert={!voted}
            className={
              voted
                ? "[&>div>*:not(section)]:transition-opacity [&>div>*:not(section)]:duration-500 [&>div>*:not(section)]:starting:opacity-0"
                : // 잠금 레이어 아래 한마디 칸은 칸 안 내용 자체를 흐리게 (위에 backdrop-blur를 얹으면
                  // 움직이는 말풍선 위에서 블러가 매 프레임 다시 그려지며 세로 줄·깜빡임이 생김)
                  "[&>div>*:not(section)]:hidden [&>div>section>*]:blur-[8px]"
            }
          >
            <CommentPile postId={post.id} commentCount={post.commentCount} authorFlag={post.author.flag} />
          </div>
          <CommentLock locked={!voted} onVote={goToVote} />
          {/* 투표 후: 한마디 칸 어디를 눌러도 한마디 전체 화면으로 (상세에서는 말풍선 호버·모달 없이 칸 전체가 하나의 링크) */}
          {voted && (
            <TrackedLink
              href={`/posts/${post.id}/comments`}
              event="comments_opened"
              props={{ post_id: post.id, comment_count: post.commentCount, from: "detail" }}
              aria-label="한마디 전체 보기"
              className="absolute inset-x-0 top-0 z-10 h-[362px] rounded-[32px]"
            />
          )}
        </div>

        {/* 화면 맨 아래 "다음 훈수 거리" (Figma 332:3426 Question CTA) — 떠 있지 않고 내용 끝에 놓임 */}
        <div className="mt-[46px]">
          <ArrowCta
            href={`/posts/${next.id}`}
            caption="다음 훈수 거리"
            title={next.title}
            // 넘어갈 글의 카드 색 (게시글 데이터 색이라 토큰 대신 그대로)
            style={{ backgroundColor: next.color }}
            // 제목 글자만 Paperlogy로 (ArrowCta는 공통 부품이라 바깥에서 지정)
            className="[&>span>span:last-child]:font-(family-name:--font-paperlogy) [&>span>span:last-child]:truncate [&>span>span:last-child]:font-normal"
            onClick={() => {
              track("post_opened", { post_id: next.id, from: "next", from_post_id: post.id });
              // 다음 상세 화면이 위에서부터 차례로 나타나도록 표시를 남김
              nextTrip = { postId: next.id, at: Date.now() };
            }}
          />
        </div>
      </div>



      {/* 메인 카드 → 상세 전환용 (끝나면 사라지고 진짜 사진·본문 카드가 보임) */}
      {intro && !introDone && (
        <>
          <div
            ref={cardGhost}
            aria-hidden
            className="pointer-events-none fixed z-30 overflow-hidden"
            style={{ ...boxStyle(intro.card), borderRadius: 34.8, background: intro.color }}
          >
            {/* 진짜 본문 카드와 같은 글을 같이 실어 나름 (도착하면 그대로 이어짐) */}
            <div ref={cardGhostText} className="flex flex-col gap-5 px-7 py-[30px] text-on-light">
              <ArticleBody post={post} />
            </div>
          </div>
          <div
            ref={photoGhost}
            aria-hidden
            className="pointer-events-none fixed z-30 overflow-hidden"
            style={{ ...boxStyle(intro.photo), borderRadius: "45%" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- 전환용 사진 */}
            <img src={intro.cardPhoto} alt="" className="absolute inset-0 size-full object-cover" />
            {/* eslint-disable-next-line @next/next/no-img-element -- 전환용 사진 */}
            <img ref={detailPhoto} src={post.photos[0]} alt="" className="absolute inset-0 size-full object-cover opacity-0" />
          </div>
          {intro.sticker && (
            <div
              ref={chipGhost}
              aria-hidden
              className="pointer-events-none fixed z-30 flex items-center justify-center overflow-hidden bg-black text-[16px] leading-[1.5] font-semibold whitespace-nowrap text-white"
              style={{ ...boxStyle(intro.sticker), borderRadius: 999 }}
            >
              {participantsOf(post)}명 참여 중!
            </div>
          )}
          {ctaIntro && intro.cta && (
            <div
              ref={ctaGhost}
              aria-hidden
              className="pointer-events-none fixed z-30 flex items-center justify-center overflow-hidden rounded-full bg-primary text-[20px] leading-none font-extrabold tracking-[-0.4px] whitespace-nowrap text-white"
              style={boxStyle(intro.cta)}
            >
              투표하기
            </div>
          )}
        </>
      )}

      {/* 플로팅 "투표하기" (Figma: Floating CTA (viewport)) */}
      <button
        ref={ctaRef}
        type="button"
        onClick={goToVote}
        tabIndex={showCta ? 0 : -1}
        aria-hidden={!showCta}
        className={`fixed bottom-[calc(40px+env(safe-area-inset-bottom))] left-1/2 z-20 -translate-x-1/2 rounded-full bg-primary px-8 py-6 text-[20px] leading-none font-extrabold tracking-[-0.4px] whitespace-nowrap text-white shadow-[0_18px_48px_4px_rgba(0,0,0,0.55),0_10px_24px_-6px_rgba(255,135,196,0.55)] transition-[opacity,translate,scale] duration-300 active:scale-95 ${
          showCta ? "opacity-100" : "pointer-events-none translate-y-6 opacity-0"
        } ${ctaIntro && !introDone ? "invisible" : ""}`}
      >
        투표하기
      </button>
    </main>
  );
}

/**
  투표 전에는 한마디 칸(위쪽 362px) 위에 잠금 레이어를 덮습니다 (Figma 333:4130 layer_lock).
  한마디 칸 자체는 한마디 세션 담당(CommentPile)이라, 상세 화면에서 위에 겹쳐 올립니다.
*/
function CommentLock({ locked, onVote }: { locked: boolean; onVote: () => void }) {
  return (
    <div
      aria-hidden={!locked}
      className={`absolute inset-x-0 top-0 z-10 flex h-[362px] items-center justify-center overflow-hidden rounded-[32px] bg-background/50 transition-opacity duration-500 ${
        locked ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div className="flex w-[178px] flex-col items-center gap-[30px]">
        <div className="flex flex-col items-center gap-5">
          <span className="flex size-[60px] items-center justify-center rounded-full bg-[#292929]">
            {/* eslint-disable-next-line @next/next/no-img-element -- 작은 SVG 아이콘 */}
            <img src="/images/icon-lock.svg" width={32} height={32} alt="" />
          </span>
          <p className="text-center font-(family-name:--font-paperlogy) text-[20px] leading-[1.45] tracking-[-0.4px] whitespace-nowrap text-white">
            투표하고 다른 사람들과
            <br />
            한마디를 나눠보세요!
          </p>
        </div>
        <button
          type="button"
          onClick={onVote}
          tabIndex={locked ? 0 : -1}
          className="rounded-full bg-primary px-5 py-3.5 font-(family-name:--font-paperlogy) text-[18px] leading-[1.45] tracking-[-0.36px] text-white transition-transform active:scale-95"
        >
          투표하기
        </button>
      </div>
    </div>
  );
}

const INTRO_MS = 420;
// 한마디 전체 화면에 다녀오는 중 (↗를 누를 때 남김 → 상세로 돌아와 그려질 때 씀). 화면을 바꿔도 남는 모듈 값.
let commentsTrip: { postId: string; scrollY: number; at: number } | null = null;
// "다음 훈수 거리" 버튼으로 넘어가는 중 (다음 글 상세가 그려질 때 씀)
let nextTrip: { postId: string; at: number; swipe?: "next" | "prev" } | null = null;
// 좌우 넘기기: 넘어가는 기준 거리, 빠져나가는/들어오는 거리·시간
const SWIPE_GO_PX = 90;
// 사진: 이만큼 안 움직였으면 끌기가 아니라 누르기
const TAP_SLOP = 6;
const SWIPE_OUT_PX = 140;
const SWIPE_OUT_MS = 200;
const SWIPE_IN_PX = 120;
const SWIPE_IN_MS = 460;
const NEXT_MS = 700;
const NEXT_STAGGER_MS = 130;
const NEXT_EASE = "cubic-bezier(0.22, 1, 0.36, 1)"; // 빠르게 출발해 길게 감속
const TRIP_TTL_MS = 30 * 60_000;
const BACK_CARD_MS = 320;
// 사진 자동 넘김 간격 (가만히 있은 지 이만큼 지나면 다음 사진)
const AUTOPLAY_MS = 3500;
// 한마디 입력 카드 흔들기 한 번의 길이 (앞 40%만 흔들고 나머지는 쉼)
const WIGGLE_MS = 2600;
const BACK_STAGGER_MS = 70;
const EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";

/**
  투표 공유 카드 — 카드 전체가 버튼.
  휴대폰·공유를 지원하는 브라우저는 시스템 공유창(navigator.share)을 띄우고,
  지원하지 않으면(일부 데스크톱 브라우저) 링크를 복사하고 알려 줍니다.
*/
function ShareVoteCard({ post }: { post: HomePost }) {
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const share = async () => {
    const url = `${window.location.origin}/posts/${post.id}`;
    if (navigator.share) {
      try {
        // 받는 사람이 한국인이든 외국인이든 읽을 수 있게 한국어·영어 같이
        await navigator.share({
          title: post.title,
          text: `${post.question.text}\n난 벌써 한 표 던졌어. 이제 네 차례!\nI already voted. Your turn!`,
          url,
        });
        track("post_shared", { channel: "native", from: "detail_vote", post_id: post.id });
      } catch {
        // 사용자가 공유창을 닫음
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      track("post_shared", { channel: "copy_link", from: "detail_vote", post_id: post.id });
      setToast("링크를 복사했어요");
    } catch {
      setToast("링크를 복사하지 못했어요");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={share}
        className="flex w-full items-center gap-4 rounded-[32px] bg-secondary py-5 pr-4 pl-7 text-left text-on-light transition-[scale,opacity,translate] duration-500 active:scale-[0.98] starting:translate-y-3 starting:opacity-0"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-(family-name:--font-paperlogy) text-[22px] leading-[1.25] tracking-[-0.44px] break-keep">
            내 입맛만 정상인지 확인하기
          </span>
          <span className="text-[14px] leading-[1.4] font-semibold break-keep opacity-70">
            한국·외국 친구 불러서 훈수 배틀 열기
          </span>
        </span>
        {/* 공유 원이 둥실둥실 떠서 눈길을 끔 */}
        <span className="flex size-16 shrink-0 animate-float items-center justify-center rounded-full bg-background text-on-dark">
          <Icon name="share" />
        </span>
      </button>
      {toast && (
        <p
          role="status"
          className="fixed bottom-[calc(24px+env(safe-area-inset-bottom))] left-1/2 z-40 -translate-x-1/2 rounded-full bg-on-dark px-5 py-3 text-[15px] font-semibold whitespace-nowrap text-on-light"
        >
          {toast}
        </p>
      )}
    </>
  );
}

/** 본문 카드 안 글 (진짜 카드와 전환용 카드가 같은 모양을 쓰도록) */
function ArticleBody({ post }: { post: HomePost }) {
  return (
    <>
      <p className="text-[14px] leading-none font-medium tracking-[-0.28px] text-[#696969]">from. {post.author.country}</p>
      <h1 className="max-w-[204px] font-(family-name:--font-paperlogy) text-[31px] leading-[1.2] tracking-[-0.62px] break-keep">
        {post.title}
      </h1>
      <p className="text-[16px] leading-[1.55] font-medium tracking-[-0.32px] whitespace-pre-line text-[#444]">{post.body}</p>
    </>
  );
}
const boxStyle = (b: Box) => ({ left: b.left, top: b.top, width: b.width, height: b.height });

/** 사진 넘겨 보기 + 참여 인원 칩 (Figma: Tile/Photo) */
function PhotoTile({
  postId,
  photos,
  participants,
  title,
  chipRef,
  hideChip = false,
  onShow,
}: {
  postId: string;
  photos: string[];
  participants: number;
  title: string;
  chipRef?: Ref<HTMLParagraphElement>;
  /** 메인 카드 스티커에서 이어지는 전환 중에는 숨김 */
  hideChip?: boolean;
  /** 지금 보이는 사진 번호가 바뀔 때 (메인으로 돌아갈 때 보던 사진을 넘기려고) */
  onShow?: (index: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const furthest = useRef(0); // 분석: 몇 번째 사진까지 봤는지
  const many = photos.length > 1;
  const count = photos.length;
  // 끝없이 돌게: 앞에 마지막 사진, 뒤에 첫 사진을 하나씩 더 붙여 두고(가짜 칸),
  // 가짜 칸에 멈추면 같은 사진인 진짜 칸으로 몰래 옮깁니다. 진짜 첫 사진은 1번 칸.
  const slides = many ? [photos[count - 1], ...photos, photos[0]] : photos;
  const scroller = useRef<HTMLDivElement>(null);
  // 마우스로도 끌어서 넘길 수 있게 (터치·트랙패드는 브라우저 가로 스크롤 그대로)
  const mouseDrag = useRef<{ x: number; left: number } | null>(null);
  useLayoutEffect(() => {
    const el = scroller.current;
    if (many && el) el.scrollLeft = el.clientWidth;
  }, [many]);
  const settleTimer = useRef(0);
  // 마우스로 끌어서 넘긴 직후에 따라오는 클릭은 "반 누르기"로 치지 않음
  const dragged = useRef(false);
  const settle = (el: HTMLDivElement) => {
    if (mouseDrag.current) return;
    const slot = Math.round(el.scrollLeft / el.clientWidth);
    if (slot === 0) el.scrollLeft = count * el.clientWidth;
    else if (slot === count + 1) el.scrollLeft = el.clientWidth;
  };

  // 가만히 있으면 사진이 저절로 다음으로 넘어감 (마지막 다음은 처음).
  // 사용자가 만지면(누르기·끌기·휠) 그때부터 다시 기다렸다가 넘깁니다. 화면 밖이나 다른 탭이면 쉼.
  const lastTouched = useRef(0);
  const touched = () => {
    lastTouched.current = Date.now();
  };
  useEffect(() => {
    const el = scroller.current;
    if (!many || !el) return;
    let visible = false;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    }, { threshold: 0.5 });
    observer.observe(el);
    lastTouched.current = Date.now();
    const timer = window.setInterval(() => {
      if (!visible || document.hidden || mouseDrag.current) return;
      if (Date.now() - lastTouched.current < AUTOPLAY_MS) return;
      const slot = Math.round(el.scrollLeft / el.clientWidth);
      el.scrollTo({ left: (slot + 1) * el.clientWidth, behavior: "smooth" });
      lastTouched.current = Date.now();
    }, 500);
    return () => {
      clearInterval(timer);
      observer.disconnect();
    };
  }, [many]);

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-[32px] border border-black/4 bg-[#1e1e1e]">
      <div
        ref={scroller}
        data-photo-scroller={many ? "" : undefined}
        className={`flex size-full snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          many ? "cursor-grab overflow-x-auto active:cursor-grabbing" : "overflow-hidden"
        }`}
        onPointerDown={(e) => {
          touched();
          if (!many || e.pointerType !== "mouse") return;
          const el = e.currentTarget;
          mouseDrag.current = { x: e.clientX, left: el.scrollLeft };
          el.style.scrollSnapType = "none"; // 끄는 동안은 손을 따라오게
          el.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const drag = mouseDrag.current;
          if (drag) e.currentTarget.scrollLeft = drag.left - (e.clientX - drag.x);
        }}
        onPointerUp={(e) => {
          const drag = mouseDrag.current;
          if (!drag) return;
          mouseDrag.current = null;
          const el = e.currentTarget;
          const moved = e.clientX - drag.x;
          // 거의 안 움직였으면 끌기가 아니라 누르기 → 아래 onClick이 왼쪽·오른쪽 반으로 넘김
          if (Math.abs(moved) < TAP_SLOP) {
            el.style.scrollSnapType = "";
            return;
          }
          dragged.current = true;
          const from = Math.round(drag.left / el.clientWidth);
          // 조금만 끌어도(폭의 15%) 다음·이전 사진으로 (가짜 칸까지 가면 settle이 진짜 칸으로 옮김)
          const to = Math.abs(moved) > el.clientWidth * 0.15 ? from - Math.sign(moved) : from;
          el.scrollTo({ left: Math.max(0, Math.min(count + 1, to)) * el.clientWidth, behavior: "smooth" });
          window.setTimeout(() => {
            el.style.scrollSnapType = "";
            settle(el);
          }, 450);
          touched();
        }}
        onClick={(e) => {
          // 사진 왼쪽 반을 누르면 이전 사진, 오른쪽 반을 누르면 다음 사진 (끝에서는 처음·마지막으로 돎)
          if (!many) return;
          if (dragged.current) {
            dragged.current = false;
            return;
          }
          touched();
          const el = e.currentTarget;
          const r = el.getBoundingClientRect();
          const step = e.clientX < r.left + r.width / 2 ? -1 : 1;
          const slot = Math.round(el.scrollLeft / el.clientWidth);
          el.scrollTo({ left: (slot + step) * el.clientWidth, behavior: "smooth" });
        }}
        onTouchMove={touched}
        onWheel={touched}
        onPointerCancel={(e) => {
          mouseDrag.current = null;
          e.currentTarget.style.scrollSnapType = "";
        }}
        onScroll={(e) => {
          if (!many) return;
          const el = e.currentTarget;
          const slot = Math.round(el.scrollLeft / el.clientWidth);
          const next = (slot - 1 + count) % count;
          setIndex(next);
          onShow?.(next);
          if (next > furthest.current) {
            furthest.current = next;
            track("photo_swiped", { post_id: postId, index: next, total: count });
          }
          // 스크롤이 멈추면(잠깐 조용하면) 가짜 칸 → 진짜 칸
          clearTimeout(settleTimer.current);
          settleTimer.current = window.setTimeout(() => settle(el), 120);
        }}
      >
        {slides.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- 업로드한 사진(blob/외부 URL)도 그대로 보여 줘야 해서 img 사용
          <img
            key={i}
            src={src}
            alt={i === (many ? 1 : 0) ? title : ""}
            aria-hidden={many && (i === 0 || i === count + 1) ? true : undefined}
            draggable={false}
            className="size-full shrink-0 snap-center object-cover"
          />
        ))}
      </div>
      <p
        ref={chipRef}
        className={`absolute top-[19px] left-[19px] rounded-full bg-black px-3 py-1.5 text-[16px] leading-[1.5] font-semibold text-white ${
          hideChip ? "invisible" : ""
        }`}
      >
        {participants}명 참여 중!
      </p>
      {/* 사진이 여러 장일 때만 장수만큼 점 표시 (1장이면 없음) */}
      {many && (
        <div className="absolute bottom-[13px] left-1/2 flex -translate-x-1/2 gap-1.5" aria-hidden>
          {photos.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-[width] duration-300 ${i === index ? "w-[18px] bg-white" : "w-1.5 bg-white/50"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Lucide chevron-left (MIT)
function ChevronLeftIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

// Lucide ellipsis (MIT)
function MoreIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  );
}
