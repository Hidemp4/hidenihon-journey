import { ALPHABET_OPTIONS } from "@/features/dojo/shared/constants";
import { getAvailableGroups } from "@/features/dojo/shared/kanaDeck";
import {
  isFiniteNumber,
  isRecord,
  pickOption,
  readJson,
  writeFirstThatFits,
  writeRaw,
} from "@/features/dojo/shared/storage";
import {
  DEFAULT_DOJO_SETTINGS,
  MAX_LOCAL_SESSIONS,
  MAX_STORED_ATTEMPTS,
  MODE_OPTIONS,
  DIFFICULTY_OPTIONS,
  TARGET_COUNT_OPTIONS,
  TIME_LIMIT_OPTIONS,
} from "./constants";
import type { AttemptOutcome, DojoAttempt, DojoSession, DojoSettings } from "./types";

/** Suba a versão quando o formato mudar: dados antigos são ignorados em vez de quebrar a tela. */
const STORAGE_VERSION = 2;
// As chaves mantêm o prefixo antigo ("kana-reaction") de propósito: renomeá-las apagaria o histórico
// e as configurações que as pessoas já têm salvos no navegador. (O "mudo" vive em shared/audioPreference.)
const SESSIONS_KEY = `hidenihon:kana-reaction:sessions:v${STORAGE_VERSION}`;
const SETTINGS_KEY = "hidenihon:kana-reaction:settings:v1";

const OUTCOMES: readonly AttemptOutcome[] = ["correct", "wrong", "timeout"];

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
    finishedAt: typeof value.finishedAt === "string" ? value.finishedAt : null,
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
  return writeFirstThatFits(SESSIONS_KEY, sessionPayloads(sessions));
}

function* sessionPayloads(sessions: readonly DojoSession[]) {
  for (const limit of [MAX_LOCAL_SESSIONS, 10, 3, 1]) {
    yield JSON.stringify({ version: STORAGE_VERSION, sessions: sessions.slice(0, limit) });
  }
}

export function loadLocalSettings(): DojoSettings {
  return sanitizeSettings(readJson(SETTINGS_KEY));
}

export function saveLocalSettings(settings: DojoSettings) {
  writeRaw(SETTINGS_KEY, JSON.stringify(settings));
}
