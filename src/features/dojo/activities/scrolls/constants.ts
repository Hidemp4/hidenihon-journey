import type { ScrollGrade, ScrollsSettings } from "./types";

/**
 * Quando a carta volta, por nota: Errei = já na próxima sessão (vence hoje mesmo);
 * Acertei = daqui 1 dia; Fácil = daqui 3 dias.
 */
export const GRADE_INTERVAL_DAYS: Readonly<Record<ScrollGrade, number>> = { again: 0, good: 1, easy: 3 };

/**
 * Caixa gravada no domínio junto com o vencimento. Os intervalos são fixos, então a caixa
 * só registra a última nota (1 = Errei, 2 = Acertei, 3 = Fácil) e desempata a fila.
 */
export const GRADE_BOX: Readonly<Record<ScrollGrade, number>> = { again: 1, good: 2, easy: 3 };

export const NEW_PER_DAY_OPTIONS = [5, 10, 20] as const;

/** Treino livre: cartas sorteadas (as mais fracas no domínio têm mais chance). */
export const FREE_TRAINING_SIZE = 20;

export const GRADE_OPTIONS: ReadonlyArray<{ id: ScrollGrade; label: string; key: string }> = [
  { id: "again", label: "Errei", key: "1" },
  { id: "good", label: "Acertei", key: "2" },
  { id: "easy", label: "Fácil", key: "3" },
];

export const DEFAULT_SCROLLS_SETTINGS: ScrollsSettings = {
  content: "kana",
  alphabet: "hiragana",
  selectedGroupIds: [],
  newPerDay: 10,
};
