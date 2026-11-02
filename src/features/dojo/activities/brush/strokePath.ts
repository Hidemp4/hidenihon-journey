/**
 * Caminhos SVG dos traços, sem DOM: o jsdom não tem `getTotalLength`/`getPointAtLength`, e a
 * pontuação e a conferência de traço precisam rodar nos testes. Também é usado pelo script
 * `scripts/build-strokes.ts` para normalizar os dados do KanjiVG.
 */

export interface Point {
  x: number;
  y: number;
}

/** Depois de normalizado, todo caminho vira só M, L e C absolutos. */
export type PathSegment =
  | { type: "M"; to: Point }
  | { type: "L"; to: Point }
  | { type: "C"; c1: Point; c2: Point; to: Point };

// "1.5.5" são dois números (1.5 e .5) e "3-4" também (3 e -4): é assim que o KanjiVG escreve.
const TOKEN = /[A-Za-z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
const ARGUMENT_COUNT: Readonly<Record<string, number>> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, Z: 0 };

const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
const reflect = (control: Point, around: Point): Point => ({ x: 2 * around.x - control.x, y: 2 * around.y - control.y });
const lerp = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** `null` para caminho malformado ou com comandos que os traços não usam (arcos). */
export function parsePathData(d: string): PathSegment[] | null {
  const tokens = d.match(TOKEN) ?? [];
  const segments: PathSegment[] = [];
  let current: Point = { x: 0, y: 0 };
  let subpathStart: Point = current;
  let lastCubicControl: Point | null = null;
  let lastQuadControl: Point | null = null;
  let command = "";
  let index = 0;

  const read = (count: number): number[] | null => {
    const values = tokens.slice(index, index + count).map(Number);
    if (values.length < count || values.some((value) => !Number.isFinite(value))) return null;
    index += count;
    return values;
  };

  while (index < tokens.length) {
    if (/^[A-Za-z]$/.test(tokens[index])) {
      command = tokens[index];
      index += 1;
    } else if (!command || command === "Z" || command === "z") {
      return null; // número sem comando
    }

    const upper = command.toUpperCase();
    const count = ARGUMENT_COUNT[upper];
    if (count === undefined) return null;
    const relative = command !== upper;
    const at = (x: number, y: number): Point => (relative ? add(current, { x, y }) : { x, y });

    if (upper === "Z") {
      if (current.x !== subpathStart.x || current.y !== subpathStart.y) segments.push({ type: "L", to: subpathStart });
      current = subpathStart;
      lastCubicControl = lastQuadControl = null;
      continue;
    }

    const values = read(count);
    if (!values) return null;

    let cubicControl: Point | null = null;
    let quadControl: Point | null = null;

    switch (upper) {
      case "M": {
        current = subpathStart = at(values[0], values[1]);
        segments.push({ type: "M", to: current });
        // Pares extras depois de um M são linhas (regra do SVG).
        command = relative ? "l" : "L";
        break;
      }
      case "L":
      case "H":
      case "V": {
        const to =
          upper === "L"
            ? at(values[0], values[1])
            : upper === "H"
              ? { x: relative ? current.x + values[0] : values[0], y: current.y }
              : { x: current.x, y: relative ? current.y + values[0] : values[0] };
        segments.push({ type: "L", to });
        current = to;
        break;
      }
      case "C":
      case "S": {
        const c1: Point = upper === "C" ? at(values[0], values[1]) : lastCubicControl ? reflect(lastCubicControl, current) : current;
        const c2 = upper === "C" ? at(values[2], values[3]) : at(values[0], values[1]);
        const to = upper === "C" ? at(values[4], values[5]) : at(values[2], values[3]);
        segments.push({ type: "C", c1, c2, to });
        cubicControl = c2;
        current = to;
        break;
      }
      case "Q":
      case "T": {
        const control: Point = upper === "Q" ? at(values[0], values[1]) : lastQuadControl ? reflect(lastQuadControl, current) : current;
        const to = upper === "Q" ? at(values[2], values[3]) : at(values[0], values[1]);
        // Quadrática como cúbica equivalente: o resto do código só conhece M, L e C.
        segments.push({ type: "C", c1: lerp(current, control, 2 / 3), c2: lerp(to, control, 2 / 3), to });
        quadControl = control;
        current = to;
        break;
      }
    }

    lastCubicControl = cubicControl;
    lastQuadControl = quadControl;
  }

  return segments.length > 0 && segments[0].type === "M" ? segments : null;
}

function formatNumber(value: number, decimals: number): string {
  const factor = 10 ** decimals;
  const rounded = Math.round(value * factor) / factor;
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

/** Forma compacta e estável: comandos absolutos, números arredondados, vírgula entre números. */
export function serializePath(segments: readonly PathSegment[], decimals = 1): string {
  const format = (point: Point) => `${formatNumber(point.x, decimals)},${formatNumber(point.y, decimals)}`;
  return segments
    .map((segment) =>
      segment.type === "C" ? `C${format(segment.c1)},${format(segment.c2)},${format(segment.to)}` : `${segment.type}${format(segment.to)}`
    )
    .join("");
}

export function normalizePathData(d: string, decimals = 1): string | null {
  const segments = parsePathData(d);
  return segments ? serializePath(segments, decimals) : null;
}

function cubicAt(p0: Point, c1: Point, c2: Point, p1: Point, t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const e = t * t * t;
  return { x: a * p0.x + b * c1.x + c * c2.x + e * p1.x, y: a * p0.y + b * c1.y + c * c2.y + e * p1.y };
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Pontos ao longo do caminho, com no máximo `step` unidades entre eles. */
export function samplePath(segments: readonly PathSegment[], step = 0.5): Point[] {
  const points: Point[] = [];
  let current: Point = { x: 0, y: 0 };

  for (const segment of segments) {
    if (segment.type === "M") {
      points.push(segment.to);
    } else if (segment.type === "L") {
      const parts = Math.max(1, Math.ceil(distance(current, segment.to) / step));
      for (let part = 1; part <= parts; part += 1) points.push(lerp(current, segment.to, part / parts));
    } else {
      // O polígono de controle é sempre ≥ que a curva: amostrar por ele garante o passo máximo.
      const hull = distance(current, segment.c1) + distance(segment.c1, segment.c2) + distance(segment.c2, segment.to);
      const parts = Math.max(1, Math.ceil(hull / step));
      for (let part = 1; part <= parts; part += 1) points.push(cubicAt(current, segment.c1, segment.c2, segment.to, part / parts));
    }
    current = segment.to;
  }

  return points;
}

export function polylineLength(points: readonly Point[]): number {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) total += distance(points[index - 1], points[index]);
  return total;
}

/** `count` pontos igualmente espaçados pelo comprimento (para comparar traços de velocidades diferentes). */
export function resample(points: readonly Point[], count: number): Point[] {
  if (points.length === 0 || count <= 0) return [];
  const total = polylineLength(points);
  if (points.length === 1 || total === 0 || count === 1) return Array.from({ length: count }, () => points[0]);

  const result: Point[] = [points[0]];
  const interval = total / (count - 1);
  let walked = 0;
  let segment = 1;

  for (let index = 1; index < count - 1; index += 1) {
    const target = index * interval;
    while (segment < points.length - 1 && walked + distance(points[segment - 1], points[segment]) < target) {
      walked += distance(points[segment - 1], points[segment]);
      segment += 1;
    }
    const length = distance(points[segment - 1], points[segment]);
    result.push(lerp(points[segment - 1], points[segment], length === 0 ? 0 : (target - walked) / length));
  }

  result.push(points[points.length - 1]);
  return result;
}
