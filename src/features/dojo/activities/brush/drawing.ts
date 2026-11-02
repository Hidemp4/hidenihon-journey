import { STROKE_ANIMATION } from "./constants";
import { distance, type Point } from "./strokePath";

/** Posição do ponteiro em unidades do quadro (0–`viewBox`). `null` se o elemento ainda não tem tamanho. */
export function clientToModel(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  viewBox: number
): Point | null {
  if (rect.width <= 0 || rect.height <= 0) return null;
  const clamp = (value: number) => Math.min(viewBox, Math.max(0, value));
  return { x: clamp(((clientX - rect.left) / rect.width) * viewBox), y: clamp(((clientY - rect.top) / rect.height) * viewBox) };
}

/** Acrescenta o ponto se ele se afastou o bastante do último (filtra a tremida da mão). */
export function appendPoint(points: Point[], point: Point, minDistance: number): boolean {
  const last = points[points.length - 1];
  if (last && distance(last, point) < minDistance) return false;
  points.push(point);
  return true;
}

export type SmoothCommand =
  | { type: "move"; to: Point }
  | { type: "line"; to: Point }
  | { type: "quad"; control: Point; to: Point }
  /** Um ponto só: um pingo redondo. */
  | { type: "dot"; at: Point };

/**
 * Suavização do traço: curvas quadráticas passando pelos pontos médios (cada ponto capturado vira
 * controle). Tira o serrilhado do toque sem atrasar a tinta em relação ao dedo.
 */
export function smoothStrokeCommands(points: readonly Point[]): SmoothCommand[] {
  if (points.length === 0) return [];
  if (points.length === 1) return [{ type: "dot", at: points[0] }];
  if (points.length === 2) return [{ type: "move", to: points[0] }, { type: "line", to: points[1] }];

  const commands: SmoothCommand[] = [{ type: "move", to: points[0] }];
  for (let index = 1; index < points.length - 1; index += 1) {
    const next = points[index + 1];
    const middle = { x: (points[index].x + next.x) / 2, y: (points[index].y + next.y) / 2 };
    commands.push({ type: "quad", control: points[index], to: middle });
  }
  commands.push({ type: "line", to: points[points.length - 1] });
  return commands;
}

export interface StrokeTiming {
  delayMs: number;
  durationMs: number;
}

/** Quando cada traço começa e quanto dura na animação da ordem (proporcional ao comprimento). */
export function strokeTimeline(lengths: readonly number[], options: typeof STROKE_ANIMATION = STROKE_ANIMATION): StrokeTiming[] {
  let cursor = 0;
  return lengths.map((length) => {
    const durationMs = Math.max(options.minMs, Math.round((length / options.unitsPerSecond) * 1000));
    const timing = { delayMs: cursor, durationMs };
    cursor += durationMs + options.gapMs;
    return timing;
  });
}

export function timelineEnd(timeline: readonly StrokeTiming[]): number {
  const last = timeline[timeline.length - 1];
  return last ? last.delayMs + last.durationMs : 0;
}
