import { getKanaStudyItems } from "@/features/dojo/shared/studyItem";
import { brushReducer, createBrushState, type BrushAction, type BrushState } from "./brushReducer";
import { buildGlyphModel, type GlyphModel } from "./strokeData";
import type { Point } from "./strokePath";
import type { BrushCard, BrushMode, BrushSession } from "./types";

export const HIRAGANA = getKanaStudyItems("hiragana");

export function line(x0: number, y0: number, x1: number, y1: number, steps = 20): Point[] {
  return Array.from({ length: steps + 1 }, (_, index) => ({ x: x0 + ((x1 - x0) * index) / steps, y: y0 + ((y1 - y0) * index) / steps }));
}

/** "ニ" sintético (dois traços horizontais): traços previsíveis para testar o fluxo sem depender do KanjiVG. */
export const TOP = line(20, 35, 89, 35);
export const BOTTOM = line(10, 80, 99, 80);

export function syntheticGlyph(char: string): GlyphModel {
  const glyph = buildGlyphModel(char, ["M20,35L89,35", "M10,80L99,80"], []);
  if (!glyph) throw new Error("glifo de teste inválido");
  return glyph;
}

export function testCards(count = 3, sessionId = "s1"): BrushCard[] {
  return HIRAGANA.slice(0, count).map((item, index) => ({ key: `${sessionId}:${index}`, item, glyph: syntheticGlyph(item.char) }));
}

export function run(state: BrushState, ...actions: BrushAction[]) {
  return actions.reduce(brushReducer, state);
}

export function startBrush(mode: BrushMode, count = 3) {
  return run(createBrushState(), { type: "UPDATE_SETTINGS", patch: { mode } }, { type: "START", id: "s1", cards: testCards(count) });
}

export function sessionOf(state: BrushState): BrushSession {
  if (state.game.screen === "lobby") throw new Error("esperava sessão, veio o lobby");
  return state.game.session;
}

export function keyOf(state: BrushState): string {
  const session = sessionOf(state);
  const card = session.cards[session.index];
  if (!card) throw new Error("sem carta atual");
  return card.key;
}

/** Desenha os traços na carta atual. */
export function draw(state: BrushState, ...strokes: Point[][]) {
  return strokes.reduce((current, points) => run(current, { type: "STROKE", cardKey: keyOf(current), points }), state);
}
