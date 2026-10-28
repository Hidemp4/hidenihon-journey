import {
  ALPHABET_OPTIONS,
  DEFAULT_DOJO_SETTINGS,
  MAX_LOCAL_SESSIONS,
  MAX_STORED_ATTEMPTS,
  MODE_OPTIONS,
  DIFFICULTY_OPTIONS,
  TARGET_COUNT_OPTIONS,
  TIME_LIMIT_OPTIONS,
} from "./constants";
import { getAvailableGroups } from "./kanaDeck";
import type { AttemptOutcome, DojoAttempt, DojoSession, DojoSettings } from "./types";

/** Suba a versão quando o formato mudar: dados antigos são ignorados em vez de quebrar a tela. */
const STORAGE_VERSION = 2;
// As chaves mantêm o prefixo antigo ("kana-reaction") de propósito: renomeá-las apagaria o histórico
// e as configurações que as pessoas já têm salvos no navegador.
const SESSIONS_KEY = `hidenihon:kana-reaction:sessions:v${STORAGE_VERSION}`;
const SETTINGS_KEY = "hidenihon:kana-reaction:settings:v1";
const AUDIO_KEY = "hidenihon:kana-reaction:audio";

const OUTCOMES: readonly AttemptOutcome[] = ["correct", "wrong", "timeout"];

function getStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    // Acessar localStorage pode lançar SecurityError (cookies bloqueados, iframe etc.).
    return null;
  }
}

function readRaw(key: string): string | null {
  try {
    return getStorage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string): boolean {
  try {
    const storage = getStorage();
    if (!storage) return false;
    storage.setItem(key, value);
    return true;
  } catch {
    // Quota cheia, modo privado do Safari etc.
    return false;
  }
}

function readJson(key: string): unknown {
  const raw = readRaw(key);
  if (raw == null) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function pickOption<T>(options: readonly T[], value: unknown, fallback: T): T {
  return options.find((option) => option === value) ?? fallback;
}

function isAttempt(value: unknown): value is DojoAttempt {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.kana === "string" &&
    typeof value.romaji === "string" &&
    typeof value.answer === "string" &&
    (value.alphabet === "hiragana" || value.alphabet === "katakana") &&
    typeof value.group === "string" &&
    OUTCOMES.includes(value.outcome as AttemptOutcome) &&
    (value.reactionMs === null || isFiniteNumber(value.reactionMs)) &&
    isFiniteNumber(value.completionMs) &&
    typeof value.createdAt === "string"
  );
}

/** Garante que qualquer coisa vinda do disco vira uma configuração válida. */
export function sanitizeSettings(raw: unknown): DojoSettings {
  const defaults = DEFAULT_DOJO_SETTINGS;
  if (!isRecord(raw)) return { ...defaults, selectedGroupIds: [] };

  const alphabet = pickOption(
    ALPHABET_OPTIONS.map((option) => option.id),
    raw.alphabet,
    defaults.alphabet
  );
  const validGroupIds = new Set(getAvailableGroups(alphabet).map((group) => group.id));

  return {
    alphabet,
    mode: pickOption(
      MODE_OPTIONS.map((option) => option.id),
      raw.mode,
      defaults.mode
    ),
    difficulty: pickOption(
      DIFFICULTY_OPTIONS.map((option) => option.id),
      raw.difficulty,
      defaults.difficulty
    ),
    targetCount: pickOption<number>(TARGET_COUNT_OPTIONS, raw.targetCount, defaults.targetCount),
    timeLimitSeconds: pickOption<number>(TIME_LIMIT_OPTIONS, raw.timeLimitSeconds, defaults.timeLimitSeconds),
    selectedGroupIds: Array.isArray(raw.selectedGroupIds)
      ? raw.selectedGroupIds.filter((id): id is string => typeof id === "string" && validGroupIds.has(id))
      : [],
    focusMode: typeof raw.focusMode === "boolean" ? raw.focusMode : defaults.focusMode,
  };
}

function parseSession(value: unknown): DojoSession | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || typeof value.startedAt !== "string") return null;
  if (value.finishedAt !== null && typeof value.finishedAt !== "string") return null;
  if (!Array.isArray(value.attempts) || !value.attempts.every(isAttempt)) return null;

  return {
    id: value.id,
    startedAt: value.startedAt,
    finishedAt: value.finishedAt,
    settings: sanitizeSettings(value.settings),
    attempts: value.attempts,
  };
}

export function loadLocalDojoSessions(): DojoSession[] {
  const stored = readJson(SESSIONS_KEY);
  if (!isRecord(stored) || stored.version !== STORAGE_VERSION || !Array.isArray(stored.sessions)) return [];

  return stored.sessions.flatMap((item) => {
    const session = parseSession(item);
    return session ? [session] : [];
  });
}

/** Retorna `false` se não foi possível gravar (o treino continua funcionando normalmente). */
export function saveLocalDojoSession(session: DojoSession): boolean {
  // Sessão vazia (Esc logo no início) não vale a pena guardar.
  if (session.attempts.length === 0) return true;

  const trimmed: DojoSession = { ...session, attempts: session.attempts.slice(-MAX_STORED_ATTEMPTS) };
  const sessions = [trimmed, ...loadLocalDojoSessions().filter((stored) => stored.id !== session.id)];

  // Se estourar a quota, tenta de novo guardando menos sessões.
  for (const limit of [MAX_LOCAL_SESSIONS, 10, 3, 1]) {
    const payload = JSON.stringify({ version: STORAGE_VERSION, sessions: sessions.slice(0, limit) });
    if (writeRaw(SESSIONS_KEY, payload)) return true;
  }

  return false;
}

export function loadLocalSettings(): DojoSettings {
  return sanitizeSettings(readJson(SETTINGS_KEY));
}

export function saveLocalSettings(settings: DojoSettings) {
  writeRaw(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadAudioEnabled(): boolean {
  return readRaw(AUDIO_KEY) !== "off";
}

export function saveAudioEnabled(enabled: boolean) {
  writeRaw(AUDIO_KEY, enabled ? "on" : "off");
}
