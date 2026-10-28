import type { KanaAlphabet } from "./kanaDeck";
import type { DojoDifficulty, DojoSettings, TrainingMode } from "./types";

export const ADVANCED_RESPONSE_LIMIT_MS = 5_000;

/**
 * Arquivos de áudio em `public/audio/` (servidos a partir da raiz do site).
 * Se o app rodar num subcaminho (ex.: /app/), ajuste o prefixo aqui.
 */
export const AUDIO_SOURCES = {
  lobbyMusic: "/audio/soundtracknaruto.mp3",
  yooo: "/audio/yooo.mp3",
} as const;

/** Volume da trilha (0 a 1). Fica mais baixo enquanto o "yooo" toca. */
export const MUSIC_VOLUME = 0.5;
export const MUSIC_DUCKED_VOLUME = 0.15;

/**
 * Pausa entre clicar em "Entrar na arena" e abrir o lobby: dá tempo do áudio
 * carregar e começar junto com a transição. Não se aplica com o áudio desligado.
 */
export const ENTER_ARENA_DELAY_MS = 1_500;

/** Depois de clicar em "Entrar na arena", a trilha só "solta" o som após esse tempo. */
export const LOBBY_MUSIC_DELAY_MS = 1_500;

/** Pausa entre clicar em "Iniciar batalha" e abrir a contagem regressiva. */
export const BATTLE_START_DELAY_MS = 1_500;

export const COUNTDOWN_START = 3;
export const COUNTDOWN_STEP_MS = 900;
export const COUNTDOWN_GO_MS = 650;
export const FEEDBACK_DURATION_MS = 700;

export const TIME_LIMIT_OPTIONS = [30, 60, 180, 300] as const;
export const TARGET_COUNT_OPTIONS = [10, 20, 50] as const;

/** Limites de armazenamento local (localStorage tem ~5MB no total). */
export const MAX_LOCAL_SESSIONS = 30;
export const MAX_STORED_ATTEMPTS = 200;

/** Tempo "justo" para digitar cada letra além da primeira, usado no rótulo de desempenho. */
export const TYPING_MS_PER_EXTRA_CHAR = 120;

export const ALPHABET_OPTIONS: ReadonlyArray<{ id: KanaAlphabet; label: string; glyph: string }> = [
  { id: "hiragana", label: "Hiragana", glyph: "あ" },
  { id: "katakana", label: "Katakana", glyph: "ア" },
  { id: "mixed", label: "Ambos", glyph: "あア" },
];

export const MODE_OPTIONS: ReadonlyArray<{ id: TrainingMode; label: string }> = [
  { id: "quantity", label: "Quantidade" },
  { id: "timed", label: "Tempo" },
  { id: "free", label: "Livre" },
];

export const DIFFICULTY_OPTIONS: ReadonlyArray<{
  id: DojoDifficulty;
  label: string;
  rank: string;
  description: string;
}> = [
  { id: "genin", label: "Iniciante", rank: "下忍", description: "Mostra a família do kana." },
  { id: "chunin", label: "Intermediário", rank: "中忍", description: "Remove a dica da família." },
  { id: "jonin", label: "Avançado", rank: "上忍", description: "Sem dica e com pressão de combo." },
];

export const DEFAULT_DOJO_SETTINGS: DojoSettings = {
  alphabet: "hiragana",
  mode: "quantity",
  targetCount: 20,
  timeLimitSeconds: 60,
  difficulty: "genin",
  selectedGroupIds: [],
  focusMode: false,
};
