import { ALPHABET_OPTIONS } from "@/features/dojo/shared/constants";
import { CONTENT_OPTIONS, validGroupIds } from "@/features/dojo/shared/content";
import { dojoStorageKey, isFiniteNumber, isRecord, pickOption, readJson, writeRaw } from "@/features/dojo/shared/storage";
import { DEFAULT_SCROLLS_SETTINGS, NEW_PER_DAY_OPTIONS } from "./constants";
import type { ScrollsSettings } from "./types";

const STORAGE_VERSION = 1;
const STORAGE_KEY = dojoStorageKey(`scrolls:v${STORAGE_VERSION}`);
/** Sessões já contadas no limite de novos do dia (para gravar duas vezes não contar dobrado). */
const MAX_DAILY_SESSION_IDS = 50;
const MAX_ID_LENGTH = 64;

interface DailyNew {
  /** Dia local (ver shared/calendar). */
  day: number;
  introduced: number;
  sessionIds: string[];
}

interface StoredScrolls {
  settings: ScrollsSettings;
  daily: DailyNew | null;
}

export function sanitizeScrollsSettings(raw: unknown): ScrollsSettings {
  const defaults = DEFAULT_SCROLLS_SETTINGS;
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
    // `direction` de versões antigas é ignorado: a direção agora é fixa.
    newPerDay: pickOption<number>(NEW_PER_DAY_OPTIONS, raw.newPerDay, defaults.newPerDay),
  };
}

function sanitizeDaily(raw: unknown): DailyNew | null {
  if (!isRecord(raw)) return null;
  const { day, introduced } = raw;
  if (typeof day !== "number" || !Number.isInteger(day) || !isFiniteNumber(introduced) || introduced < 0) return null;

  return {
    day,
    introduced: Math.floor(introduced),
    sessionIds: Array.isArray(raw.sessionIds)
      ? raw.sessionIds.filter((id): id is string => typeof id === "string" && id.length <= MAX_ID_LENGTH).slice(0, MAX_DAILY_SESSION_IDS)
      : [],
  };
}

function load(): StoredScrolls {
  const stored = readJson(STORAGE_KEY);
  if (!isRecord(stored) || stored.version !== STORAGE_VERSION) return { settings: sanitizeScrollsSettings(null), daily: null };
  return { settings: sanitizeScrollsSettings(stored.settings), daily: sanitizeDaily(stored.daily) };
}

function save(stored: StoredScrolls): boolean {
  // Payload pequeno e de tamanho fixo (configuração + contador do dia): não há o que cortar se a quota estourar.
  return writeRaw(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, ...stored }));
}

export function loadScrollsSettings(): ScrollsSettings {
  return load().settings;
}

export function saveScrollsSettings(settings: ScrollsSettings): boolean {
  return save({ ...load(), settings });
}

/** Novos já apresentados no dia local `day` (zera sozinho quando o dia vira). */
export function loadIntroducedToday(day: number): number {
  const { daily } = load();
  return daily?.day === day ? daily.introduced : 0;
}

/** Soma os novos de uma sessão ao dia. Idempotente por `sessionId`. */
export function recordIntroduced(day: number, sessionId: string, count: number): boolean {
  if (count <= 0) return true;

  const stored = load();
  const current = stored.daily?.day === day ? stored.daily : { day, introduced: 0, sessionIds: [] };
  if (current.sessionIds.includes(sessionId)) return true;

  return save({
    ...stored,
    daily: {
      day,
      introduced: current.introduced + count,
      sessionIds: [sessionId, ...current.sessionIds].slice(0, MAX_DAILY_SESSION_IDS),
    },
  });
}
