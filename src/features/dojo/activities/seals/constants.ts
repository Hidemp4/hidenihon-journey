import type { SealBoardSizeId, SealPairType, SealsSettings } from "./types";

/** Tempo com o par errado à mostra antes de desvirar: dá para ler e decorar as duas cartas. */
export const MISMATCH_HIDE_MS = 800;

export interface SealBoardSize {
  id: SealBoardSizeId;
  label: string;
  pairs: number;
  /** Colunas em tela estreita (retrato) e larga. Linhas = cartas / colunas, sempre completas. */
  columns: { narrow: number; wide: number };
}

export const BOARD_SIZES: readonly SealBoardSize[] = [
  { id: "3x4", label: "3×4", pairs: 6, columns: { narrow: 3, wide: 4 } },
  { id: "4x4", label: "4×4", pairs: 8, columns: { narrow: 4, wide: 4 } },
  { id: "4x6", label: "4×6", pairs: 12, columns: { narrow: 4, wide: 6 } },
];

/** A partir desta largura a mesa deita (mais colunas, menos linhas) para caber sem rolar. */
export const WIDE_BOARD_QUERY = "(min-width: 768px)";

/**
 * Estrelas por eficiência (jogadas por par). Com memória perfeita a média fica em ~1,6 jogada por par,
 * então 3 estrelas pede quase isso; 2 estrelas aceita algumas voltas a mais.
 */
export const STAR_MOVES_PER_PAIR = { three: 1.75, two: 2.5 } as const;
export const MAX_STARS = 3;

export const PAIR_TYPE_OPTIONS: ReadonlyArray<{ id: SealPairType; label: string; example: string }> = [
  { id: "kana-romaji", label: "Kana ↔ romaji", example: "あ ↔ a" },
  { id: "hiragana-katakana", label: "Hiragana ↔ katakana", example: "あ ↔ ア" },
  { id: "kanji-meaning", label: "Kanji ↔ significado", example: "水 ↔ água" },
];

export const DEFAULT_SEALS_SETTINGS: SealsSettings = {
  pairType: "kana-romaji",
  alphabet: "hiragana",
  sizeId: "3x4",
  selectedGroupIds: [],
};

export function getBoardSize(id: SealBoardSizeId): SealBoardSize {
  return BOARD_SIZES.find((size) => size.id === id) ?? BOARD_SIZES[0];
}
