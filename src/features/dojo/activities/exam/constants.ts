import type { ExamDirection, ExamMode, ExamSettings } from "./types";

export const OPTION_COUNT = 4;
/** Fora do modo difícil, no máximo 2 dos 3 distratores vêm dos confundíveis (sobra espaço para o grupo). */
export const NORMAL_CONFUSABLE_SLOTS = 2;

export const SURVIVAL_LIVES = 3;
/** Na Sobrevivência, a partir desta pergunta todos os distratores possíveis são confundíveis. */
export const SURVIVAL_HARD_FROM = 10;

export const QUESTION_COUNT_OPTIONS = [10, 20, 30] as const;
export const TIME_LIMIT_OPTIONS = [3, 5, 8] as const;

/** Tempo do feedback antes de avançar sozinho: errar pede mais tempo para ler a resposta certa. */
export const AUTO_ADVANCE_MS = { correct: 800, wrong: 1_800 } as const;

export const MODE_OPTIONS: ReadonlyArray<{ id: ExamMode; label: string; description: string }> = [
  { id: "round", label: "Rodada", description: "Um número fixo de perguntas." },
  { id: "survival", label: "Sobrevivência", description: "3 vidas; da 10ª em diante fica mais difícil." },
  { id: "lightning", label: "Relâmpago", description: "Tempo limite em cada pergunta." },
];

export const DIRECTION_OPTIONS: ReadonlyArray<{ id: ExamDirection; label: string }> = [
  { id: "kana-to-romaji", label: "Kana → romaji" },
  { id: "romaji-to-kana", label: "Romaji → kana" },
  { id: "mixed", label: "Misto" },
];

export const DEFAULT_EXAM_SETTINGS: ExamSettings = {
  content: "kana",
  alphabet: "hiragana",
  selectedGroupIds: [],
  direction: "kana-to-romaji",
  mode: "round",
  questionCount: 10,
  timeLimitSeconds: 5,
  autoAdvance: false,
};
