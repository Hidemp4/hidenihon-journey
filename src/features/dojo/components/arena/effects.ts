import { drawLine, fillCircle, rect } from "./draw";
import type { Ninja } from "./ninjas";

type Ctx = CanvasRenderingContext2D;

export type EffectKind = "fire" | "slash" | "wall" | "bolt" | "burst";

export interface Effect {
  kind: EffectKind;
  x: number;
  /** y do chão da "faixa" (lane) em que o efeito acontece */
  laneY: number;
  /** altura do efeito acima do chão */
  height: number;
  dir: 1 | -1;
  vx: number;
  age: number;
  life: number;
  owner: Ninja | null;
  color: string;
  seed: number;
  /** alvo do relâmpago e momento em que ele é atingido */
  target: Ninja | null;
  hitAt: number;
  hitDone: boolean;
  /** extremidade do relâmpago */
  endX: number;
}

export function createEffect(partial: Partial<Effect> & Pick<Effect, "kind" | "x" | "laneY" | "dir" | "life">): Effect {
  return {
    height: 14,
    vx: 0,
    age: 0,
    owner: null,
    color: "#ffffff",
    seed: Math.floor(Math.random() * 1000),
    target: null,
    hitAt: 0,
    hitDone: false,
    endX: partial.x,
    ...partial,
  };
}

function drawFire(ctx: Ctx, e: Effect) {
  const flicker = Math.floor(e.age * 18) % 2;
  const cx = Math.round(e.x);
  const cy = Math.round(e.laneY - e.height);

  // Rastro de brasas.
  for (let i = 1; i <= 5; i += 1) {
    const radius = Math.max(1, 4 - i);
    fillCircle(ctx, cx - e.dir * i * 4, cy + (i % 2 === 0 ? 1 : -1) * flicker, radius, i < 3 ? "#ff7a22" : "#c8321a");
  }

  fillCircle(ctx, cx, cy, 5 + flicker, "#d8341a");
  fillCircle(ctx, cx, cy, 4, "#ff8a2a");
  fillCircle(ctx, cx, cy, 2, "#ffe070");
}

function drawSlash(ctx: Ctx, e: Effect) {
  ctx.save();
  ctx.translate(Math.round(e.x), Math.round(e.laneY - e.height));
  ctx.scale(e.dir, 1);

  rect(ctx, -2, -2, 10, 1, "#3fb8f0");
  rect(ctx, -6, -1, 20, 1, "#6fdcff");
  rect(ctx, -10, 0, 26, 1, "#e6fbff");
  rect(ctx, -6, 1, 20, 1, "#6fdcff");
  rect(ctx, -2, 2, 10, 1, "#3fb8f0");

  // Gotas ficando para trás.
  rect(ctx, -14, -1, 2, 1, "#6fdcff");
  rect(ctx, -18, 1, 2, 1, "#3fb8f0");
  ctx.restore();
}

function drawWall(ctx: Ctx, e: Effect) {
  const rise = Math.min(1, e.age / 0.25);
  const sink = e.age > e.life - 0.3 ? Math.max(0, (e.life - e.age) / 0.3) : 1;
  const heights = [8, 14, 20, 22, 17, 10];
  const x0 = Math.round(e.x) - 12;

  heights.forEach((max, index) => {
    const h = Math.max(1, Math.round(max * rise * sink));
    const x = x0 + index * 4;
    rect(ctx, x, e.laneY - h, 4, h, "#d1ac6c");
    rect(ctx, x, e.laneY - h, 4, 1, "#f0d8a0");
    rect(ctx, x + 3, e.laneY - h + 1, 1, h - 1, "#a98446");
    if (index % 2 === 0) rect(ctx, x + 1, e.laneY - Math.round(h * 0.55), 2, 1, "#b8924f");
  });

  // Poeira subindo.
  for (let i = 0; i < 4; i += 1) {
    const px = x0 + ((e.seed * (i + 3)) % 24);
    const py = e.laneY - 3 - Math.round(e.age * 12) - i * 3;
    rect(ctx, px, py, 2, 1, "#e8d4a4");
  }
}

function drawBolt(ctx: Ctx, e: Effect) {
  // Pisca para parecer elétrico.
  if (Math.floor(e.age * 40) % 5 === 4) return;

  const x0 = Math.round(e.x);
  const y0 = Math.round(e.laneY - e.height - 6);
  const x1 = Math.round(e.endX);
  const y1 = Math.round(e.laneY - 8);
  const segments = Math.max(3, Math.round(Math.abs(x1 - x0) / 7));
  const frame = Math.floor(e.age * 30);
  const points: Array<[number, number]> = [[x0, y0]];

  for (let i = 1; i < segments; i += 1) {
    const jitter = ((e.seed * (i + 7) + frame * 13 * i) % 7) - 3;
    points.push([Math.round(x0 + ((x1 - x0) * i) / segments), Math.round(y0 + ((y1 - y0) * i) / segments + jitter)]);
  }
  points.push([x1, y1]);

  for (let i = 0; i < points.length - 1; i += 1) {
    drawLine(ctx, points[i][0], points[i][1], points[i + 1][0], points[i + 1][1], 3, "#ffd83a");
  }
  for (let i = 0; i < points.length - 1; i += 1) {
    drawLine(ctx, points[i][0], points[i][1], points[i + 1][0], points[i + 1][1], 1, "#ffffff");
  }

  fillCircle(ctx, x1, y1, 2, "#fff6a0");
}

function drawBurst(ctx: Ctx, e: Effect) {
  const progress = e.age / e.life;
  const radius = 2 + Math.round(progress * 8);
  ctx.globalAlpha = Math.max(0, 1 - progress);
  fillCircle(ctx, Math.round(e.x), Math.round(e.laneY - e.height), radius, e.color);
  fillCircle(ctx, Math.round(e.x), Math.round(e.laneY - e.height), Math.max(1, radius - 3), "#ffffff");
  ctx.globalAlpha = 1;
}

export function drawEffect(ctx: Ctx, e: Effect) {
  switch (e.kind) {
    case "fire":
      return drawFire(ctx, e);
    case "slash":
      return drawSlash(ctx, e);
    case "wall":
      return drawWall(ctx, e);
    case "bolt":
      return drawBolt(ctx, e);
    case "burst":
      return drawBurst(ctx, e);
  }
}
