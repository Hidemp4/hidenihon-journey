import { normalizePathData, parsePathData } from "./strokePath";

/** Lado do quadro dos SVG do KanjiVG (viewBox 0 0 109 109). */
export const KANJIVG_VIEWBOX = 109;

export interface KanjiVgGlyph {
  /** Um `d` normalizado por traço, na ordem de escrita. */
  strokes: string[];
  /** Onde o KanjiVG põe o número de cada traço (posições curadas para não encavalar). */
  numbers: Array<[number, number]>;
}

/** Arquivo principal do caractere no repositório: código Unicode com 5 dígitos hex (あ → 03042.svg). */
export function kanjiVgFileName(char: string): string {
  const codePoint = char.codePointAt(0) ?? 0;
  return `${codePoint.toString(16).padStart(5, "0")}.svg`;
}

function attribute(tag: string, name: string): string | null {
  return new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1] ?? null;
}

/**
 * Lê os traços de um SVG do KanjiVG. Não usa DOM (roda no Node do script e nos testes).
 * `null` se faltar traço, se um traço não for um caminho válido ou se a numeração tiver buraco.
 */
export function parseKanjiVgSvg(svg: string, decimals = 1): KanjiVgGlyph | null {
  const strokes = new Map<number, string>();
  for (const [tag] of svg.matchAll(/<path\b[^>]*>/g)) {
    const order = /^kvg:[0-9a-f]+(?:-[A-Za-z]+)?-s(\d+)$/.exec(attribute(tag, "id") ?? "")?.[1];
    const d = attribute(tag, "d");
    if (!order || !d) continue;
    const normalized = normalizePathData(d, decimals);
    if (!normalized) return null;
    strokes.set(Number(order), normalized);
  }

  const count = strokes.size;
  if (count === 0) return null;
  const ordered: string[] = [];
  for (let order = 1; order <= count; order += 1) {
    const stroke = strokes.get(order);
    if (!stroke) return null;
    ordered.push(stroke);
  }

  const labels = new Map<number, [number, number]>();
  for (const [, x, y, label] of svg.matchAll(/<text\b[^>]*transform="matrix\(1 0 0 1 ([-\d.]+) ([-\d.]+)\)"[^>]*>(\d+)<\/text>/g)) {
    labels.set(Number(label), [Number(x), Number(y)]);
  }

  const round = (value: number) => Math.round(value * 10 ** decimals) / 10 ** decimals;
  const numbers = ordered.map((stroke, index): [number, number] => {
    const label = labels.get(index + 1);
    if (label && label.every(Number.isFinite)) return [round(label[0]), round(label[1])];
    // Sem número no arquivo: perto do começo do traço (dado real, não inventado).
    const start = parsePathData(stroke)?.[0]?.to ?? { x: 0, y: 0 };
    return [round(start.x - 4), round(start.y - 2)];
  });

  return { strokes: ordered, numbers };
}
