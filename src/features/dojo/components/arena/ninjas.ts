import { drawLine, fillCircle, rect } from "./draw";

type Ctx = CanvasRenderingContext2D;

export type Element = "fire" | "aqua" | "earth" | "lightning";
export type HairStyle = "spiky" | "long" | "short" | "bun";
export type Action = "idle" | "run" | "jump" | "cast" | "hurt";

/** Personagens originais: nada de IP de terceiros, fácil de trocar por sprites seus depois. */
export interface NinjaDef {
  name: string;
  element: Element;
  hairStyle: HairStyle;
  skin: string;
  hair: string;
  outfit: string;
  outfitDark: string;
  accent: string;
  shoe: string;
  band: string;
  plate: string;
}

export const NINJA_DEFS: readonly NinjaDef[] = [
  {
    name: "Kaito",
    element: "fire",
    hairStyle: "long",
    skin: "#f0c8a0",
    hair: "#241c2e",
    outfit: "#26335a",
    outfitDark: "#1a2442",
    accent: "#d8402e",
    shoe: "#15192e",
    band: "#2c3250",
    plate: "#cfd8e2",
  },
  {
    name: "Rina",
    element: "aqua",
    hairStyle: "spiky",
    skin: "#f4d2b4",
    hair: "#3f9ee0",
    outfit: "#e9f3f6",
    outfitDark: "#bcd6de",
    accent: "#24a39c",
    shoe: "#2b6f86",
    band: "#1f6a8c",
    plate: "#e8f4fa",
  },
  {
    name: "Garu",
    element: "earth",
    hairStyle: "short",
    skin: "#e6b68c",
    hair: "#b13a28",
    outfit: "#a07a42",
    outfitDark: "#7a5a2e",
    accent: "#5a3a1a",
    shoe: "#3a2814",
    band: "#7a5a2e",
    plate: "#d8c090",
  },
  {
    name: "Hana",
    element: "lightning",
    hairStyle: "bun",
    skin: "#f2cca8",
    hair: "#7a4ca8",
    outfit: "#3c8c4c",
    outfitDark: "#2a6a38",
    accent: "#f0e060",
    shoe: "#1e4a2a",
    band: "#2a6a38",
    plate: "#f0e8a0",
  },
];

export interface Ninja {
  def: NinjaDef;
  x: number;
  lane: number;
  dir: 1 | -1;
  action: Action;
  t: number;
  dur: number;
  z: number;
  vz: number;
  vx: number;
  targetX: number;
  speed: number;
  phase: number;
  hp: number;
  flash: number;
  cooldown: number;
  released: boolean;
}

interface Pose {
  bodyDy: number;
  headDx: number;
  frontArm: [number, number];
  backArm: [number, number];
  frontFoot: [number, number];
  backFoot: [number, number];
}

export const RELEASE_TIME = 0.38;

function computePose(n: Ninja, time: number): Pose {
  switch (n.action) {
    case "run": {
      const s = Math.sin(n.phase);
      const c = Math.cos(n.phase);
      return {
        bodyDy: -Math.round(Math.abs(c)),
        headDx: 1,
        frontArm: [2 - Math.round(s * 5), -11 + Math.round(Math.abs(s))],
        backArm: [-3 + Math.round(s * 5), -11 + Math.round(Math.abs(s))],
        frontFoot: [1 + Math.round(s * 5), -Math.round(Math.max(0, c) * 3)],
        backFoot: [-2 - Math.round(s * 5), -Math.round(Math.max(0, -c) * 3)],
      };
    }
    case "jump":
      return {
        bodyDy: 0,
        headDx: 1,
        frontArm: [7, -21],
        backArm: [-7, -20],
        frontFoot: [5, -3],
        backFoot: [-2, -1],
      };
    case "cast": {
      const charging = !n.released;
      const raised = n.def.element === "lightning";
      return {
        bodyDy: charging ? 1 : 0,
        headDx: charging ? 0 : 1,
        frontArm: charging ? [5, -14] : raised ? [8, -24] : [12, -16],
        backArm: charging ? [4, -14] : [-5, -12],
        frontFoot: [5, 0],
        backFoot: [-4, 0],
      };
    }
    case "hurt":
      return {
        bodyDy: 0,
        headDx: -2,
        frontArm: [-2, -19],
        backArm: [-8, -14],
        frontFoot: [2, 0],
        backFoot: [-5, 0],
      };
    default: {
      const breathe = Math.floor(time * 2.2 + n.phase) % 2 === 0 ? 0 : 1;
      return {
        bodyDy: breathe,
        headDx: 0,
        frontArm: [4, -9 + breathe],
        backArm: [-5, -9 + breathe],
        frontFoot: [3, 0],
        backFoot: [-3, 0],
      };
    }
  }
}

function drawHair(ctx: Ctx, def: NinjaDef, c: (color: string) => string, dx: number, dy: number, wave: number) {
  const hair = c(def.hair);
  const top = -27 + dy;

  rect(ctx, -5 + dx, top, 10, 3, hair);
  rect(ctx, -5 + dx, top + 3, 2, 4, hair);

  if (def.hairStyle === "spiky") {
    rect(ctx, -5 + dx, top - 2, 2, 2, hair);
    rect(ctx, -1 + dx, top - 3, 2, 3, hair);
    rect(ctx, 3 + dx, top - 2, 2, 2, hair);
    rect(ctx, 4 + dx, top, 2, 2, hair);
  } else if (def.hairStyle === "long") {
    rect(ctx, -8 + dx, top + 2 + wave, 3, 9, hair);
    rect(ctx, -6 + dx, top + 4, 2, 6, hair);
  } else if (def.hairStyle === "bun") {
    rect(ctx, -2 + dx, top - 3, 4, 3, hair);
    rect(ctx, -1 + dx, top - 4, 2, 1, hair);
  } else {
    rect(ctx, 3 + dx, top + 3, 2, 2, hair);
  }
}

export function drawNinja(ctx: Ctx, n: Ninja, feetY: number, time: number) {
  const { def } = n;
  const flashing = n.flash > 0 && Math.floor(time * 20) % 2 === 0;
  const c = (color: string) => (flashing ? "#ffffff" : color);
  const pose = computePose(n, time);
  const wave = Math.round(Math.sin(time * 9 + n.phase * 2));
  const dy = pose.bodyDy;
  const hx = pose.headDx;

  ctx.save();
  ctx.translate(Math.round(n.x), Math.round(feetY - n.z));
  ctx.scale(n.dir, 1);

  // Cachecol/faixa balançando atrás.
  const trail = n.action === "run" ? 6 : 3;
  rect(ctx, -4 - trail, -18 + dy + wave, trail, 2, c(def.accent));
  rect(ctx, -4 - trail + 1, -16 + dy + wave, Math.max(1, trail - 2), 1, c(def.accent));

  // Braço de trás.
  drawLine(ctx, -3, -16 + dy, pose.backArm[0], pose.backArm[1], 3, c(def.outfitDark));
  rect(ctx, pose.backArm[0] - 1, pose.backArm[1] - 1, 2, 2, c(def.skin));

  // Pernas.
  const hipY = -8 + dy;
  drawLine(ctx, -2, hipY, -2 + pose.backFoot[0], pose.backFoot[1] - 2, 3, c(def.outfitDark));
  rect(ctx, -3 + pose.backFoot[0], pose.backFoot[1] - 2, 5, 2, c(def.shoe));
  drawLine(ctx, 1, hipY, 1 + pose.frontFoot[0], pose.frontFoot[1] - 2, 3, c(def.outfit));
  rect(ctx, pose.frontFoot[0], pose.frontFoot[1] - 2, 5, 2, c(def.shoe));

  // Tronco, cinto e gola.
  rect(ctx, -4, -17 + dy, 8, 9, c(def.outfit));
  rect(ctx, 3, -17 + dy, 1, 9, c(def.outfitDark));
  rect(ctx, -4, -10 + dy, 8, 2, c(def.accent));
  rect(ctx, -4, -18 + dy, 8, 2, c(def.accent));

  // Cabeça.
  rect(ctx, -4 + hx, -26 + dy, 8, 8, c(def.skin));
  rect(ctx, 0 + hx, -23 + dy, 1, 2, c("#1a1a2a"));
  rect(ctx, 2 + hx, -23 + dy, 1, 2, c("#1a1a2a"));
  drawHair(ctx, def, c, hx, dy, wave);

  // Protetor de testa.
  rect(ctx, -4 + hx, -25 + dy, 8, 2, c(def.band));
  rect(ctx, -1 + hx, -25 + dy, 4, 2, c(def.plate));
  rect(ctx, -7 + hx, -25 + dy + (wave > 0 ? 1 : 0), 3, 1, c(def.band));
  rect(ctx, -8 + hx, -24 + dy + (wave > 0 ? 0 : 1), 3, 1, c(def.band));

  // Braço da frente.
  drawLine(ctx, 2, -16 + dy, pose.frontArm[0], pose.frontArm[1], 3, c(def.outfit));
  rect(ctx, pose.frontArm[0] - 1, pose.frontArm[1] - 1, 2, 2, c(def.skin));

  ctx.restore();
}

export function drawShadow(ctx: Ctx, n: Ninja, feetY: number) {
  const width = Math.max(6, 12 - Math.floor(n.z / 4) * 2);
  ctx.globalAlpha = 0.28;
  rect(ctx, Math.round(n.x) - (width >> 1), feetY - 1, width, 2, "#000000");
  ctx.globalAlpha = 1;
}

export function drawHealthBar(ctx: Ctx, n: Ninja, feetY: number) {
  const x = Math.round(n.x) - 8;
  const y = feetY - 36;
  const fill = n.hp > 0.55 ? "#4cd24a" : n.hp > 0.3 ? "#e8b03a" : "#e04a3a";

  rect(ctx, x, y, 16, 4, "#0b0f0c");
  rect(ctx, x + 1, y + 1, 14, 2, "#243026");
  rect(ctx, x + 1, y + 1, Math.max(1, Math.round(14 * n.hp)), 2, fill);
  rect(ctx, x + 1, y + 1, Math.max(1, Math.round(14 * n.hp)), 1, "#ffffff55");
}

export function drawCharge(ctx: Ctx, n: Ninja, feetY: number) {
  const progress = Math.min(1, n.t / RELEASE_TIME);
  const radius = 1 + Math.round(progress * 3);
  const colors: Record<Element, string> = { fire: "#ff9a2e", aqua: "#6fdcff", earth: "#d8b878", lightning: "#fff06a" };
  fillCircle(ctx, Math.round(n.x) + n.dir * 6, feetY - 14, radius, colors[n.def.element]);
}
