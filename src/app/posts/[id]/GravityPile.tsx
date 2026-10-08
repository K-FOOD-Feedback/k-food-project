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
  - 더미가 칸 높이의 2/3(댓글 전체 화면은 3/4)를 넘으면 맨 위를 그 높이에 두고, 넘친 아래쪽은 그라데이션 뒤로 내립니다.
    댓글 전체 화면(scrollable)에서는 칸을 아래로 스크롤해서 묻힌 댓글도 볼 수 있습니다.
    그 높이를 넘지 않으면 스크롤도 없고, 바닥부터 다 보입니다 (넘쳤는지는 onOverflowChange로 알려 줌).
*/

// 더미가 칸을 이만큼 채우면 그 뒤로는 화면이 따라 내려갑니다.
// 상세 화면 칸은 2/3, 댓글 전체 화면은 칸이 커서 2/3면 너무 비어 보여 3/4.
const FILL_LIMIT = 2 / 3;
const FILL_LIMIT_FULL = 3 / 4;
// 바닥은 칸 아래 경계보다 살짝 아래 (Figma처럼 맨 아래 줄이 그라데이션에 반쯤 걸치게).
// 스크롤 가능한 칸에서는 맨 아래까지 내려 봤을 때 다 보이도록 칸 아래 경계에 맞춥니다.
const FLOOR_BELOW = 12;
const STEP_MS = 1000 / 60;
// 글 댓글은 이 각도(약 30°)까지만 기울어집니다. 틈에 비스듬히 끼어 들어갈 만큼은 기울되, 눕지는 않게.
// 이모지는 제한 없이 굴러갑니다.
const MAX_TILT = 0.52;
const PRESETTLE_STEPS = 60;
// 댓글 전체 화면을 열 때 "와르르" 쏟아지는 연출: 최신 댓글 최대 이만큼을 0.7초 안에 떨어뜨립니다.
// 그보다 오래된 댓글은 이미 쌓인 상태(그라데이션 아래쪽)로 시작합니다.
const RAIN_MAX = 14;
const RAIN_TOTAL_MS = 700;
const RAIN_GAP_MAX_MS = 70;
// 더미가 높아질 때 화면이 따라 내려가는 움직임 (스프링: 부드럽게 출발하고 부드럽게 멈춤)
// 약간 과감쇠(넘치지 않음)로, 연달아 오는 작은 목표 이동을 하나의 매끄러운 내려감으로 이어 줍니다.
const FOLLOW_STIFFNESS = 0.008;
const FOLLOW_DAMPING = 0.22;
// 댓글 사이 간격 (약 1mm). 물리 몸체를 보이는 말풍선보다 이만큼 크게 만듭니다.
const GAP = 4;
// 가운데 선호 정도: 높이가 비슷하면 가운데 쪽을 고르는 정도로만 (가운데에서 100px = 5px 차이).
// 더 세게 하면 가운데만 뾰족하게 솟아, 2/3 유지 때문에 양옆이 그라데이션 아래로 묻힙니다.
const CENTER_PULL = 0.05;
// 자리 높이는 말풍선 가운데 이 비율의 폭 아래만 봅니다 (가장자리는 옆 댓글에 기대어 걸쳐도 되도록).
const PROBE = 0.4;

/** ox·oy: 몸체 무게중심에서 말풍선 요소 중심까지의 거리 (작성자 태그가 붙은 말풍선은 무게중심이 요소 중심과 다름) */
/**
  날아온 원이 도착한 자리 (칸 기준 좌표), 원 지름, 도착할 때의 낙하 속도(px/걸음).
  다음 새 댓글이 여기서 원 → 말풍선으로 펼쳐지며 그 속도 그대로 이어서 떨어집니다.
*/
export type DropHint = { x: number; y: number; d: number; vy: number };

/** 댓글 영역이 더미에 미리 물어보고 지시하는 통로 */
export type PileHandle = {
  /** 이 폭의 댓글이 떨어질 자리 x (칸 기준) */
  planDrop: (width: number) => number;
  /** 다음에 추가되는 댓글을 이 자리에서 떨어뜨림 */
  setNextDrop: (hint: DropHint) => void;
  /** (스크롤 가능한 칸) 맨 위로 스크롤 — 새 댓글이 떨어지는 모습이 보이도록 */
  scrollToTop: () => void;
};

type Tracked = { body: Matter.Body; el: HTMLElement; w: number; h: number; ox: number; oy: number; landed: boolean };

/** matter-js 세계. 바닥 윗면이 y = 0이고 더미는 위쪽(음수 y)으로 쌓입니다. */
class PileWorld {
  private engine = Engine.create({ enableSleeping: true });
  private tracked = new Map<string, Tracked>();
  private width: number;
  private height: number;
  private rightWall: Matter.Body;
  /** 스크롤 가능한 칸이면 그 칸과, 높이를 늘려 줄 안쪽 요소 */
  private scroller: { box: HTMLElement; content: HTMLElement } | null;
  /** 칸 맨 위에 보이는 세계 y좌표 (더미가 높아지면 위로 따라 올라갑니다) */
  private viewTop: number;
  /** 화면이 따라 내려가는 속도 (스프링) */
  private viewVel = 0;
  /**
    화면이 따라갈 목표. 더미는 쌓이기만 하므로 높아지는 쪽(위)으로만 움직이게 해서,
    댓글이 자리 잡으며 생기는 미세한 흔들림을 화면이 따라 떨지 않게 합니다.
    (목표는 닿아서 멈춘 댓글로만 정하므로 실제보다 높게 잡히지 않습니다)
    댓글이 지워지거나 칸 크기가 바뀌면 null로 풀어 다시 계산합니다.
  */
  private followTarget: number | null = null;
  /** 스크롤 칸 안쪽 높이 (바뀔 때만 다시 그리도록 기억) */
  private contentHeight = 0;
  private frame = 0;
  private started = false;
  private nextDrop: DropHint | null = null;
  /** 열 때 쏟아지기로 예약된 댓글 (아직 떨어지기 전) */
  private pendingRain = new Set<string>();
  private timers: number[] = [];
  /** 더미가 채움 한도를 넘어 아래쪽이 묻혔는지 (바뀔 때만 알림) */
  private overflowing = false;
  onOverflowChange: ((overflowing: boolean) => void) | null = null;

  constructor(
    width: number,
    height: number,
    scroller: { box: HTMLElement; content: HTMLElement } | null,
    private rainOnOpen = false,
  ) {
    this.width = width;
    this.height = height;
    this.scroller = scroller;
    this.viewTop = this.defaultTop;
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
    this.timers.forEach(clearTimeout);
    Events.off(this.engine, "collisionStart");
    Engine.clear(this.engine);
    this.tracked.clear();
  }

  /** 더미가 낮을 때 칸 맨 위의 세계 y좌표 (바닥이 칸 아래 경계 근처에 오도록) */
  private get defaultTop() {
    return -(this.height + (this.scroller ? 0 : FLOOR_BELOW));
  }

  /** 칸 크기가 바뀌면(화면 회전·창 크기 변경) 오른쪽 벽을 옮기고, 댓글을 비율대로 펼쳐 다시 쌓습니다. */
  resize(width: number, height: number) {
    this.height = height;
    this.followTarget = null;
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
      this.followTarget = null;
    }
    const fresh = comments.filter((c) => !this.tracked.has(c.id) && !this.pendingRain.has(c.id) && nodes.has(c.id));
    if (fresh.length === 0) return;

    if (!this.started) {
      this.started = true;
      // 쏟아지는 연출이면 최신 댓글 몇 개는 남겨 두었다가 눈앞에서 떨어뜨립니다.
      const rain = this.rainOnOpen ? fresh.slice(-RAIN_MAX) : [];
      const settled = fresh.slice(0, fresh.length - rain.length);
      // 나머지(처음 열 때 기본)는 오래된 순서대로 같은 규칙으로 떨어뜨려 미리 쌓아 둡니다.
      for (const c of settled) {
        this.add(c, nodes.get(c.id)!);
        for (let i = 0; i < PRESETTLE_STEPS; i++) this.step();
      }
      for (let i = 0; i < 120; i++) this.step();
      for (const t of this.tracked.values()) t.landed = true;
      // 미리 쌓아 둔 댓글은 아직 살짝 움직여도 다 넣어서 시작 높이를 잡습니다 (열자마자 화면이 휙 움직이지 않게).
      this.followTarget = this.targetTop(false);
      this.viewTop = this.followTarget;
      this.render(false);
      // 오래된 것부터 차례로, 전체가 1초 안에 끝나도록 간격을 둡니다.
      const gap = Math.min(RAIN_GAP_MAX_MS, RAIN_TOTAL_MS / Math.max(rain.length, 1));
      rain.forEach((c, i) => {
        this.pendingRain.add(c.id);
        this.timers.push(
          window.setTimeout(() => {
            this.pendingRain.delete(c.id);
            const el = nodes.get(c.id);
            if (el && !this.tracked.has(c.id)) this.add(c, el, null, true);
          }, i * gap),
        );
      });
      return;
    }
    // 여러 개가 한꺼번에 들어오면(다른 탭에서 쓴 댓글 등) 한꺼번에 겹쳐 떨어뜨리지 않고 조용히 쌓아 둡니다.
    if (fresh.length > 2) {
      for (const c of fresh) {
        this.add(c, nodes.get(c.id)!);
        for (let i = 0; i < PRESETTLE_STEPS; i++) this.step();
      }
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

  private add(comment: Comment, el: HTMLElement, hint: DropHint | null = null, rain = false) {
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    // 날아온 원이 있으면 그 자리에서, 없으면 더미가 가장 낮은 곳의 칸 맨 위 바로 위에서 떨어집니다.
    const x = hint ? Math.min(Math.max(hint.x, w / 2), this.width - w / 2) : this.pickDropX(w + GAP);
    // 스크롤된 칸이면 지금 보이는 맨 위 기준으로 떨어뜨립니다.
    const scrolled = this.scroller?.box.scrollTop ?? 0;
    // 쏟아지는 연출은 칸 맨 위 바로 위에서 (위로 줄줄이 쌓이지 않도록 다른 댓글 높이는 보지 않음)
    const y = hint
      ? this.viewTop + scrolled + hint.y
      : rain
        ? this.viewTop + scrolled - h / 2 - 8
        : Math.min(this.viewTop, this.highest()) - h / 2 - 8;
    const body = comment.kind === "emoji" ? this.emojiBody(el, x, y, w, h) : this.bubbleBody(el, x, y, w, h);
    // 기울이거나 옆으로 밀지 않고 곧게 떨어집니다 (부딪힌 뒤 기울고 구르는 건 물리에 맡김).
    // 회전 관성은 약간만 키워 빙글빙글 돌지는 않게.
    if (comment.kind === "text") Body.setInertia(body, body.inertia * 1.5);
    // 날아온 원이 내려오던 속도를 이어받아 멈칫 없이 계속 떨어집니다.
    if (hint) Body.setVelocity(body, { x: 0, y: hint.vy });
    // 쏟아질 때는 처음부터 조금 빠르게 (1초 안에 시원하게 떨어지도록)
    if (rain) Body.setVelocity(body, { x: 0, y: 6 });
    Composite.add(this.engine.world, body);
    this.tracked.set(comment.id, { body, el, w, h, ox: x - body.position.x, oy: y - body.position.y, landed: false });
    el.style.visibility = "visible";
    // 작은 원 → 본래 크기 말풍선: 잘라서 가리지 않고, 말풍선 전체가 원 크기에서 본래 크기로 커집니다.
    // (가운데만 보이게 잘라 두고 펼치면, 떨어지는 동안 양옆이 가려진 것처럼 보였습니다)
    const inner = el.firstElementChild as HTMLElement | null;
    if (hint && inner && hint.d < w) {
      inner.animate([{ scale: `${hint.d / w}` }, { scale: "1" }], {
        duration: 300,
        easing: "cubic-bezier(0.3, 1.3, 0.5, 1)",
      });
    }
  }

  /**
    이모지 몸체. 태그(작성자·나)가 없으면 굴러가는 원,
    태그가 있으면 '원 + 위로 튀어나온 태그' 두 조각을 합치고 돌지 않게 해서 태그가 늘 위에 있게 합니다.
  */
  private emojiBody(el: HTMLElement, x: number, y: number, w: number, h: number) {
    // 마찰이 있어야 미끄러지지 않고 굴러갑니다.
    const options = { restitution: 0.15, friction: 0.5, frictionStatic: 0.8, frictionAir: 0.006, density: 0.002 };
    const circle = el.querySelector<HTMLElement>("[data-part=bubble]");
    const tag = el.querySelector<HTMLElement>("[data-part=tag]");
    if (!circle || !tag) return Bodies.circle(x, y, (w + GAP) / 2, options);
    const left = x - w / 2;
    const top = y - h / 2;
    const d = circle.offsetWidth;
    const round = Bodies.circle(left + circle.offsetLeft + d / 2, top + circle.offsetTop + d / 2, (d + GAP) / 2);
    const body = Body.create({ ...options, parts: [round, this.rectPart(tag, left, top)] });
    Body.setInertia(body, Infinity);
    return body;
  }

  /** 요소 하나 크기의 둥근 사각형 조각 (left·top: 댓글 요소 왼쪽 위의 세계 좌표) */
  private rectPart(p: HTMLElement, left: number, top: number, extra: object = {}) {
    // offset* 값은 회전·이동(transform)의 영향을 받지 않아서, 화면에 어떻게 그려져 있든 원래 크기를 잽니다.
    const pw = p.offsetWidth + GAP;
    const ph = p.offsetHeight + GAP;
    return Bodies.rectangle(left + p.offsetLeft + p.offsetWidth / 2, top + p.offsetTop + p.offsetHeight / 2, pw, ph, {
      ...extra,
      chamfer: { radius: Math.min(ph / 2 - 1, 32) },
    });
  }

  /**
    말풍선 몸체. 요소 중심이 (x, y)에 오도록 만듭니다.
    태그(작성자·나·답글)가 붙은 말풍선은 '말풍선 + 위로 튀어나온 태그 줄' 두 조각을 합쳐서,
    태그 자리만 막고 나머지 윗부분은 다른 댓글처럼 GAP만큼만 띄웁니다.
  */
  private bubbleBody(el: HTMLElement, x: number, y: number, w: number, h: number) {
    // 튕김은 거의 없게. 마찰은 낮게 해서 틈 위에 걸치지 않고 미끄러져 빈 곳으로 들어가게 합니다.
    const options = { restitution: 0.05, friction: 0.12, frictionStatic: 0.3, frictionAir: 0.01, density: 0.002 };
    const left = x - w / 2;
    const top = y - h / 2;
    const part = (p: HTMLElement, extra: object = {}) => this.rectPart(p, left, top, extra);
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

  /** x0~x1 폭 아래에서 쌓인(이미 닿은) 댓글의 가장 높은 윗면 (없으면 바닥) */
  private landedSurface(x0: number, x1: number) {
    let surface = 0;
    for (const { body, landed } of this.tracked.values()) {
      const b = body.bounds;
      if (landed && b.max.x > x0 && b.min.x < x1) surface = Math.min(surface, b.min.y);
    }
    return surface;
  }

  /** 더미가 가장 낮은 곳 (= 위쪽 여백이 가장 많은 곳)의 x좌표. 비슷하면 가운데에 가까운 쪽 */
  private pickDropX(w: number) {
    const min = w / 2;
    const max = Math.max(min, this.width - w / 2);
    const center = this.width / 2;
    // 아직 떨어지는 중인 댓글은 지금 위치가 아니라 '떨어질 자리 위에 얹힌 모습'으로 계산합니다.
    // (와르르 쏟아질 때 공중에 있는 댓글 때문에 한쪽으로만 몰리지 않도록)
    const falling = [...this.tracked.values()]
      .filter((t) => !t.landed)
      .map(({ body }) => {
        const b = body.bounds;
        return { x0: b.min.x, x1: b.max.x, top: this.landedSurface(b.min.x, b.max.x) - (b.max.y - b.min.y) - GAP };
      });
    let bestX = center;
    let bestScore = -Infinity;
    for (let x = min; x <= max; x += 4) {
      // 말풍선 가운데 부분 아래에서 가장 높이 솟은 댓글의 윗면 (없으면 바닥)
      const half = (w * PROBE) / 2;
      let surface = this.landedSurface(x - half, x + half);
      for (const f of falling) if (f.x1 > x - half && f.x0 < x + half) surface = Math.min(surface, f.top);
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

  /** 더미 맨 위가 칸의 채움 한도(2/3, 전체 화면 3/4)를 넘지 않도록 하는 칸 맨 위 y좌표 */
  /** settledOnly: 닿아서 거의 멈춘 댓글만 봅니다 (떨어지거나 통통 튀는 중인 댓글까지 보면 목표가 들쭉날쭉해짐) */
  private targetTop(settledOnly = true) {
    let pileTop = 0;
    for (const { body, landed } of this.tracked.values()) {
      if (landed && (!settledOnly || body.speed < 0.4)) pileTop = Math.min(pileTop, body.bounds.min.y);
    }
    const limit = this.scroller ? FILL_LIMIT_FULL : FILL_LIMIT;
    return Math.min(this.defaultTop, pileTop - this.height * (1 - limit));
  }

  private render(smooth: boolean) {
    const computed = this.targetTop();
    const target = (this.followTarget = this.followTarget === null ? computed : Math.min(this.followTarget, computed));
    if (smooth) {
      // 스프링으로 따라갑니다: 목표와의 거리만큼 당기고, 속도만큼 늦춰서 부드럽게 가속·감속.
      this.viewVel += (target - this.viewTop) * FOLLOW_STIFFNESS - this.viewVel * FOLLOW_DAMPING;
      this.viewTop += this.viewVel;
    } else {
      this.viewTop = target;
      this.viewVel = 0;
    }
    // 스크롤 가능한 칸: 바닥까지 다 보이도록 안쪽 높이를 늘립니다.
    // 40px 단위로만 바꿔서, 더미가 움직이는 동안 매 프레임 칸 전체를 다시 그리지 않게 합니다.
    // 더미가 채움 한도를 넘지 않았으면 칸 높이 그대로 (스크롤 없음).
    const overflowing = target < this.defaultTop - 1;
    if (overflowing !== this.overflowing) {
      this.overflowing = overflowing;
      this.onOverflowChange?.(overflowing);
    }
    if (this.scroller) {
      const below = -this.viewTop - this.height;
      const height = below < 1 ? this.height : this.height + Math.ceil(below / 40) * 40;
      if (height !== this.contentHeight) {
        this.contentHeight = height;
        this.scroller.content.style.height = `${height}px`;
      }
    }
    for (const { body, el, w, h, ox, oy, landed } of this.tracked.values()) {
      // 무게중심 + (회전한) 요소 중심까지의 거리 = 요소 중심
      const cos = Math.cos(body.angle);
      const sin = Math.sin(body.angle);
      const cx = body.position.x + ox * cos - oy * sin;
      const cy = body.position.y + ox * sin + oy * cos - this.viewTop;
      // 그라데이션 아래로 한참 내려가 완전히 멈춘 댓글은 더 움직일 일이 없으니 고정해서 계산을 아낍니다.
      // (떨어지는 중인 댓글을 고정하면 공중에 걸려 그 위로 탑이 쌓이므로, 닿아서 멈춘 것만)
      if (!body.isStatic && landed && body.speed < 0.1 && cy - h > this.height + 200) Body.setStatic(body, true);
      el.style.transform = `translate(${cx - w / 2}px, ${cy - h / 2}px) rotate(${body.angle}rad)`;
    }
  }
}

/**
  className: 칸 높이 (기본은 상세 화면의 286px)
  scrollable: 댓글 전체 화면처럼, 칸을 스크롤해서 그라데이션 아래로 묻힌 댓글까지 볼 수 있게
*/
export function GravityPile({
  comments,
  ref,
  className = "h-[286px]",
  scrollable = false,
  rainOnOpen = false,
  ready = true,
  onOverflowChange,
}: {
  comments: Comment[];
  ref?: Ref<PileHandle>;
  className?: string;
  scrollable?: boolean;
  /** 열 때 최신 댓글들이 위에서 와르르 쏟아지는 연출 (0.7초 이내) */
  rainOnOpen?: boolean;
  /** 저장된 댓글까지 다 읽어 왔는지. 그 전에 쌓기 시작하면 나중에 들어온 댓글이 한꺼번에 떨어집니다. */
  ready?: boolean;
  /** 더미가 칸의 채움 한도를 넘어 아래쪽이 그라데이션 아래로 묻히기 시작했는지 / 다시 다 보이는지 */
  onOverflowChange?: (overflowing: boolean) => void;
}) {
  const zone = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const nodes = useRef(new Map<string, HTMLElement>());
  const world = useRef<PileWorld | null>(null);
  const overflowCallback = useRef(onOverflowChange);
  useLayoutEffect(() => {
    overflowCallback.current = onOverflowChange;
  });

  useImperativeHandle(
    ref,
    () => ({
      planDrop: (width) => world.current?.planDrop(width) ?? (zone.current?.clientWidth ?? 0) / 2,
      setNextDrop: (hint) => world.current?.setNextDrop(hint),
      scrollToTop: () => zone.current?.scrollTo({ top: 0, behavior: "smooth" }),
    }),
    [],
  );

  useLayoutEffect(() => {
    const box = zone.current!;
    const pile = new PileWorld(
      box.clientWidth,
      box.clientHeight,
      scrollable ? { box, content: content.current! } : null,
      rainOnOpen,
    );
    world.current = pile;
    pile.onOverflowChange = (v) => overflowCallback.current?.(v);
    pile.start();
    const observer = new ResizeObserver(() => pile.resize(box.clientWidth, box.clientHeight));
    observer.observe(box);
    return () => {
      observer.disconnect();
      pile.destroy();
      world.current = null;
    };
  }, [scrollable, rainOnOpen]);

  useLayoutEffect(() => {
    if (ready) world.current?.sync(comments, nodes.current);
  }, [comments, ready]);

  // 태그용: 답글의 원글 찾기, 한마디별 답글 수
  const byId = new Map(comments.map((c) => [c.id, c]));
  const replyCounts = new Map<string, number>();
  for (const c of comments) if (c.replyTo) replyCounts.set(c.replyTo, (replyCounts.get(c.replyTo) ?? 0) + 1);

  return (
    <div
      ref={zone}
      className={`relative w-full select-none ${className} ${
        scrollable ? "overflow-x-hidden overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : ""
      }`}
      aria-label="최근 댓글"
    >
      {/* 스크롤 칸: 기울어진 이모지 원의 모서리가 아래로 삐져나와 스크롤이 생기지 않도록 잘라 냅니다.
          (상세 화면 칸은 제목 줄에서 떨어지는 말풍선이 보여야 해서 자르지 않음) */}
      <div ref={content} className={`relative h-full w-full ${scrollable ? "overflow-clip" : ""}`}>
        {comments.map((c) => (
          <div
            key={c.id}
            ref={(el) => {
              if (el) nodes.current.set(c.id, el);
              else nodes.current.delete(c.id);
            }}
            className="invisible absolute top-0 left-0 will-change-transform"
          >
            <Bubble comment={c} tags={tagsOf(c, byId, replyCounts)} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** 말풍선 위 태그 줄에 들어갈 내용 */
type Tags = {
  /** 내가 쓴 한마디면 "나", 게시글 작성자가 쓴 한마디면 "작성자" */
  who: "나" | "작성자" | null;
  /** 답글이면 원글 내용 (태그에는 앞부분만 보임) */
  replyToText: string | null;
  /** 이 한마디에 달린 답글 수 */
  replies: number;
};

function tagsOf(comment: Comment, byId: Map<string, Comment>, replyCounts: Map<string, number>): Tags {
  const parent = comment.replyTo ? byId.get(comment.replyTo) : undefined;
  return {
    who: comment.mine ? "나" : comment.author.kind === "author" ? "작성자" : null,
    replyToText: parent ? parent.text.replace(/\n/g, " ") : null,
    replies: replyCounts.get(comment.id) ?? 0,
  };
}

const TAG = "flex h-[18px] shrink-0 items-center gap-0.5 rounded-full bg-black text-[10px] leading-none font-bold tracking-[-0.2px] whitespace-nowrap text-white";
// PC에서 마우스를 올리면 흰 테두리 + 은은한 빛 (Figma 344:3248). outline이라 크기는 그대로입니다.
const HOVER =
  "outline-2 outline-transparent transition-[outline-color,box-shadow] duration-150 hover:shadow-[0_2px_12px_rgba(255,255,255,0.3)] hover:outline-white";

/**
  한마디 말풍선 (Figma 344:3209 한마디 상태)
  - 태그: 작성자 / 나, 답글이면 "↩ 원글", 답글이 달렸으면 "↪ 답글 수"
  - 태그가 있으면 말풍선 위로 튀어나온 만큼 위쪽 여백을 둡니다.
    물리 몸체는 말풍선 + 태그 줄 두 조각이라, 태그 자리만 막히고 나머지 윗부분은 다른 댓글과 같은 간격입니다.
*/
function Bubble({ comment, tags }: { comment: Comment; tags: Tags }) {
  const { author } = comment;
  const emoji = comment.kind === "emoji";
  const bubble = emoji ? (
    <span
      data-part="bubble"
      className={`flex size-[54px] items-center justify-center rounded-full text-[16px] ${HOVER}`}
      style={{ background: comment.color }}
    >
      {comment.text}
    </span>
  ) : (
    <span
      data-part="bubble"
      className={`flex items-center justify-center gap-2 rounded-[32px] py-4 text-center text-[16px] leading-[1.4] font-bold tracking-[-0.32px] whitespace-pre text-black ${
        author.kind === "korean" ? "px-5" : "pr-5 pl-2.5"
      } ${HOVER}`}
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
  if (!tags.who && !tags.replyToText && !tags.replies) return bubble;
  return (
    <span className="relative block pt-2.5">
      {bubble}
      {/* 이모지는 태그를 가운데에. transform으로 옮기면 물리 몸체 위치(offsetLeft)가 어긋나서 flex로 가운데 맞춤 */}
      <span data-part="tag" className={`absolute top-0 flex gap-0.5 ${emoji ? "inset-x-0 justify-center" : "left-6"}`}>
        {tags.who && <span className={`${TAG} px-1.5`}>{tags.who}</span>}
        {tags.replyToText && (
          <span className={`${TAG} pr-1.5 pl-1`} aria-label={`답글: ${tags.replyToText}`}>
            <ReplyToIcon />
            <span className="max-w-[42px] overflow-hidden text-ellipsis">{tags.replyToText}</span>
          </span>
        )}
        {tags.replies > 0 && (
          <span className={`${TAG} pr-1.5 pl-1`} aria-label={`답글 ${tags.replies}개`}>
            <RepliesIcon />
            {tags.replies}
          </span>
        )}
      </span>
    </span>
  );
}

// 답글 태그 아이콘 (Figma ic_reply): ↩ 원글에 답함
function ReplyToIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="white" aria-hidden="true" className="shrink-0">
      <path d="M4.85339 3.34736C4.94447 3.25305 4.99487 3.12675 4.99373 2.99566C4.99259 2.86456 4.94001 2.73915 4.8473 2.64645C4.7546 2.55374 4.62919 2.50116 4.49809 2.50002C4.367 2.49888 4.24069 2.54928 4.14639 2.64036L1.64639 5.14036C1.55266 5.23412 1.5 5.36127 1.5 5.49386C1.5 5.62644 1.55266 5.75359 1.64639 5.84736L4.14639 8.34736C4.24069 8.43844 4.367 8.48883 4.49809 8.48769C4.62919 8.48655 4.7546 8.43397 4.8473 8.34126C4.94001 8.24856 4.99259 8.12315 4.99373 7.99206C4.99487 7.86096 4.94447 7.73466 4.85339 7.64036L3.20689 5.99386H6.49989C7.29554 5.99386 8.0586 6.30993 8.62121 6.87254C9.18382 7.43514 9.49989 8.19821 9.49989 8.99386C9.49989 9.12646 9.55257 9.25364 9.64634 9.34741C9.74011 9.44118 9.86728 9.49386 9.99989 9.49386C10.1325 9.49386 10.2597 9.44118 10.3534 9.34741C10.4472 9.25364 10.4999 9.12646 10.4999 8.99386C10.4999 7.93299 10.0785 6.91557 9.32832 6.16543C8.57818 5.41528 7.56076 4.99386 6.49989 4.99386H3.20689L4.85339 3.34736Z" />
    </svg>
  );
}

// 답글 수 태그 아이콘 (Figma ic_reply): ↪ 답글이 달림
function RepliesIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="white" aria-hidden="true" className="shrink-0">
      <path d="M7.14661 9.1465C7.05553 9.2408 7.00513 9.3671 7.00627 9.4982C7.00741 9.6293 7.05999 9.7547 7.1527 9.84741C7.2454 9.94011 7.37081 9.9927 7.50191 9.99384C7.633 9.99498 7.75931 9.94458 7.85361 9.8535L10.3536 7.3535C10.4473 7.25974 10.5 7.13258 10.5 7C10.5 6.86742 10.4473 6.74026 10.3536 6.6465L7.85361 4.1465C7.75931 4.05542 7.633 4.00502 7.50191 4.00616C7.37081 4.0073 7.2454 4.05989 7.1527 4.15259C7.05999 4.24529 7.00741 4.3707 7.00627 4.5018C7.00513 4.6329 7.05553 4.7592 7.14661 4.8535L8.79311 6.5H5.50011C4.70446 6.5 3.9414 6.18393 3.37879 5.62132C2.81618 5.05871 2.50011 4.29565 2.50011 3.5C2.50011 3.36739 2.44743 3.24021 2.35366 3.14645C2.25989 3.05268 2.13272 3 2.00011 3C1.8675 3 1.74032 3.05268 1.64655 3.14645C1.55278 3.24021 1.50011 3.36739 1.50011 3.5C1.50011 4.56087 1.92153 5.57828 2.67168 6.32843C3.42182 7.07857 4.43924 7.5 5.50011 7.5H8.79311L7.14661 9.1465Z" />
    </svg>
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
