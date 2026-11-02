import {
  buildClouds,
  buildForegroundGrass,
  buildGroundLayer,
  buildMountainLayer,
  buildSkyLayer,
  createBamboo,
  createLeaves,
  drawBamboo,
  type BambooStalk,
  type CanvasFactory,
  type CloudSprite,
  type LeafParticle,
} from "./background";
import { rect } from "./draw";
import { createEffect, drawEffect, type Effect } from "./effects";
import {
  NINJA_DEFS,
  RELEASE_TIME,
  drawCharge,
  drawHealthBar,
  drawNinja,
  drawShadow,
  type Ninja,
} from "./ninjas";
import { createRng, pickWeighted, range, type Rng } from "./rng";

type Ctx = CanvasRenderingContext2D;

/** Altura (em pixels da cena) da faixa de chão onde os ninjas caminham. */
export const GROUND_HEIGHT = 10;
export const LANES = 4;

const MARGIN = 14;
const GRAVITY = 260;
const JUMP_VELOCITY = 95;
const RUN_SPEED = 30;
const DASH_SPEED = 72;
const CAST_DURATION = 0.8;
const HURT_DURATION = 0.4;
const SEE_DISTANCE = 130;
const MIN_HP = 0.12;

export interface ArenaOptions {
  /** Necessário só para `render` (os testes de lógica rodam sem canvas). */
  createCanvas?: CanvasFactory;
  /** Semente da paisagem: a mesma semente gera sempre o mesmo cenário. */
  sceneSeed?: number;
  /** Aleatoriedade do comportamento dos ninjas. */
  rng?: Rng;
}

export class ArenaEngine {
  width = 0;
  height = 0;
  groundY = 0;
  time = 0;
  ninjas: Ninja[] = [];
  effects: Effect[] = [];

  private readonly createCanvas?: CanvasFactory;
  private readonly sceneSeed: number;
  private readonly rng: Rng;

  private layersDirty = true;
  private sky: HTMLCanvasElement | null = null;
  private mountains: HTMLCanvasElement | null = null;
  private ground: HTMLCanvasElement | null = null;
  private foreground: HTMLCanvasElement | null = null;
  private clouds: CloudSprite[] = [];
  private bamboo: BambooStalk[] = [];
  private leaves: LeafParticle[] = [];

  constructor(options: ArenaOptions = {}) {
    this.createCanvas = options.createCanvas;
    this.sceneSeed = options.sceneSeed ?? 20260;
    this.rng = options.rng ?? createRng(Math.floor(Math.random() * 2 ** 31));
  }

  // ---- layout ----------------------------------------------------------------

  resize(width: number, height: number) {
    this.width = Math.max(1, Math.floor(width));
    this.height = Math.max(GROUND_HEIGHT + 20, Math.floor(height));
    this.groundY = this.height - GROUND_HEIGHT;
    this.layersDirty = true;

    const desired = Math.min(NINJA_DEFS.length, Math.max(3, Math.floor(this.width / 90)));
    if (this.ninjas.length !== desired) this.spawnNinjas(desired);
    this.ninjas.forEach((ninja) => this.clampPosition(ninja));
    this.effects = [];
  }

  feetY(ninja: Ninja) {
    return this.groundY + 2 + ninja.lane * 2;
  }

  private spawnNinjas(count: number) {
    const lanes = [1, 3, 0, 2];
    const span = Math.max(1, this.width - MARGIN * 2);

    this.ninjas = Array.from({ length: count }, (_, index) => ({
      def: NINJA_DEFS[index],
      x: MARGIN + (span * (index + 0.5)) / count + range(this.rng, -8, 8),
      lane: lanes[index % lanes.length],
      dir: this.rng() > 0.5 ? 1 : -1,
      action: "idle",
      t: 0,
      dur: range(this.rng, 0.3, 1.4),
      z: 0,
      vz: 0,
      vx: 0,
      targetX: 0,
      speed: RUN_SPEED,
      phase: this.rng() * 6.28,
      hp: 1,
      flash: 0,
      cooldown: range(this.rng, 0.5, 3),
      released: false,
    }));
  }

  private clampPosition(ninja: Ninja) {
    const max = Math.max(MARGIN, this.width - MARGIN);
    ninja.x = Math.min(max, Math.max(MARGIN, ninja.x));
  }

  // ---- simulação -------------------------------------------------------------

  update(dt: number) {
    const step = Math.min(dt, 0.05);
    this.time += step;

    for (const ninja of this.ninjas) this.updateNinja(ninja, step);
    this.updateEffects(step);

    for (const leaf of this.leaves) {
      leaf.y += leaf.speed * step;
      leaf.x += Math.sin(this.time * 1.2 + leaf.phase) * 9 * step;
      if (leaf.y > this.height) {
        leaf.y = -2;
        leaf.x = this.rng() * this.width;
      }
    }
  }

  private nearestOther(ninja: Ninja): Ninja | null {
    let best: Ninja | null = null;
    for (const other of this.ninjas) {
      if (other === ninja) continue;
      if (!best || Math.abs(other.x - ninja.x) < Math.abs(best.x - ninja.x)) best = other;
    }
    return best;
  }

  private setIdle(ninja: Ninja, duration: number) {
    ninja.action = "idle";
    ninja.t = 0;
    ninja.dur = duration;
    ninja.vx = 0;
  }

  private chooseAction(ninja: Ninja) {
    const nearest = this.nearestOther(ninja);
    const distance = nearest ? Math.abs(nearest.x - ninja.x) : Infinity;
    const facing = nearest ? (nearest.x >= ninja.x ? 1 : -1) : ninja.dir;
    const canCast = ninja.cooldown <= 0 && distance < SEE_DISTANCE;

    const choice = pickWeighted<"idle" | "run" | "dash" | "approach" | "jump" | "cast">(this.rng, [
      ["idle", 22],
      ["run", 28],
      ["dash", 9],
      ["approach", nearest && distance > 50 ? 24 : 0],
      ["jump", 12],
      ["cast", canCast ? (distance < 90 ? 42 : 16) : 0],
    ]);

    ninja.t = 0;
    ninja.released = false;

    switch (choice) {
      case "cast":
        ninja.dir = facing as 1 | -1;
        ninja.action = "cast";
        ninja.dur = CAST_DURATION;
        ninja.vx = 0;
        ninja.cooldown = range(this.rng, 2.5, 4.5);
        break;
      case "approach":
        ninja.dir = facing as 1 | -1;
        ninja.targetX = (nearest?.x ?? ninja.x) - facing * 34;
        ninja.speed = this.rng() > 0.6 ? DASH_SPEED : RUN_SPEED;
        ninja.action = "run";
        ninja.dur = 4;
        break;
      case "run":
      case "dash":
        ninja.targetX = range(this.rng, MARGIN, Math.max(MARGIN + 1, this.width - MARGIN));
        ninja.speed = choice === "dash" ? DASH_SPEED : RUN_SPEED;
        ninja.dir = ninja.targetX >= ninja.x ? 1 : -1;
        ninja.action = "run";
        ninja.dur = 4;
        break;
      case "jump":
        ninja.action = "jump";
        ninja.z = 0.1;
        ninja.vz = JUMP_VELOCITY;
        ninja.vx = ninja.dir * range(this.rng, 0, 26);
        ninja.dur = 2;
        break;
      default:
        this.setIdle(ninja, range(this.rng, 0.6, 1.8));
        if (nearest && this.rng() > 0.5) ninja.dir = facing as 1 | -1;
    }
  }

  private updateNinja(ninja: Ninja, dt: number) {
    ninja.t += dt;
    ninja.cooldown = Math.max(0, ninja.cooldown - dt);
    ninja.flash = Math.max(0, ninja.flash - dt);
    ninja.hp = Math.min(1, ninja.hp + 0.04 * dt);

    switch (ninja.action) {
      case "idle":
        if (ninja.t >= ninja.dur) this.chooseAction(ninja);
        break;

      case "run": {
        const delta = ninja.targetX - ninja.x;
        const stride = ninja.speed * dt;
        ninja.phase += dt * ninja.speed * 0.5;

        if (Math.abs(delta) <= stride || ninja.t >= ninja.dur) {
          if (Math.abs(delta) <= stride) ninja.x = ninja.targetX;
          this.setIdle(ninja, range(this.rng, 0.3, 0.9));
        } else {
          ninja.dir = delta > 0 ? 1 : -1;
          ninja.x += ninja.dir * stride;
        }
        break;
      }

      case "jump":
        ninja.x += ninja.vx * dt;
        ninja.z += ninja.vz * dt;
        ninja.vz -= GRAVITY * dt;
        if (ninja.z <= 0) {
          ninja.z = 0;
          ninja.vz = 0;
          this.setIdle(ninja, range(this.rng, 0.2, 0.7));
        }
        break;

      case "cast":
        if (!ninja.released && ninja.t >= RELEASE_TIME) {
          ninja.released = true;
          this.spawnJutsu(ninja);
        }
        if (ninja.t >= ninja.dur) this.setIdle(ninja, range(this.rng, 0.4, 1));
        break;

      case "hurt":
        ninja.x += ninja.vx * dt;
        ninja.vx *= Math.exp(-dt * 8);
        if (ninja.t >= ninja.dur) this.setIdle(ninja, range(this.rng, 0.3, 0.8));
        break;
    }

    this.clampPosition(ninja);
  }

  private hurt(ninja: Ninja, fromDirection: 1 | -1) {
    if (ninja.action === "hurt") return;

    ninja.action = "hurt";
    ninja.t = 0;
    ninja.dur = HURT_DURATION;
    ninja.z = 0;
    ninja.vz = 0;
    ninja.vx = fromDirection * 42;
    ninja.flash = 0.3;
    ninja.hp = Math.max(MIN_HP, ninja.hp - 0.2);

    this.effects.push(
      createEffect({
        kind: "burst",
        x: ninja.x,
        laneY: this.feetY(ninja),
        height: 15,
        dir: fromDirection,
        life: 0.3,
        color: "#ffd23a",
      })
    );
  }

  private spawnJutsu(caster: Ninja) {
    const laneY = this.feetY(caster);
    const handX = caster.x + caster.dir * 10;
    const maxX = Math.max(MARGIN, this.width - MARGIN);

    switch (caster.def.element) {
      case "fire":
        this.effects.push(
          createEffect({ kind: "fire", x: handX, laneY, height: 15, dir: caster.dir, vx: caster.dir * 85, life: 1.6, owner: caster })
        );
        break;

      case "aqua":
        this.effects.push(
          createEffect({ kind: "slash", x: handX, laneY, height: 15, dir: caster.dir, vx: caster.dir * 140, life: 1.1, owner: caster })
        );
        break;

      case "earth": {
        const wallX = Math.min(maxX, Math.max(MARGIN, caster.x + caster.dir * 28));
        const victim = this.ninjas.find((other) => other !== caster && Math.abs(other.x - wallX) < 14 && Math.abs(other.lane - caster.lane) <= 1) ?? null;
        this.effects.push(
          createEffect({ kind: "wall", x: wallX, laneY, dir: caster.dir, life: 1.3, owner: caster, target: victim, hitAt: 0.15 })
        );
        break;
      }

      case "lightning": {
        let target: Ninja | null = null;
        for (const other of this.ninjas) {
          const dx = (other.x - caster.x) * caster.dir;
          if (other === caster || dx <= 0 || dx > 90) continue;
          if (!target || dx < (target.x - caster.x) * caster.dir) target = other;
        }
        const endX = target ? target.x : Math.min(maxX, Math.max(MARGIN, caster.x + caster.dir * 72));
        this.effects.push(
          createEffect({ kind: "bolt", x: handX, laneY, height: 14, dir: caster.dir, life: 0.35, owner: caster, target, endX, hitAt: 0.1 })
        );
        break;
      }
    }
  }

  private updateEffects(dt: number) {
    for (const effect of this.effects) {
      effect.age += dt;
      effect.x += effect.vx * dt;

      if ((effect.kind === "fire" || effect.kind === "slash") && effect.age < effect.life) {
        const victim = this.ninjas.find(
          (ninja) =>
            ninja !== effect.owner &&
            ninja.action !== "hurt" &&
            Math.abs(ninja.x - effect.x) <= 7 &&
            Math.abs(this.feetY(ninja) - effect.laneY) <= 5
        );
        if (victim) {
          this.hurt(victim, effect.dir);
          effect.age = effect.life;
        }
      }

      if (effect.target && !effect.hitDone && effect.age >= effect.hitAt) {
        effect.hitDone = true;
        this.hurt(effect.target, effect.dir);
      }
    }

    this.effects = this.effects.filter((effect) => effect.age < effect.life && effect.x > -30 && effect.x < this.width + 30);
  }

  // ---- renderização ----------------------------------------------------------

  private ensureLayers() {
    if (!this.layersDirty) return;
    if (!this.createCanvas) throw new Error("ArenaEngine.render precisa de createCanvas");

    const scene = createRng(this.sceneSeed);
    const { width, height, groundY } = this;

    this.sky = buildSkyLayer(this.createCanvas, width, height, groundY);
    this.clouds = buildClouds(this.createCanvas, scene, groundY);
    this.mountains = buildMountainLayer(this.createCanvas, width, height, groundY, scene);
    this.ground = buildGroundLayer(this.createCanvas, width, height, groundY, scene);
    this.foreground = buildForegroundGrass(this.createCanvas, width, height, scene);
    this.bamboo = createBamboo(width, height, scene);
    this.leaves = createLeaves(width, height, scene);
    this.layersDirty = false;
  }

  render(ctx: Ctx) {
    this.ensureLayers();
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, this.width, this.height);

    if (this.sky) ctx.drawImage(this.sky, 0, 0);

    for (const cloud of this.clouds) {
      const span = this.width + cloud.canvas.width;
      const x = ((cloud.offset + this.time * cloud.speed) % span) - cloud.canvas.width;
      ctx.drawImage(cloud.canvas, Math.round(x), cloud.y);
    }

    if (this.mountains) ctx.drawImage(this.mountains, 0, 0);
    if (this.ground) ctx.drawImage(this.ground, 0, 0);

    // Muralhas de terra ficam atrás dos personagens.
    this.effects.filter((effect) => effect.kind === "wall").forEach((effect) => drawEffect(ctx, effect));

    const ordered = [...this.ninjas].sort((a, b) => a.lane - b.lane || a.x - b.x);
    ordered.forEach((ninja) => drawShadow(ctx, ninja, this.feetY(ninja)));
    ordered.forEach((ninja) => {
      const feetY = this.feetY(ninja);
      drawNinja(ctx, ninja, feetY, this.time);
      if (ninja.action === "cast" && !ninja.released) drawCharge(ctx, ninja, feetY);
    });

    this.effects.filter((effect) => effect.kind !== "wall").forEach((effect) => drawEffect(ctx, effect));
    ordered.forEach((ninja) => drawHealthBar(ctx, ninja, this.feetY(ninja)));

    for (const leaf of this.leaves) {
      const wide = Math.floor(this.time * 3 + leaf.phase) % 2 === 0 ? 2 : 1;
      rect(ctx, Math.round(leaf.x), Math.round(leaf.y), wide, 1, leaf.color);
      rect(ctx, Math.round(leaf.x), Math.round(leaf.y) + 1, 1, 1, leaf.color);
    }

    if (this.foreground) ctx.drawImage(this.foreground, 0, 0);
    drawBamboo(ctx, this.bamboo, this.height, this.time);
  }
}
