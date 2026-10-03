"use client";

import Matter from "matter-js";
import { useImperativeHandle, useLayoutEffect, useRef, type Ref } from "react";
import type { Comment } from "./comments";

const { Engine, Bodies, Body, Composite, Events, Sleeping } = Matter;

/*
  댓글 더미 (Figma "Gravity zone")
  - 새 댓글은 더미가 가장 낮은 곳(빈 곳이 가장 많은 곳) 위에서 떨어집니다.
    처음엔 가운데부터 쌓이고, 가운데가 높아지면 양옆으로 퍼집니다.
  - 글 댓글은 돌지 않고 떨어져, 부딪힐 때만 살짝(최대 20°) 기울어진 채 차분히 쌓입니다.
  - 이모지는 동그라미라 떨어진 뒤 굴러갑니다.
  - 댓글끼리는 약 1mm(4px) 띄워서 쌓입니다.
  - 더미가 칸 높이의 2/3를 넘으면 맨 위를 2/3 높이에 두고, 넘친 아래쪽은 그라데이션 뒤로 내립니다.
*/

const HEIGHT = 286;
const FILL_LIMIT = 2 / 3;
// 바닥은 칸 아래 경계보다 살짝 아래 (Figma처럼 맨 아래 줄이 그라데이션에 반쯤 걸치게)
const FLOOR_BELOW = 12;
const STEP_MS = 1000 / 60;
// 글 댓글은 이 각도(약 30°)까지만 기울어집니다. 틈에 비스듬히 끼어 들어갈 만큼은 기울되, 눕지는 않게.
// 이모지는 제한 없이 굴러갑니다.
const MAX_TILT = 0.52;
const PRESETTLE_STEPS = 60;
// 댓글 사이 간격 (약 1mm). 물리 몸체를 보이는 말풍선보다 이만큼 크게 만듭니다.
const GAP = 4;
// 가운데 선호 정도: 높이가 비슷하면 가운데 쪽을 고르는 정도로만 (가운데에서 100px = 5px 차이).
// 더 세게 하면 가운데만 뾰족하게 솟아, 2/3 유지 때문에 양옆이 그라데이션 아래로 묻힙니다.
const CENTER_PULL = 0.05;
// 자리 높이는 말풍선 가운데 이 비율의 폭 아래만 봅니다 (가장자리는 옆 댓글에 기대어 걸쳐도 되도록).
const PROBE = 0.4;

/** ox·oy: 몸체 무게중심에서 말풍선 요소 중심까지의 거리 (작성자 태그가 붙은 말풍선은 무게중심이 요소 중심과 다름) */
/** 날아온 원이 도착한 자리 (칸 기준 좌표)와 원 지름. 다음 새 댓글이 여기서 원 → 말풍선으로 펼쳐지며 떨어집니다. */
export type DropHint = { x: number; y: number; d: number };

/** 댓글 영역이 더미에 미리 물어보고 지시하는 통로 */
export type PileHandle = {
  /** 이 폭의 댓글이 떨어질 자리 x (칸 기준) */
  planDrop: (width: number) => number;
  /** 다음에 추가되는 댓글을 이 자리에서 떨어뜨림 */
  setNextDrop: (hint: DropHint) => void;
};

type Tracked = { body: Matter.Body; el: HTMLElement; w: number; h: number; ox: number; oy: number; landed: boolean };

/** matter-js 세계. 바닥 윗면이 y = 0이고 더미는 위쪽(음수 y)으로 쌓입니다. */
class PileWorld {
  private engine = Engine.create({ enableSleeping: true });
  private tracked = new Map<string, Tracked>();
  private width: number;
  private rightWall: Matter.Body;
  private defaultTop = -(HEIGHT + FLOOR_BELOW);
  /** 칸 맨 위에 보이는 세계 y좌표 (더미가 높아지면 위로 따라 올라갑니다) */
  private viewTop = this.defaultTop;
  private frame = 0;
  private started = false;
  private nextDrop: DropHint | null = null;

  constructor(width: number) {
    this.width = width;
    this.engine.gravity.y = 1.1;
    // 벽은 마찰이 없어야 댓글이 벽에 붙어 걸리지 않고 벽을 타고 미끄러져 내려갑니다.
    const wall = { isStatic: true, friction: 0, frictionStatic: 0 };
    this.rightWall = Bodies.rectangle(width + 50, -50000, 100, 100000, wall);
    Composite.add(this.engine.world, [
      // 바닥은 칸보다 넉넉히 넓게 (화면 폭이 넓어져도 그대로 쓰도록)
      Bodies.rectangle(width / 2, 50, 4000, 100, { isStatic: true, friction: 0.6 }),
      Bodies.rectangle(-50, -50000, 100, 100000, wall),
      this.rightWall,
    ]);
    // 무언가에 처음 닿은 순간부터 '쌓인 댓글'로 칩니다 (떨어지는 중인 댓글은 높이 계산에서 제외).
    Events.on(this.engine, "collisionStart", (e) => {
      for (const { bodyA, bodyB } of e.pairs) {
        for (const t of this.tracked.values()) {
          // 작성자 말풍선처럼 여러 조각으로 된 몸체는 조각끼리 부딪히므로 parent로 비교합니다.
          if (t.body === bodyA.parent || t.body === bodyB.parent) t.landed = true;
        }
      }
    });
  }

  start() {
    const loop = () => {
      this.step();
      this.render(true);
      this.frame = requestAnimationFrame(loop);
    };
    this.frame = requestAnimationFrame(loop);
  }

  destroy() {
    cancelAnimationFrame(this.frame);
    Events.off(this.engine, "collisionStart");
    Engine.clear(this.engine);
    this.tracked.clear();
  }

  /** 칸 폭이 바뀌면(화면 회전·창 크기 변경) 오른쪽 벽을 옮기고, 댓글을 비율대로 펼쳐 다시 쌓습니다. */
  resize(width: number) {
    if (Math.abs(width - this.width) < 1) return;
    const ratio = width / this.width;
    this.width = width;
    Body.setPosition(this.rightWall, { x: width + 50, y: -50000 });
    for (const { body, w } of this.tracked.values()) {
      const x = Math.min(Math.max(body.position.x * ratio, w / 2), width - w / 2);
      Body.setStatic(body, false);
      Body.setPosition(body, { x, y: body.position.y });
      Sleeping.set(body, false);
    }
  }

  /** 아직 세계에 없는 댓글을 추가합니다. 첫 호출은 미리 쌓아 둔 상태로, 이후는 눈앞에서 떨어집니다. */
  sync(comments: Comment[], nodes: Map<string, HTMLElement>) {
    // 목록에서 사라진 댓글(삭제·저장소 초기화)은 물리 세계에서도 뺍니다.
    // 남겨 두면 보이지 않는 몸체가 남아 새 댓글이 허공에 걸립니다.
    const ids = new Set(comments.map((c) => c.id));
    for (const [id, { body }] of this.tracked) {
      if (ids.has(id)) continue;
      Composite.remove(this.engine.world, body);
      this.tracked.delete(id);
    }
    const fresh = comments.filter((c) => !this.tracked.has(c.id) && nodes.has(c.id));
    if (fresh.length === 0) return;

    if (!this.started) {
      this.started = true;
      // 처음 열 때는 기존 댓글을 오래된 순서대로 같은 규칙으로 떨어뜨려 미리 쌓아 둡니다.
      for (const c of fresh) {
        this.add(c, nodes.get(c.id)!);
        for (let i = 0; i < PRESETTLE_STEPS; i++) this.step();
      }
      for (let i = 0; i < 120; i++) this.step();
      for (const t of this.tracked.values()) t.landed = true;
      this.viewTop = this.targetTop();
      this.render(false);
      return;
    }
    for (const c of fresh) {
      const hint = this.nextDrop;
      this.nextDrop = null;
      this.add(c, nodes.get(c.id)!, hint);
    }
  }

  planDrop(width: number) {
    return this.pickDropX(width + GAP);
  }

  setNextDrop(hint: DropHint) {
    this.nextDrop = hint;
  }

  private add(comment: Comment, el: HTMLElement, hint: DropHint | null = null) {
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    // 날아온 원이 있으면 그 자리에서, 없으면 더미가 가장 낮은 곳의 칸 맨 위 바로 위에서 떨어집니다.
    const x = hint ? Math.min(Math.max(hint.x, w / 2), this.width - w / 2) : this.pickDropX(w + GAP);
    const y = hint ? this.viewTop + hint.y : Math.min(this.viewTop, this.highest()) - h / 2 - 8;
    const body = comment.kind === "emoji" ? this.circleBody(x, y, w) : this.bubbleBody(el, x, y, w, h);
    if (comment.kind === "emoji") {
      // 동그라미는 옆으로 살짝 밀면서 떨어뜨려, 닿은 뒤 그 방향으로 굴러가게 합니다.
      const dir = Math.random() < 0.5 ? -1 : 1;
      Body.setVelocity(body, { x: dir * (1 + Math.random()), y: 0 });
      Body.setAngularVelocity(body, dir * 0.1);
    } else {
      // 살짝 비스듬히, 조금 돌면서 떨어집니다. 회전 관성은 약간만 키워 빙글빙글 돌지는 않게.
      const dir = Math.random() < 0.5 ? -1 : 1;
      Body.setInertia(body, body.inertia * 1.5);
      Body.setAngle(body, dir * Math.random() * 0.15);
      Body.setAngularVelocity(body, dir * (0.005 + Math.random() * 0.01));
    }
    Composite.add(this.engine.world, body);
    this.tracked.set(comment.id, { body, el, w, h, ox: x - body.position.x, oy: y - body.position.y, landed: false });
    el.style.visibility = "visible";
    // 원 → 말풍선: 가운데 원 크기만 보이던 것이 양옆·위아래로 펼쳐집니다.
    const inner = el.firstElementChild as HTMLElement | null;
    if (hint && inner && hint.d < w) {
      const r = hint.d / 2;
      inner.animate(
        [
          { clipPath: `inset(${(h - hint.d) / 2}px ${(w - hint.d) / 2}px round ${r}px)` },
          { clipPath: `inset(0px 0px round ${Math.min(h / 2, 32)}px)`, offset: 0.99 },
          { clipPath: "none" },
        ],
        { duration: 320, easing: "cubic-bezier(0.3, 1.3, 0.5, 1)" },
      );
    }
  }

  private circleBody(x: number, y: number, w: number) {
    // 마찰이 있어야 미끄러지지 않고 굴러갑니다.
    return Bodies.circle(x, y, (w + GAP) / 2, {
      restitution: 0.15,
      friction: 0.5,
      frictionStatic: 0.8,
      frictionAir: 0.006,
      density: 0.002,
    });
  }

  /**
    말풍선 몸체. 요소 중심이 (x, y)에 오도록 만듭니다.
    작성자 말풍선은 '말풍선 + 위로 튀어나온 태그' 두 조각을 합쳐서,
    태그 자리만 막고 나머지 윗부분은 다른 댓글처럼 GAP만큼만 띄웁니다.
  */
  private bubbleBody(el: HTMLElement, x: number, y: number, w: number, h: number) {
    // 튕김은 거의 없게. 마찰은 낮게 해서 틈 위에 걸치지 않고 미끄러져 빈 곳으로 들어가게 합니다.
    const options = { restitution: 0.05, friction: 0.12, frictionStatic: 0.3, frictionAir: 0.01, density: 0.002 };
    const left = x - w / 2;
    const top = y - h / 2;
    // offset* 값은 회전·이동(transform)의 영향을 받지 않아서, 화면에 어떻게 그려져 있든 원래 크기를 잽니다.
    const part = (p: HTMLElement, extra: object = {}) => {
      const pw = p.offsetWidth + GAP;
      const ph = p.offsetHeight + GAP;
      return Bodies.rectangle(left + p.offsetLeft + p.offsetWidth / 2, top + p.offsetTop + p.offsetHeight / 2, pw, ph, {
        ...extra,
        chamfer: { radius: Math.min(ph / 2 - 1, 32) },
      });
    };
    const bubble = el.querySelector<HTMLElement>("[data-part=bubble]");
    const tag = el.querySelector<HTMLElement>("[data-part=tag]");
    if (!bubble) return Bodies.rectangle(x, y, w + GAP, h + GAP, { ...options, chamfer: { radius: Math.min((h + GAP) / 2 - 1, 32) } });
    if (!tag) return part(bubble, options);
    return Body.create({ ...options, parts: [part(bubble), part(tag)] });
  }

  /** 지금 더미에서 가장 높은 곳의 y좌표 (없으면 바닥) */
  private highest() {
    let top = 0;
    for (const { body } of this.tracked.values()) top = Math.min(top, body.bounds.min.y);
    return top;
  }

  /** 더미가 가장 낮은 곳 (= 위쪽 여백이 가장 많은 곳)의 x좌표. 비슷하면 가운데에 가까운 쪽 */
  private pickDropX(w: number) {
    const min = w / 2;
    const max = Math.max(min, this.width - w / 2);
    const center = this.width / 2;
    let bestX = center;
    let bestScore = -Infinity;
    for (let x = min; x <= max; x += 4) {
      // 말풍선 가운데 부분 아래에서 가장 높이 솟은 댓글의 윗면 (없으면 바닥)
      const half = (w * PROBE) / 2;
      let surface = 0;
      for (const { body } of this.tracked.values()) {
        const b = body.bounds;
        if (b.max.x > x - half && b.min.x < x + half) surface = Math.min(surface, b.min.y);
      }
      const score = surface - CENTER_PULL * Math.abs(x - center);
      if (score > bestScore) {
        bestScore = score;
        bestX = x;
      }
    }
    // 매번 똑같은 자리에 겹치지 않도록 살짝 흔들어 줍니다.
    const jitter = (Math.random() - 0.5) * 16;
    return Math.min(Math.max(bestX + jitter, min), max);
  }

  private step() {
    Engine.update(this.engine, STEP_MS);
    for (const { body } of this.tracked.values()) {
      if (body.isStatic || body.circleRadius || Math.abs(body.angle) <= MAX_TILT) continue;
      Body.setAngle(body, Math.sign(body.angle) * MAX_TILT);
      Body.setAngularVelocity(body, 0);
    }
  }

  /** 더미 맨 위가 칸의 2/3 높이를 넘지 않도록 하는 칸 맨 위 y좌표 */
  private targetTop() {
    let pileTop = 0;
    for (const { body, landed } of this.tracked.values()) {
      if (landed && body.speed < 1.5) pileTop = Math.min(pileTop, body.bounds.min.y);
    }
    return Math.min(this.defaultTop, pileTop - HEIGHT * (1 - FILL_LIMIT));
  }

  private render(smooth: boolean) {
    const target = this.targetTop();
    this.viewTop = smooth ? this.viewTop + (target - this.viewTop) * 0.08 : target;
    for (const { body, el, w, h, ox, oy } of this.tracked.values()) {
      // 무게중심 + (회전한) 요소 중심까지의 거리 = 요소 중심
      const cos = Math.cos(body.angle);
      const sin = Math.sin(body.angle);
      const cx = body.position.x + ox * cos - oy * sin;
      const cy = body.position.y + ox * sin + oy * cos - this.viewTop;
      // 그라데이션 아래로 한참 내려간 댓글은 더 움직일 일이 없으니 고정해서 계산을 아낍니다.
      if (!body.isStatic && cy - h > HEIGHT + 200) Body.setStatic(body, true);
      el.style.transform = `translate(${cx - w / 2}px, ${cy - h / 2}px) rotate(${body.angle}rad)`;
    }
  }
}

export function GravityPile({ comments, ref }: { comments: Comment[]; ref?: Ref<PileHandle> }) {
  const zone = useRef<HTMLDivElement>(null);
  const nodes = useRef(new Map<string, HTMLElement>());
  const world = useRef<PileWorld | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      planDrop: (width) => world.current?.planDrop(width) ?? (zone.current?.clientWidth ?? 0) / 2,
      setNextDrop: (hint) => world.current?.setNextDrop(hint),
    }),
    [],
  );

  useLayoutEffect(() => {
    const pile = new PileWorld(zone.current!.clientWidth);
    world.current = pile;
    pile.start();
    const observer = new ResizeObserver(() => pile.resize(zone.current?.clientWidth ?? 0));
    observer.observe(zone.current!);
    return () => {
      observer.disconnect();
      pile.destroy();
      world.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    world.current?.sync(comments, nodes.current);
  }, [comments]);

  return (
    <div ref={zone} className="relative h-[286px] w-full select-none" aria-label="최근 댓글">
      {comments.map((c) => (
        <div
          key={c.id}
          ref={(el) => {
            if (el) nodes.current.set(c.id, el);
            else nodes.current.delete(c.id);
          }}
          className="invisible absolute top-0 left-0 will-change-transform"
        >
          <Bubble comment={c} />
        </div>
      ))}
    </div>
  );
}

function Bubble({ comment }: { comment: Comment }) {
  const { author } = comment;
  if (comment.kind === "emoji") {
    return (
      <span className="flex size-[54px] items-center justify-center rounded-full text-[16px]" style={{ background: comment.color }}>
        {comment.text}
      </span>
    );
  }
  const bubble = (
    <span
      data-part="bubble"
      className={`flex items-center justify-center gap-2 rounded-[32px] text-center text-[16px] leading-[1.4] font-bold tracking-[-0.32px] whitespace-pre text-black ${
        author.kind === "korean" ? "px-5 py-4" : "py-2.5 pr-5 pl-2.5"
      }`}
      style={{ background: comment.color }}
    >
      {author.kind !== "korean" && (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-[20px] leading-none">
          {author.flag}
        </span>
      )}
      {splitLines(comment.text).join("\n")}
    </span>
  );
  if (author.kind !== "author") return bubble;
  // "작성자" 태그가 말풍선 위로 튀어나온 만큼 위쪽 여백을 둡니다.
  // 물리 몸체는 말풍선 + 태그 두 조각이라, 태그 자리만 막히고 나머지 윗부분은 다른 댓글과 같은 간격입니다.
  return (
    <span className="relative block pt-2.5">
      {bubble}
      <span data-part="tag" className="absolute top-0 left-[30px] rounded-full bg-black px-1.5 py-1 text-[10px] leading-none font-bold text-white">
        작성자
      </span>
    </span>
  );
}

// 대략적인 글자 폭: 한글·한자·이모지는 영문의 약 2배
const charWidth = (ch: string) =>
  /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af\u4e00-\u9fff]|\p{Extended_Pictographic}/u.test(ch) ? 1 : 0.55;
const widthOf = (text: string) => Array.from(text).reduce((sum, ch) => sum + charWidth(ch), 0);
// 한 줄에 한글 약 10자까지. 넘으면 두 줄로 나눕니다.
const ONE_LINE_MAX = 10;

/** 한 줄로 긴 한마디는 가운데쯤에서 두 줄로 나눕니다 (가능하면 띄어쓰기에서). 이미 줄을 나눴으면 그대로. */
function splitLines(text: string): string[] {
  if (text.includes("\n") || widthOf(text) <= ONE_LINE_MAX) return text.split("\n");
  const chars = Array.from(text);
  const half = widthOf(text) / 2;
  let best = -1;
  let bestScore = Infinity;
  let acc = 0;
  chars.forEach((ch, i) => {
    acc += charWidth(ch);
    if (i === 0 || i === chars.length - 1) return;
    // 띄어쓰기에서 나누는 걸 우선하되, 가운데에서 너무 멀면 아무 글자에서나
    const score = Math.abs(acc - half) + (ch === " " ? 0 : 3);
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  });
  const cut = chars[best] === " " ? best : best + 1;
  return [chars.slice(0, cut).join("").trim(), chars.slice(best + 1).join("").trim()];
}

/** 아직 그려지지 않은 댓글의 대략적인 폭 (날아갈 목적지를 미리 정할 때 사용) */
export function estimateWidth(kind: Comment["kind"], text: string) {
  if (kind === "emoji") return 54;
  const longest = Math.max(...splitLines(text).map(widthOf));
  // 16px 굵은 한글 한 글자 ≈ 16px, 좌우 여백 20px씩
  return longest * 16 + 40;
}
