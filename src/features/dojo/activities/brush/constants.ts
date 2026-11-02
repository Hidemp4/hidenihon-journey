import type { BrushMode, BrushSettings, SelfGrade } from "./types";

// ---- sessão ---------------------------------------------------------------

export const SESSION_SIZE_OPTIONS = [5, 10, 20] as const;

export const MODE_OPTIONS: ReadonlyArray<{ id: BrushMode; label: string; description: string }> = [
  { id: "trace", label: "Traçar", description: "Siga o guia; cada traço é conferido." },
  { id: "recall", label: "De memória", description: "Só o romaji; depois compare com o modelo." },
  { id: "study", label: "Estudar ordem", description: "Só a animação, sem desenhar." },
];

export const SELF_GRADE_OPTIONS: ReadonlyArray<{ id: SelfGrade; label: string; key: string }> = [
  { id: "again", label: "Errei", key: "1" },
  { id: "almost", label: "Quase", key: "2" },
  { id: "good", label: "Acertei", key: "3" },
];

export const DEFAULT_BRUSH_SETTINGS: BrushSettings = {
  mode: "trace",
  content: "kana",
  alphabet: "hiragana",
  selectedGroupIds: [],
  sessionSize: 5,
};

// ---- tinta (unidades do quadro de 109 do KanjiVG) -------------------------

/** Mais grosso que o traço do modelo (3): com o dedo, linha fina fica difícil de ver. */
export const INK_WIDTH = 5;
/** Pontos mais próximos que isso são tremida da mão: descartados antes de suavizar. */
export const MIN_POINT_DISTANCE = 0.6;

// ---- conferência traço a traço (modo Traçar) ------------------------------

/** Pontos de cada traço depois de reamostrar: compara traços feitos em velocidades diferentes. */
export const RESAMPLE_POINTS = 32;
/** Distância média máxima (unidades) para o traço desenhado valer como o traço do modelo. */
export const STROKE_MATCH_MAX_DISTANCE = 14;
/** Menor que isso é um toque, não um traço: ignorado sem contar como erro. */
export const MIN_STROKE_LENGTH = 3;
/** Traços curtos (pontinhos) não têm direção que dê para conferir. */
export const DIRECTION_MIN_LENGTH = 12;

// ---- nota (distância ao modelo, unidades do quadro de 109) ----------------

/** De quantas em quantas unidades os traços viram pontos para medir a distância. */
export const SAMPLE_SPACING = 1;
/**
 * Erro médio (unidades) que zera a nota. Sem folga: cada unidade de erro tira 100/ZERO pontos,
 * e só erro zero (desenho idêntico ao modelo) dá 100.
 */
export const ZERO_SCORE_ERROR = 7;
/** Pontos tirados por traço a mais ou a menos. */
export const STROKE_COUNT_PENALTY = 15;
export const MAX_STROKE_COUNT_PENALTY = 45;
/** De memória, o desenho é encaixado no tamanho do modelo, mas sem esticar mais que isso. */
export const FIT_SCALE_LIMITS = { min: 0.5, max: 2 } as const;

/** A partir destas notas a autoavaliação sugere "Acertei" / "Quase". */
export const SCORE_GOOD = 75;
export const SCORE_ALMOST = 50;

// ---- animação da ordem -----------------------------------------------------

export const STROKE_ANIMATION = {
  /** Velocidade do pincel (unidades por segundo). */
  unitsPerSecond: 90,
  minMs: 280,
  gapMs: 160,
} as const;
