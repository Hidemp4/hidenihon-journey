import { ALPHABET_OPTIONS } from "@/features/dojo/shared/constants";
import { CONTENT_OPTIONS, validGroupIds } from "@/features/dojo/shared/content";
import { dojoStorageKey, isFiniteNumber, isRecord, pickOption, readJson, writeRaw } from "@/features/dojo/shared/storage";
import { DEFAULT_EXAM_SETTINGS, DIRECTION_OPTIONS, MODE_OPTIONS, QUESTION_COUNT_OPTIONS, TIME_LIMIT_OPTIONS } from "./constants";
import type { ExamMode, ExamSettings } from "./types";

const STORAGE_VERSION = 1;
const STORAGE_KEY = dojoStorageKey(`exam:v${STORAGE_VERSION}`);

/** Só o último resultado: é o que o card do hub mostra ("última nota"). */
export interface LastExamResult {
  score: number;
  total: number;
  mode: ExamMode;
  /** Epoch em ms. */
  finishedAt: number;
}

interface StoredExam {
  settings: ExamSettings;
  last: LastExamResult | null;
}

export function sanitizeExamSettings(raw: unknown): ExamSettings {
  const defaults = DEFAULT_EXAM_SETTINGS;
  if (!isRecord(raw)) return { ...defaults, selectedGroupIds: [] };

  const alphabet = pickOption(
    ALPHABET_OPTIONS.map((option) => option.id),
    raw.alphabet,
    defaults.alphabet
  );
  const content = pickOption(
    CONTENT_OPTIONS.map((option) => option.id),
    raw.content,
    defaults.content
  );

  return {
    content,
    alphabet,
    selectedGroupIds: validGroupIds({ content, alphabet }, raw.selectedGroupIds),
    direction: pickOption(
      DIRECTION_OPTIONS.map((option) => option.id),
      raw.direction,
      defaults.direction
    ),
    mode: pickOption(
      MODE_OPTIONS.map((option) => option.id),
      raw.mode,
      defaults.mode
    ),
    questionCount: pickOption<number>(QUESTION_COUNT_OPTIONS, raw.questionCount, defaults.questionCount),
    timeLimitSeconds: pickOption<number>(TIME_LIMIT_OPTIONS, raw.timeLimitSeconds, defaults.timeLimitSeconds),
    autoAdvance: typeof raw.autoAdvance === "boolean" ? raw.autoAdvance : defaults.autoAdvance,
  };
}

function sanitizeLast(raw: unknown): LastExamResult | null {
  if (!isRecord(raw)) return null;
  const { score, total, mode, finishedAt } = raw;
  if (!isFiniteNumber(score) || score < 0 || score > 100) return null;
  if (!isFiniteNumber(total) || total < 1 || !isFiniteNumber(finishedAt)) return null;
  const validMode = MODE_OPTIONS.find((option) => option.id === mode)?.id;
  if (!validMode) return null;
  return { score: Math.round(score), total: Math.floor(total), mode: validMode, finishedAt };
}

function load(): StoredExam {
  const stored = readJson(STORAGE_KEY);
  if (!isRecord(stored) || stored.version !== STORAGE_VERSION) return { settings: sanitizeExamSettings(null), last: null };
  return { settings: sanitizeExamSettings(stored.settings), last: sanitizeLast(stored.last) };
}

function save(stored: StoredExam): boolean {
  // Payload pequeno e de tamanho fixo: não há o que cortar se a quota estourar.
  return writeRaw(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, ...stored }));
}

export function loadExamSettings(): ExamSettings {
  return load().settings;
}

export function saveExamSettings(settings: ExamSettings): boolean {
  return save({ ...load(), settings });
}

export function loadLastExamResult(): LastExamResult | null {
  return load().last;
}

export function saveLastExamResult(last: LastExamResult): boolean {
  return save({ ...load(), last });
}
