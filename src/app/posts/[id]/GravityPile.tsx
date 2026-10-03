"use client";

import Matter from "matter-js";
import { useLayoutEffect, useRef } from "react";
import type { Comment } from "./comments";

const { Engine, Bodies, Body, Composite, Events, Sleeping } = Matter;

/*
  댓글 더미 (Figma "Gravity zone")
  - 새 댓글은 더미가 가장 낮은 곳(빈 곳이 가장 많은 곳) 위에서 떨어지고, 부딪히며 기울어집니다.
  - 이모지는 동그라미라 떨어진 뒤 굴러갑니다.
  - 더미가 칸 높이의 2/3를 넘으면 맨 위를 2/3 높이에 두고, 넘친 아래쪽은 그라데이션 뒤로 내립니다.
*/

const HEIGHT = 286;
const FILL_LIMIT = 2 / 3;
// 바닥은 칸 아래 경계보다 살짝 아래 (Figma처럼 맨 아래 줄이 그라데이션에 반쯤 걸치게)
const FLOOR_BELOW = 12;
const STEP_MS = 1000 / 60;
// 글 댓글은 읽을 수 있도록 이 각도(약 43°)까지만 기울어집니다. 이모지는 제한 없이 굴러갑니다.
const MAX_TILT = 0.75;
const PRESETTLE_STEPS = 60;

// 처음 달려 있는 댓글의 시작 자리 (Figma 351px 폭 기준 중심 좌표·각도, comments.ts의 seed 번호 순)
const DESIGN_WIDTH = 351;
const SEED_POSES: Record<string, { x: number; y: number; r: number }> = {
  1: { x: 51, y: 270, r: 0 },
  2: { x: 175, y: 270, r: 0 },
  3: { x: 288, y: 270, r: 0 },
  4: { x: 79, y: 221, r: -15 },
  5: { x: 178, y: 195, r: 10.38 },
  6: { x: 323, y: 227, r: 0 },
  7: { x: 270, y: 152, r: 23.01 },
  8: { x: 74, y: 147, r: -39.19 },
  9: { x: 212, y: 69, r: 8.3 },
};

type Tracked = { body: Matter.Body; el: HTMLElement; w: number; h: number; landed: boolean };

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

  constructor(width: number) {
    this.width = width;
    this.engine.gravity.y = 1.1;
    const wall = { isStatic: true, friction: 0.5 };
    this.rightWall = Bodies.rectangle(width + 50, -50000, 100, 100000, wall);
    Composite.add(this.engine.world, [
      // 바닥은 칸보다 넉넉히 넓게 (화면 폭이 넓어져도 그대로 쓰도록)
      Bodies.rectangle(width / 2, 50, 4000, 100, wall),
      Bodies.rectangle(-50, -50000, 100, 100000, wall),
      this.rightWall,
    ]);
    // 무언가에 처음 닿은 순간부터 '쌓인 댓글'로 칩니다 (떨어지는 중인 댓글은 높이 계산에서 제외).
    Events.on(this.engine, "collisionStart", (e) => {
      for (const { bodyA, bodyB } of e.pairs) {
        for (const t of this.tracked.values()) {
          if (t.body === bodyA || t.body === bodyB) t.landed = true;
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
    const fresh = comments.filter((c) => !this.tracked.has(c.id) && nodes.has(c.id));
    if (fresh.length === 0) return;

    if (!this.started) {
      this.started = true;
      for (const c of fresh) {
        const seed = SEED_POSES[c.id.split("-seed-")[1] ?? ""];
        this.add(c, nodes.get(c.id)!, seed);
        if (!seed) for (let i = 0; i < PRESETTLE_STEPS; i++) this.step();
      }
      for (let i = 0; i < 120; i++) this.step();
      for (const t of this.tracked.values()) t.landed = true;
      this.viewTop = this.targetTop();
      this.render(false);
      return;
    }
    for (const c of fresh) this.add(c, nodes.get(c.id)!);
  }

  private add(comment: Comment, el: HTMLElement, seed?: { x: number; y: number; r: number }) {
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const scale = this.width / DESIGN_WIDTH;
    const x = seed ? seed.x * scale : this.pickDropX(w);
    // 새 댓글은 칸 맨 위 바로 위에서 떨어집니다.
    const y = seed ? seed.y + this.defaultTop : this.viewTop - h / 2 - 8;
    const common = { restitution: 0.15, friction: 0.5, frictionAir: 0.01, density: 0.002 };
    const body =
      comment.kind === "emoji"
        ? // 마찰이 있어야 미끄러지지 않고 굴러갑니다.
          Bodies.circle(x, y, w / 2, { ...common, friction: 0.4, frictionStatic: 0.6, frictionAir: 0.004, restitution: 0.35 })
        : Bodies.rectangle(x, y, w, h, { ...common, chamfer: { radius: Math.min(h / 2 - 1, 30) } });
    const dir = Math.random() < 0.5 ? -1 : 1;
    if (seed) {
      Body.setAngle(body, (seed.r * Math.PI) / 180);
    } else if (comment.kind === "emoji") {
      // 동그라미는 옆으로 밀면서 떨어뜨려, 닿은 뒤 그 방향으로 굴러가게 합니다.
      Body.setVelocity(body, { x: dir * (2 + Math.random() * 1.5), y: 0 });
      Body.setAngularVelocity(body, dir * 0.15);
    } else {
      // 한쪽으로 기울어진 채 돌면서 떨어지고, 부딪히면 중력에 따라 그 방향으로 더 기웁니다.
      Body.setAngle(body, dir * (0.15 + Math.random() * 0.2));
      Body.setAngularVelocity(body, dir * (0.02 + Math.random() * 0.02));
    }
    Composite.add(this.engine.world, body);
    this.tracked.set(comment.id, { body, el, w, h, landed: !!seed });
    el.style.visibility = "visible";
  }

  /** 더미가 가장 낮은 곳 (= 위쪽 여백이 가장 많은 곳)의 x좌표 */
  private pickDropX(w: number) {
    const min = w / 2 + 4;
    const max = Math.max(min, this.width - w / 2 - 4);
    let best: number[] = [];
    let bestSurface = -Infinity;
    for (let x = min; x <= max; x += 6) {
      // 이 폭 안에서 가장 높이 솟은 댓글의 윗면 (없으면 바닥)
      let surface = 0;
      for (const { body } of this.tracked.values()) {
        const b = body.bounds;
        if (b.max.x > x - w / 2 && b.min.x < x + w / 2) surface = Math.min(surface, b.min.y);
      }
      if (surface > bestSurface + 4) {
        bestSurface = surface;
        best = [x];
      } else if (surface >= bestSurface - 4) {
        best.push(x);
      }
    }
    return best[Math.floor(Math.random() * best.length)] ?? this.width / 2;
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
    for (const { body, el, w, h } of this.tracked.values()) {
      const y = body.position.y - this.viewTop;
      // 그라데이션 아래로 한참 내려간 댓글은 더 움직일 일이 없으니 고정해서 계산을 아낍니다.
      if (!body.isStatic && y - h > HEIGHT + 200) Body.setStatic(body, true);
      el.style.transform = `translate(${body.position.x - w / 2}px, ${y - h / 2}px) rotate(${body.angle}rad)`;
    }
  }
}

export function GravityPile({ comments }: { comments: Comment[] }) {
  const zone = useRef<HTMLDivElement>(null);
  const nodes = useRef(new Map<string, HTMLElement>());
  const world = useRef<PileWorld | null>(null);

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
      {comment.text}
    </span>
  );
  if (author.kind !== "author") return bubble;
  // "작성자" 태그가 말풍선 위로 튀어나온 만큼 위쪽 여백을 둬서, 태그까지 댓글 크기(물리 몸체)에 들어가게 합니다.
  // 그래야 다른 댓글이 태그 위로 떨어져 가리지 않습니다.
  return (
    <span className="relative block pt-2.5">
      {bubble}
      <span className="absolute top-0 left-[30px] rounded-full bg-black px-1.5 py-1 text-[10px] leading-none font-bold text-white">
        작성자
      </span>
    </span>
  );
}
