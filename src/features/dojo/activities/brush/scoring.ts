import {
  FIT_SCALE_LIMITS,
  MAX_STROKE_COUNT_PENALTY,
  RESAMPLE_POINTS,
  SAMPLE_SPACING,
  SCORE_ALMOST,
  SCORE_GOOD,
  STROKE_COUNT_PENALTY,
  ZERO_SCORE_ERROR,
} from "./constants";
import type { GlyphModel } from "./strokeData";
import { distance, polylineLength, resample, type Point } from "./strokePath";
import type { SelfGrade } from "./types";

/*
 * A nota mede o quanto o desenho se afasta do modelo, em unidades do quadro de 109 do KanjiVG,
 * sem folga: qualquer desvio desconta. Só o desenho idêntico ao modelo tira 100.
 */

/** Abaixo disso é erro de arredondamento do ponto flutuante, não do desenho. */
const EXACT_EPSILON = 1e-6;

function distanceToSegment(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

/** Pedaço de traço com a caixa em volta: pedaço cuja caixa já está mais longe que o melhor achado nem é olhado. */
interface BoxedPolyline {
  points: readonly Point[];
  box: Box;
}

/** Segmentos por pedaço: pedaços curtos têm caixas justas e descartam mais (≈4× mais rápido nos kanji grandes). */
const CHUNK_SEGMENTS = 8;

function boxed(polylines: ReadonlyArray<readonly Point[]>): BoxedPolyline[] {
  return polylines.flatMap((polyline) => {
    const chunks: Point[][] = [];
    // Pedaços vizinhos dividem o ponto da emenda: nenhum segmento fica de fora.
    for (let start = 0; start === 0 || start < polyline.length - 1; start += CHUNK_SEGMENTS) chunks.push(polyline.slice(start, start + CHUNK_SEGMENTS + 1));
    return chunks.flatMap((points) => {
      const box = boundingBox([points]);
      return box ? [{ points, box }] : [];
    });
  });
}

function distanceToBox(point: Point, box: Box): number {
  return Math.hypot(Math.max(box.minX - point.x, 0, point.x - box.maxX), Math.max(box.minY - point.y, 0, point.y - box.maxY));
}

/** Menor distância de um ponto até qualquer um dos traços (um traço de um ponto só é um pontinho). */
function distanceToPolylines(point: Point, polylines: readonly BoxedPolyline[]): number {
  let best = Number.POSITIVE_INFINITY;
  for (const { points, box } of polylines) {
    if (distanceToBox(point, box) >= best) continue;
    if (points.length === 1) best = Math.min(best, distance(point, points[0]));
    for (let index = 1; index < points.length; index += 1) best = Math.min(best, distanceToSegment(point, points[index - 1], points[index]));
  }
  return best;
}

/** Pontos ao longo dos traços, a cada `SAMPLE_SPACING` unidades: traço comprido pesa mais que traço curto. */
export function samplePolylines(polylines: ReadonlyArray<readonly Point[]>): Point[] {
  return polylines.flatMap((polyline) => {
    if (polyline.length <= 1) return [...polyline];
    return resample(polyline, Math.max(2, Math.ceil(polylineLength(polyline) / SAMPLE_SPACING) + 1));
  });
}

/** Média quadrática: um pedaço muito fora pesa mais que vários pedaços um pouco fora. */
function rms(values: readonly number[]): number {
  if (values.length === 0) return Number.POSITIVE_INFINITY;
  return Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length);
}

/** Traço contra traço, ponto a ponto ao longo do comprimento: pega direção, início, fim e proporção. */
export function pairedStrokeError(drawn: readonly Point[], model: readonly Point[]): number {
  const left = resample(drawn, RESAMPLE_POINTS);
  const right = resample(model, RESAMPLE_POINTS);
  return rms(left.map((point, index) => distance(point, right[index])));
}

interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function boundingBox(polylines: ReadonlyArray<readonly Point[]>): Box | null {
  const points = polylines.flat();
  if (points.length === 0) return null;
  return {
    minX: Math.min(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxX: Math.max(...points.map((point) => point.x)),
    maxY: Math.max(...points.map((point) => point.y)),
  };
}

/**
 * De memória não há guia: a pessoa pode desenhar menor ou fora do centro. Encaixa o desenho no
 * centro e no tamanho do modelo (escala uniforme, limitada para um traço solto não virar o kana todo).
 */
export function fitToModel(drawn: ReadonlyArray<readonly Point[]>, model: ReadonlyArray<readonly Point[]>): Point[][] {
  const from = boundingBox(drawn);
  const to = boundingBox(model);
  if (!from || !to) return drawn.map((stroke) => [...stroke]);

  const fromSize = Math.max(from.maxX - from.minX, from.maxY - from.minY);
  const toSize = Math.max(to.maxX - to.minX, to.maxY - to.minY);
  const scale = fromSize === 0 ? 1 : Math.min(FIT_SCALE_LIMITS.max, Math.max(FIT_SCALE_LIMITS.min, toSize / fromSize));
  const fromCenter = { x: (from.minX + from.maxX) / 2, y: (from.minY + from.maxY) / 2 };
  const toCenter = { x: (to.minX + to.maxX) / 2, y: (to.minY + to.maxY) / 2 };

  return drawn.map((stroke) =>
    stroke.map((point) => ({ x: toCenter.x + (point.x - fromCenter.x) * scale, y: toCenter.y + (point.y - fromCenter.y) * scale }))
  );
}

export interface DrawingScore {
  /** 0–100, já com o desconto do número de traços. 100 só com erro zero (desenho idêntico). */
  score: number;
  /** Erro final em unidades (média das medidas abaixo); 0 = idêntico ao modelo. */
  error: number;
  /** Faltou pedaço? Distância (média quadrática) de cada ponto do modelo até a tinta mais próxima. */
  coverage: number;
  /** Sobrou ou saiu do lugar? Distância de cada ponto da tinta até o modelo. */
  precision: number;
  /** Traço i contra traço i do modelo (ordem, direção, começo e fim). `null` se o número de traços difere. */
  strokeError: number | null;
  strokeCount: number;
  expectedStrokes: number;
}

const modelSamples = new WeakMap<GlyphModel, Point[]>();

function samplesOf(glyph: GlyphModel): Point[] {
  let samples = modelSamples.get(glyph);
  if (!samples) {
    samples = samplePolylines(glyph.strokes.map((stroke) => stroke.points));
    modelSamples.set(glyph, samples);
  }
  return samples;
}

/** Erro (unidades) → 0–100. Linear e arredondado para baixo: 99,9 vira 99, nunca 100. */
export function scoreFromError(error: number): number {
  if (!(error >= 0)) return 0;
  return Math.max(0, Math.floor(100 * (1 - error / ZERO_SCORE_ERROR)));
}

/**
 * Nota do desenho contra o modelo. `fit`: encaixar antes (De memória: só tamanho e posição saem
 * da conta); no Traçar a posição já vem do guia e conta também.
 *
 * Erro = média de cobertura, precisão e traço a traço (este só se o número de traços bate).
 * Cada unidade de erro médio tira 100/ZERO_SCORE_ERROR pontos, e cada traço a mais ou a menos tira
 * STROKE_COUNT_PENALTY.
 */
export function scoreDrawing(glyph: GlyphModel, strokes: ReadonlyArray<readonly Point[]>, { fit }: { fit: boolean }): DrawingScore {
  const model = glyph.strokes.map((stroke) => stroke.points);
  const base = { strokeCount: strokes.length, expectedStrokes: model.length };
  const ink = strokes.filter((stroke) => stroke.length > 0);
  if (ink.length === 0 || model.length === 0) {
    return { ...base, score: 0, error: ZERO_SCORE_ERROR, coverage: ZERO_SCORE_ERROR, precision: ZERO_SCORE_ERROR, strokeError: null };
  }

  const drawn = fit ? fitToModel(ink, model) : ink;
  const drawnBoxes = boxed(drawn);
  const modelBoxes = boxed(model);
  const coverage = rms(samplesOf(glyph).map((point) => distanceToPolylines(point, drawnBoxes)));
  const precision = rms(samplePolylines(drawn).map((point) => distanceToPolylines(point, modelBoxes)));
  const strokeError =
    drawn.length === model.length ? drawn.reduce((sum, stroke, index) => sum + pairedStrokeError(stroke, model[index]), 0) / model.length : null;

  const parts = strokeError == null ? [coverage, precision] : [coverage, precision, strokeError];
  const raw = parts.reduce((sum, value) => sum + value, 0) / parts.length;
  const error = raw < EXACT_EPSILON ? 0 : raw;
  const penalty = Math.min(MAX_STROKE_COUNT_PENALTY, Math.abs(strokes.length - model.length) * STROKE_COUNT_PENALTY);

  return { ...base, score: Math.max(0, scoreFromError(error) - penalty), error, coverage, precision, strokeError };
}

/** Sugestão para a autoavaliação. Número de traços errado nunca sugere "Acertei". */
export function suggestGrade(score: DrawingScore): SelfGrade {
  if (score.score >= SCORE_GOOD && score.strokeCount === score.expectedStrokes) return "good";
  return score.score >= SCORE_ALMOST ? "almost" : "again";
}
