import { ALPHABET_OPTIONS } from "@/features/dojo/shared/constants";
import { CONTENT_OPTIONS, validGroupIds } from "@/features/dojo/shared/content";
import { dojoStorageKey, isFiniteNumber, isRecord, pickOption, readJson, writeFirstThatFits } from "@/features/dojo/shared/storage";
import { isStudyItemId } from "@/features/dojo/shared/studyItem";
import { DEFAULT_BRUSH_SETTINGS, MODE_OPTIONS, SESSION_SIZE_OPTIONS } from "./constants";
import type { BrushSettings } from "./types";

const STORAGE_VERSION = 1;
const STORAGE_KEY = dojoStorageKey(`brush:v${STORAGE_VERSION}`);

/** Kana (92) + kanji da Fase 5 cabem com folga; acima disso sai quem foi praticado há mais tempo. */
const MAX_PRACTICED = 500;
const FALLBACK_LIMITS = [MAX_PRACTICED, 200, 50] as const;

export interface PracticedRecord {
  /** Melhor nota (0–100) já tirada no item. */
  bestScore: number;
  /** Epoch em ms. */
  lastAt: number;
}

export type PracticedItems = Readonly<Record<string, PracticedRecord>>;

interface StoredBrush {
  settings: BrushSettings;
  practiced: PracticedItems;
}

export function sanitizeBrushSettings(raw: unknown): BrushSettings {
  const defaults = DEFAULT_BRUSH_SETTINGS;
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
    mode: pickOption(
      MODE_OPTIONS.map((option) => option.id),
      raw.mode,
      defaults.mode
    ),
    content,
    alphabet,
    selectedGroupIds: validGroupIds({ content, alphabet }, raw.selectedGroupIds),
    sessionSize: pickOption<number>(SESSION_SIZE_OPTIONS, raw.sessionSize, defaults.sessionSize),
  };
}

function trimPracticed(items: PracticedItems, limit: number): PracticedItems {
  const entries = Object.entries(items);
  if (entries.length <= limit) return items;
  return Object.fromEntries(entries.sort(([, a], [, b]) => b.lastAt - a.lastAt).slice(0, limit));
}

export function sanitizePracticed(raw: unknown): PracticedItems {
  if (!isRecord(raw)) return {};
  const result: Record<string, PracticedRecord> = {};
  for (const [id, record] of Object.entries(raw)) {
    if (id.length > 64 || !isStudyItemId(id) || !isRecord(record)) continue;
    const { bestScore, lastAt } = record;
    if (!isFiniteNumber(bestScore) || bestScore < 0 || bestScore > 100 || !isFiniteNumber(lastAt)) continue;
    result[id] = { bestScore: Math.round(bestScore), lastAt };
  }
  return trimPracticed(result, MAX_PRACTICED);
}

function load(): StoredBrush {
  const stored = readJson(STORAGE_KEY);
  if (!isRecord(stored) || stored.version !== STORAGE_VERSION) return { settings: sanitizeBrushSettings(null), practiced: {} };
  return { settings: sanitizeBrushSettings(stored.settings), practiced: sanitizePracticed(stored.practiced) };
}

/** Se a quota estourar, tenta de novo guardando só os praticados mais recentes. */
function save({ settings, practiced }: StoredBrush): boolean {
  function* payloads() {
    for (const limit of FALLBACK_LIMITS) yield JSON.stringify({ version: STORAGE_VERSION, settings, practiced: trimPracticed(practiced, limit) });
  }
  return writeFirstThatFits(STORAGE_KEY, payloads());
}

export function loadBrushSettings(): BrushSettings {
  return load().settings;
}

export function saveBrushSettings(settings: BrushSettings): boolean {
  return save({ ...load(), settings });
}

export function loadPracticed(): PracticedItems {
  return load().practiced;
}

/**
 * Marca itens como praticados. Fica a melhor nota e a data mais recente: gravar a mesma sessão
 * de novo (ao concluir e ao sair da página) não muda nada.
 */
export function recordPracticed(entries: ReadonlyArray<{ itemId: string; score: number }>, now: number): boolean {
  if (entries.length === 0) return true;
  const stored = load();
  const practiced: Record<string, PracticedRecord> = { ...stored.practiced };
  for (const { itemId, score } of entries) {
    const previous = practiced[itemId];
    practiced[itemId] = { bestScore: Math.max(previous?.bestScore ?? 0, Math.round(score)), lastAt: Math.max(previous?.lastAt ?? 0, now) };
  }
  return save({ ...stored, practiced: trimPracticed(practiced, MAX_PRACTICED) });
}
