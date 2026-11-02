import { ALPHABET_OPTIONS } from "@/features/dojo/shared/constants";
import { validGroupIds } from "@/features/dojo/shared/content";
import { dojoStorageKey, isFiniteNumber, isRecord, pickOption, readJson, writeRaw } from "@/features/dojo/shared/storage";
import { BOARD_SIZES, DEFAULT_SEALS_SETTINGS, getBoardSize, MAX_STARS, PAIR_TYPE_OPTIONS } from "./constants";
import { contentSelection, SEALS_CONFIG_KEYS, sizeIdOfConfigKey } from "./pairs";
import { isBetterResult } from "./results";
import type { SealsBest, SealsSettings } from "./types";

const STORAGE_VERSION = 1;
const STORAGE_KEY = dojoStorageKey(`seals:v${STORAGE_VERSION}`);

/** Recorde por configuração (`sealsConfigKey`). */
export type SealsBests = Readonly<Record<string, SealsBest>>;

interface StoredSeals {
  settings: SealsSettings;
  best: SealsBests;
}

export function sanitizeSealsSettings(raw: unknown): SealsSettings {
  const defaults = DEFAULT_SEALS_SETTINGS;
  if (!isRecord(raw)) return { ...defaults, selectedGroupIds: [] };

  const pairType = pickOption(
    PAIR_TYPE_OPTIONS.map((option) => option.id),
    raw.pairType,
    defaults.pairType
  );
  const alphabet = pickOption(
    ALPHABET_OPTIONS.map((option) => option.id),
    raw.alphabet,
    defaults.alphabet
  );
  // Os grupos valem contra o conteúdo (em hiragana ↔ katakana, os do hiragana; em kanji, os temas).

  return {
    pairType,
    alphabet,
    sizeId: pickOption(
      BOARD_SIZES.map((size) => size.id),
      raw.sizeId,
      defaults.sizeId
    ),
    selectedGroupIds: validGroupIds(contentSelection({ pairType, alphabet }), raw.selectedGroupIds),
  };
}

function sanitizeBest(raw: unknown, configKey: string): SealsBest | null {
  const sizeId = sizeIdOfConfigKey(configKey);
  if (!isRecord(raw) || !sizeId) return null;
  const { moves, ms, stars, finishedAt } = raw;
  // Menos jogadas do que pares é impossível: registro adulterado ou de outra versão.
  if (!isFiniteNumber(moves) || !Number.isInteger(moves) || moves < getBoardSize(sizeId).pairs) return null;
  if (!isFiniteNumber(ms) || ms < 0 || !isFiniteNumber(finishedAt)) return null;
  if (!isFiniteNumber(stars) || !Number.isInteger(stars) || stars < 1 || stars > MAX_STARS) return null;
  return { moves, ms: Math.round(ms), stars, finishedAt };
}

export function sanitizeSealsBests(raw: unknown): SealsBests {
  if (!isRecord(raw)) return {};
  const result: Record<string, SealsBest> = {};
  // Só chaves conhecidas: no máximo 15 registros, então o tamanho do payload é limitado por construção.
  for (const key of SEALS_CONFIG_KEYS) {
    const best = sanitizeBest(raw[key], key);
    if (best) result[key] = best;
  }
  return result;
}

function load(): StoredSeals {
  const stored = readJson(STORAGE_KEY);
  if (!isRecord(stored) || stored.version !== STORAGE_VERSION) return { settings: sanitizeSealsSettings(null), best: {} };
  return { settings: sanitizeSealsSettings(stored.settings), best: sanitizeSealsBests(stored.best) };
}

function save(stored: StoredSeals): boolean {
  // Payload pequeno e limitado (configurações + até 15 recordes): não há o que cortar se a quota estourar.
  return writeRaw(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, ...stored }));
}

export function loadSealsSettings(): SealsSettings {
  return load().settings;
}

export function saveSealsSettings(settings: SealsSettings): boolean {
  return save({ ...load(), settings });
}

export function loadSealsBests(): SealsBests {
  return load().best;
}

/**
 * Grava o resultado se for melhor que o recorde da configuração. Gravar o mesmo resultado de novo
 * (StrictMode, saída dupla) não muda nada. `false` só quando era recorde e o navegador não deixou salvar.
 */
export function saveSealsBestIfBetter(configKey: string, result: SealsBest): boolean {
  if (!SEALS_CONFIG_KEYS.has(configKey)) return false;
  const stored = load();
  if (!isBetterResult(result, stored.best[configKey] ?? null)) return true;
  return save({ ...stored, best: { ...stored.best, [configKey]: result } });
}
