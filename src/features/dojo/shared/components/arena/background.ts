import { fillCircle, rect } from "./draw";
import { range, type Rng } from "./rng";

type Ctx = CanvasRenderingContext2D;
export type CanvasFactory = (width: number, height: number) => HTMLCanvasElement;

/** Faixas do céu, do topo ao horizonte. */
const SKY_BANDS = ["#2b8f7e", "#37a085", "#47b08c", "#5cc096", "#75cfa0", "#92dcaa", "#b0e8b4"];

function getContext(canvas: HTMLCanvasElement): Ctx {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D indisponível");
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

export function buildSkyLayer(createCanvas: CanvasFactory, width: number, height: number, groundY: number) {
  const canvas = createCanvas(width, height);
  const ctx = getContext(canvas);
  const bandHeight = Math.max(1, Math.ceil(groundY / SKY_BANDS.length));

  SKY_BANDS.forEach((color, index) => rect(ctx, 0, index * bandHeight, width, bandHeight + 1, color));

  // Transição "dithered" entre as faixas (xadrez de 2 linhas), típica de pixel art.
  for (let index = 1; index < SKY_BANDS.length; index += 1) {
    const boundary = index * bandHeight;
    for (let row = 0; row < 2; row += 1) {
      ctx.fillStyle = SKY_BANDS[index];
      for (let x = row; x < width; x += 2) ctx.fillRect(x, boundary - 2 + row, 1, 1);
    }
  }

  return canvas;
}

export interface CloudSprite {
  canvas: HTMLCanvasElement;
  y: number;
  speed: number;
  offset: number;
}

function buildCloudCanvas(createCanvas: CanvasFactory, scale: number) {
  const width = Math.round(46 * scale);
  const height = Math.round(15 * scale);
  const canvas = createCanvas(width, height);
  const ctx = getContext(canvas);
  const circles: Array<[number, number, number]> = [
    [10, 10, 5],
    [19, 7, 6],
    [29, 8, 6],
    [38, 11, 4],
  ];

  circles.forEach(([cx, cy, r]) => fillCircle(ctx, Math.round(cx * scale), Math.round(cy * scale), Math.round(r * scale), "#e8f7d4"));
  rect(ctx, Math.round(8 * scale), Math.round(10 * scale), Math.round(32 * scale), Math.round(5 * scale), "#e8f7d4");

  // Sombra na parte de baixo, só onde já existe nuvem.
  ctx.globalCompositeOperation = "source-atop";
  rect(ctx, 0, Math.round(11 * scale), width, height, "#c3e6ae");
  rect(ctx, 0, Math.round(13 * scale), width, height, "#a9d79c");
  ctx.globalCompositeOperation = "source-over";

  return canvas;
}

export function buildClouds(createCanvas: CanvasFactory, rng: Rng, groundY: number): CloudSprite[] {
  const skyCap = Math.min(groundY, 120);
  const specs = [
    { scale: 1, y: 0.1, speed: 2.2 },
    { scale: 0.7, y: 0.26, speed: 1.4 },
    { scale: 1.2, y: 0.4, speed: 3.1 },
    { scale: 0.6, y: 0.18, speed: 1 },
  ];

  return specs.map((spec) => ({
    canvas: buildCloudCanvas(createCanvas, spec.scale),
    y: Math.round(groundY - skyCap + spec.y * skyCap * 0.7),
    speed: spec.speed,
    offset: rng() * 400,
  }));
}

interface MountainLayer {
  color: string;
  shade: string;
  edge: string;
  /** altura da base da crista, em fração da altura útil do céu */
  base: number;
  amp: number;
  freq: [number, number, number];
  peaks: number;
}

const MOUNTAIN_LAYERS: MountainLayer[] = [
  { color: "#69bd93", shade: "#5cb088", edge: "#8fd6aa", base: 0.52, amp: 0.1, freq: [0.011, 0.027, 0.06], peaks: 4 },
  { color: "#46a07c", shade: "#3b9071", edge: "#69bd93", base: 0.34, amp: 0.11, freq: [0.016, 0.035, 0.08], peaks: 2 },
  { color: "#2c7a5e", shade: "#256b52", edge: "#46a07c", base: 0.17, amp: 0.06, freq: [0.02, 0.05, 0.11], peaks: 0 },
];

export function buildMountainLayer(createCanvas: CanvasFactory, width: number, height: number, groundY: number, rng: Rng) {
  const canvas = createCanvas(width, height);
  const ctx = getContext(canvas);
  const cap = Math.min(groundY, 120);

  MOUNTAIN_LAYERS.forEach((layer, layerIndex) => {
    const phases = [rng() * 6.28, rng() * 6.28, rng() * 6.28];
    const peaks = Array.from({ length: layer.peaks }, () => ({
      x: range(rng, width * 0.25, width),
      height: range(rng, 0.14, 0.26) * cap,
      width: range(rng, 14, 30),
    }));

    for (let x = 0; x < width; x += 1) {
      const noise =
        0.5 * Math.sin(x * layer.freq[0] + phases[0]) +
        0.3 * Math.sin(x * layer.freq[1] + phases[1]) +
        0.2 * Math.sin(x * layer.freq[2] + phases[2]);
      let ridge = groundY - layer.base * cap - noise * layer.amp * cap;
      for (const peak of peaks) ridge -= Math.max(0, peak.height * (1 - Math.abs(x - peak.x) / peak.width));
      ridge = Math.round(ridge);

      const bodyHeight = groundY - ridge + 2;
      rect(ctx, x, ridge, 1, bodyHeight, layer.color);
      rect(ctx, x, ridge + 14, 1, Math.max(0, bodyHeight - 14), layer.shade);
      rect(ctx, x, ridge, 1, 1, layer.edge);
    }

    // Névoa entre as camadas, para dar profundidade.
    if (layerIndex < MOUNTAIN_LAYERS.length - 1) {
      ctx.globalAlpha = 0.14;
      rect(ctx, 0, Math.round(groundY - (layer.base - 0.12) * cap), width, Math.round(cap * 0.1), "#d6fae2");
      ctx.globalAlpha = 1;
    }
  });

  // Linha de árvores pequenas na colina mais próxima.
  ctx.fillStyle = "#1f5f49";
  for (let x = 3; x < width; x += Math.round(range(rng, 5, 9))) {
    const treeHeight = Math.round(range(rng, 4, 8));
    const baseY = groundY - 2;
    ctx.fillRect(x, baseY - treeHeight, 1, treeHeight);
    ctx.fillRect(x - 1, baseY - treeHeight + 2, 3, 1);
    ctx.fillRect(x - 2, baseY - treeHeight + 4, 5, 1);
  }

  return canvas;
}

export function buildGroundLayer(createCanvas: CanvasFactory, width: number, height: number, groundY: number, rng: Rng) {
  const canvas = createCanvas(width, height);
  const ctx = getContext(canvas);

  rect(ctx, 0, groundY, width, height - groundY, "#1f5a38");
  rect(ctx, 0, groundY, width, 2, "#5cd24e");
  rect(ctx, 0, groundY + 2, width, 1, "#3fae43");
  rect(ctx, 0, groundY + 3, width, 2, "#2c8a3a");
  rect(ctx, 0, groundY + 7, width, height - groundY - 7, "#17452c");

  for (let x = 0; x < width; x += 1) {
    const roll = rng();
    if (roll < 0.22) rect(ctx, x, groundY - 1, 1, 1, "#6fe05a");
    if (roll < 0.07) rect(ctx, x, groundY - 2, 1, 2, "#5cd24e");
    if (roll > 0.94) rect(ctx, x, groundY + 6 + Math.floor(rng() * 3), 2, 1, "#2a6b44");
  }

  return canvas;
}

export function buildForegroundGrass(createCanvas: CanvasFactory, width: number, height: number, rng: Rng) {
  const canvas = createCanvas(width, height);
  const ctx = getContext(canvas);
  const colors = ["#2c8a3a", "#3fae43", "#5cd24e"];

  for (let x = 0; x < width; x += Math.round(range(rng, 2, 4))) {
    const blade = Math.round(range(rng, 2, 5));
    rect(ctx, x, height - blade, 1, blade, colors[Math.floor(rng() * colors.length)]);
  }

  return canvas;
}

export interface BambooStalk {
  x: number;
  width: number;
  seed: number;
  sway: number;
  leaves: Array<{ y: number; side: 1 | -1; length: number }>;
}

export function createBamboo(width: number, height: number, rng: Rng): BambooStalk[] {
  const compact = width < 220;
  const specs: Array<{ x: number; width: number }> = [
    { x: 5, width: 6 },
    { x: 20, width: 3 },
    { x: width - 11, width: 5 },
    { x: width - 24, width: 3 },
  ];

  return specs.slice(0, compact ? 3 : 4).map((spec) => ({
    ...spec,
    seed: rng() * 6.28,
    sway: spec.width > 4 ? 1.6 : 2.4,
    leaves: Array.from({ length: 5 }, (_, index) => ({
      y: Math.round(range(rng, 2, height * 0.5) + index * 3),
      side: (rng() > 0.5 ? 1 : -1) as 1 | -1,
      length: Math.round(range(rng, 9, 18)),
    })),
  }));
}

export function drawBamboo(ctx: Ctx, stalks: readonly BambooStalk[], height: number, time: number) {
  for (const stalk of stalks) {
    const offsetAt = (y: number) => {
      const lean = Math.pow(Math.max(0, (height - y) / height), 1.5);
      return Math.round(Math.sin(time * 0.9 + stalk.seed + y * 0.015) * stalk.sway * lean);
    };
    const dark = stalk.width > 4 ? "#0a251b" : "#0e3024";

    for (let y = 0; y < height; y += 1) {
      const x = stalk.x + offsetAt(y);
      rect(ctx, x, y, stalk.width, 1, dark);
      rect(ctx, x, y, 1, 1, "#174836");
      if (y % 15 === 0) rect(ctx, x - 1, y, stalk.width + 2, 1, "#06180f");
    }

    ctx.fillStyle = dark;
    for (const leaf of stalk.leaves) {
      const baseX = stalk.x + offsetAt(leaf.y) + (leaf.side > 0 ? stalk.width : 0);
      for (let i = 0; i < leaf.length; i += 1) {
        const px = baseX + leaf.side * i;
        const py = leaf.y + Math.floor(i * 0.45 + i * i * 0.04);
        ctx.fillRect(px, py, 2, 1);
        if (i > leaf.length * 0.3 && i < leaf.length * 0.7) ctx.fillRect(px, py + 1, 1, 1);
      }
    }
  }
}

export interface LeafParticle {
  x: number;
  y: number;
  speed: number;
  phase: number;
  color: string;
}

const LEAF_COLORS = ["#8be06c", "#d6ea6a", "#5cc058"];

export function createLeaves(width: number, height: number, rng: Rng): LeafParticle[] {
  const count = Math.max(6, Math.round(width / 35));
  return Array.from({ length: count }, () => ({
    x: rng() * width,
    y: rng() * height,
    speed: range(rng, 6, 13),
    phase: rng() * 6.28,
    color: LEAF_COLORS[Math.floor(rng() * LEAF_COLORS.length)],
  }));
}
