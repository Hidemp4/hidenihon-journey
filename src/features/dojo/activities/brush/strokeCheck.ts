import { DIRECTION_MIN_LENGTH, MIN_STROKE_LENGTH, RESAMPLE_POINTS, STROKE_MATCH_MAX_DISTANCE } from "./constants";
import type { ModelStroke } from "./strokeData";
import { distance, polylineLength, resample, type Point } from "./strokePath";

export type StrokeVerdict =
  | { kind: "ok" }
  /** Um toque, não um traço: não conta como tentativa. */
  | { kind: "too-short" }
  | { kind: "reversed" }
  /** Parece outro traço do kana (`matched`, base 0): ordem errada (ou traço já feito). */
  | { kind: "wrong-order"; matched: number }
  | { kind: "shape" };

/** Distância média entre dois traços, ponto a ponto, depois de reamostrar os dois pelo comprimento. */
export function strokeDistance(a: readonly Point[], b: readonly Point[]): number {
  const left = resample(a, RESAMPLE_POINTS);
  const right = resample(b, RESAMPLE_POINTS);
  if (left.length === 0 || right.length === 0) return Number.POSITIVE_INFINITY;
  let total = 0;
  for (let index = 0; index < left.length; index += 1) total += distance(left[index], right[index]);
  return total / left.length;
}

/**
 * Confere o traço desenhado contra o traço `expected` do modelo (ordem e direção aproximadas).
 * O traço do modelo mais parecido vence: nos kanji há traços paralelos a poucas unidades um do
 * outro, e aceitar qualquer coisa "perto o bastante" do esperado deixaria passar a ordem errada.
 * A posição conta: no modo Traçar o guia está à mostra, então o traço certo passa por cima dele.
 */
export function checkStroke(drawn: readonly Point[], model: readonly ModelStroke[], expected: number): StrokeVerdict {
  const target = model[expected];
  if (!target || polylineLength(drawn) < MIN_STROKE_LENGTH) return { kind: "too-short" };

  const reversed = [...drawn].reverse();
  let bestIndex = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  let forward = Number.POSITIVE_INFINITY;
  let backward = Number.POSITIVE_INFINITY;

  for (let index = 0; index < model.length; index += 1) {
    const there = strokeDistance(drawn, model[index].points);
    const back = strokeDistance(reversed, model[index].points);
    if (index === expected) {
      forward = there;
      backward = back;
    }
    // Empate favorece o esperado (traços repetidos idênticos no modelo).
    const value = Math.min(there, back);
    if (value < bestDistance || (value === bestDistance && index === expected)) {
      bestIndex = index;
      bestDistance = value;
    }
  }

  if (bestDistance > STROKE_MATCH_MAX_DISTANCE) return { kind: "shape" };
  if (bestIndex !== expected) return { kind: "wrong-order", matched: bestIndex };
  // Pontinhos não têm direção que dê para conferir.
  if (target.length < DIRECTION_MIN_LENGTH || forward <= backward) return { kind: "ok" };
  return { kind: "reversed" };
}
