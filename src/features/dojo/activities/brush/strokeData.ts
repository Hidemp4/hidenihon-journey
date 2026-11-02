import type { StudyContent } from "@/features/dojo/shared/content";
import { isFiniteNumber, isRecord } from "@/features/dojo/shared/storage";
import { KANJIVG_VIEWBOX } from "./kanjivg";
import { parsePathData, polylineLength, samplePath, type Point } from "./strokePath";

/** Passo da amostragem do modelo (unidades): fino o bastante para o bitmap de 64 e para a conferência. */
const MODEL_SAMPLE_STEP = 0.5;

export interface ModelStroke {
  /** `d` normalizado (para desenhar no SVG). */
  d: string;
  points: Point[];
  length: number;
}

export interface GlyphModel {
  char: string;
  strokes: ModelStroke[];
  numbers: Array<[number, number]>;
}

export interface StrokeSet {
  /** Tag do KanjiVG de onde os dados saíram. */
  ref: string;
  glyphs: ReadonlyMap<string, GlyphModel>;
}

export function buildGlyphModel(char: string, strokes: readonly string[], numbers: ReadonlyArray<readonly [number, number]>): GlyphModel | null {
  const models: ModelStroke[] = [];
  for (const d of strokes) {
    const segments = parsePathData(d);
    if (!segments) return null;
    const points = samplePath(segments, MODEL_SAMPLE_STEP);
    models.push({ d, points, length: polylineLength(points) });
  }
  if (models.length === 0) return null;

  return {
    char,
    strokes: models,
    numbers: models.map((stroke, index) => {
      const label = numbers[index];
      if (label && isFiniteNumber(label[0]) && isFiniteNumber(label[1])) return [label[0], label[1]];
      const start = stroke.points[0];
      return [start.x - 4, start.y - 2];
    }),
  };
}

function isNumberPair(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length === 2 && value.every(isFiniteNumber);
}

/**
 * Valida o JSON gerado pelo script (é arquivo do repositório, mas pode ter sido editado à mão ou
 * gerado por uma versão antiga). Glifo inválido fica de fora; o resto continua utilizável.
 */
export function sanitizeStrokeSet(raw: unknown): StrokeSet | null {
  if (!isRecord(raw) || raw.version !== 1 || raw.viewBox !== KANJIVG_VIEWBOX || !isRecord(raw.chars)) return null;

  const glyphs = new Map<string, GlyphModel>();
  for (const [char, entry] of Object.entries(raw.chars)) {
    if (!isRecord(entry) || !Array.isArray(entry.s) || !entry.s.every((stroke): stroke is string => typeof stroke === "string")) continue;
    const numbers = Array.isArray(entry.n) ? entry.n.map((pair) => (isNumberPair(pair) ? pair : ([Number.NaN, Number.NaN] as [number, number]))) : [];
    const glyph = buildGlyphModel(char, entry.s, numbers);
    if (glyph) glyphs.set(char, glyph);
  }

  return glyphs.size > 0 ? { ref: typeof raw.ref === "string" ? raw.ref : "", glyphs } : null;
}

/** Um chunk por conteúdo: quem treina kana não baixa os 62 KB dos kanji. */
const LOADERS: Readonly<Record<StudyContent, () => Promise<{ default: unknown }>>> = {
  kana: () => import("./data/kanaStrokes.json"),
  kanji: () => import("./data/kanjiStrokes.json"),
};

const pending = new Map<StudyContent, Promise<StrokeSet>>();

/**
 * Traços baixados só quando o Pincel precisa deles. A promessa fica em cache por conteúdo; se falhar
 * (sem rede no meio de um deploy, por exemplo), o cache é limpo para dar para tentar de novo.
 */
export function loadStrokeSet(content: StudyContent): Promise<StrokeSet> {
  const cached = pending.get(content);
  if (cached) return cached;

  const promise = LOADERS[content]()
    .then((module) => {
      const set = sanitizeStrokeSet(module.default);
      if (!set) throw new Error("Dados de traços inválidos");
      return set;
    })
    .catch((error: unknown) => {
      pending.delete(content);
      throw error;
    });
  pending.set(content, promise);
  return promise;
}

export function loadKanaStrokes(): Promise<StrokeSet> {
  return loadStrokeSet("kana");
}
