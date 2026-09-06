import allHiragana from "kana-svg-data/dist/allHiragana.json";
import allKatakana from "kana-svg-data/dist/allKatakana.json";

export interface KanaStroke {
  id: string;
  value: string;
}

export interface KanaMedian {
  id: string;
  value: number[][];
}

export interface KanaStrokeEntry {
  charCode: number;
  strokes: KanaStroke[];
  medians: KanaMedian[];
}

const kanaEntries = [...(allHiragana as KanaStrokeEntry[]), ...(allKatakana as KanaStrokeEntry[])];

const HIRAGANA_SA_CHAR_CODE = "さ".charCodeAt(0);
const SA_EMBEDDED_THIRD_STROKE_START = "ZM311 708";

export const kanaStrokeEntriesByChar = new Map(kanaEntries.map((entry) => [String.fromCharCode(entry.charCode), entry]));

export interface KanaStrokeStep {
  id: string;
  fillPath: string;
  medianPath: string;
}

function normalizeStrokeId(id: string) {
  return id.replace(/[a-z]$/, "");
}

function medianToPath(points: number[][]) {
  if (points.length < 2) return "";

  let d = `M ${points[0][0]},${points[0][1]}`;
  if (points.length === 2) return `${d} L ${points[1][0]},${points[1][1]}`;

  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i];
    const [nextX, nextY] = points[i + 1];

    if (i === points.length - 2) {
      d += ` Q ${x},${y} ${nextX},${nextY}`;
    } else {
      d += ` Q ${x},${y} ${((x + nextX) / 2).toFixed(1)},${((y + nextY) / 2).toFixed(1)}`;
    }
  }

  return d;
}

function pathsToCompoundPath(paths: string[]) {
  return paths.join(" ");
}

function removeEmbeddedSaThirdStroke(path: string) {
  const embeddedStrokeStart = path.indexOf(SA_EMBEDDED_THIRD_STROKE_START);
  if (embeddedStrokeStart === -1) return path;

  return path.slice(0, embeddedStrokeStart + 1);
}

function normalizeFillPath(entry: KanaStrokeEntry, stroke: KanaStroke) {
  if (entry.charCode === HIRAGANA_SA_CHAR_CODE && (stroke.id === "1" || stroke.id === "2")) {
    return removeEmbeddedSaThirdStroke(stroke.value);
  }

  return stroke.value;
}

export function getStrokeSteps(entry: KanaStrokeEntry): KanaStrokeStep[] {
  const medianById = new Map(entry.medians.map((median) => [median.id, median.value]));
  const steps = new Map<string, KanaStrokeStep>();

  for (const stroke of entry.strokes) {
    const id = normalizeStrokeId(stroke.id);
    const existing = steps.get(id);
    const medianPath = medianToPath(medianById.get(stroke.id) ?? medianById.get(id) ?? []);

    if (existing) {
      existing.fillPath = pathsToCompoundPath([existing.fillPath, normalizeFillPath(entry, stroke)]);
      existing.medianPath = pathsToCompoundPath([existing.medianPath, medianPath]);
    } else {
      steps.set(id, {
        id,
        fillPath: normalizeFillPath(entry, stroke),
        medianPath,
      });
    }
  }

  return [...steps.values()];
}
