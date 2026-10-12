/*
  투표 완료 축하 폭죽 (상세 화면 전용, 이모지 없이 색 조각만)
  - 터지는 곳(x, y)에서 조각들이 사방으로 튀어 올랐다가 중력처럼 떨어지며 돌고 사라짐
  - 화면 전체 위에 잠깐 띄웠다가 끝나면 지움. 누르기는 그대로 통과 (pointer-events: none)
  - 색은 디자인 토큰(globals.css)만 씀
*/

const COLORS = [
  "var(--color-primary)",
  "var(--color-content)",
  "var(--color-lilac)",
  "var(--color-secondary)",
  "var(--color-on-dark)",
];
const PIECES = 70;
const DURATION = 1300;
const GRAVITY = 1400; // px/s²

export function burstConfetti(x: number, y: number) {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  Object.assign(layer.style, { position: "fixed", inset: "0", zIndex: "60", pointerEvents: "none", overflow: "hidden" });
  document.body.appendChild(layer);

  const animations: Animation[] = [];
  for (let i = 0; i < PIECES; i++) {
    const piece = document.createElement("span");
    const kind = i % 3; // 0 길쭉한 종이, 1 동그라미, 2 네모
    const size = 6 + Math.random() * 6;
    Object.assign(piece.style, {
      position: "absolute",
      left: `${x}px`,
      top: `${y}px`,
      width: `${kind === 0 ? size * 0.5 : size}px`,
      height: `${kind === 0 ? size * 1.8 : size}px`,
      borderRadius: kind === 1 ? "9999px" : "2px",
      background: COLORS[i % COLORS.length],
    });
    layer.appendChild(piece);

    // 위쪽으로 부채꼴(대부분 위로, 일부는 옆으로) 튀어 나감
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3;
    const speed = 500 + Math.random() * 650; // px/s
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const spin = (Math.random() - 0.5) * 1080;
    const life = (DURATION * (0.75 + Math.random() * 0.25)) / 1000;

    const frames: Keyframe[] = [];
    const steps = 8;
    for (let s = 0; s <= steps; s++) {
      const t = (life * s) / steps;
      // 공기 저항으로 옆 속도는 점점 줄고, 아래로는 중력
      const dx = vx * t * (1 - t / (life * 2));
      const dy = vy * t + 0.5 * GRAVITY * t * t;
      frames.push({
        offset: s / steps,
        transform: `translate(${dx}px, ${dy}px) rotate(${spin * (t / life)}deg) scale(${s === 0 ? 0.4 : 1})`,
        opacity: s / steps > 0.75 ? 1 - (s / steps - 0.75) / 0.25 : 1,
      });
    }
    animations.push(piece.animate(frames, { duration: life * 1000, easing: "linear", fill: "forwards" }));
  }

  // 다 끝나면(또는 탭이 가려져 멈춰도 시간이 지나면) 치움
  let removed = false;
  const remove = () => {
    if (removed) return;
    removed = true;
    layer.remove();
  };
  Promise.all(animations.map((a) => a.finished)).then(remove, remove);
  window.setTimeout(remove, DURATION + 500);
}
