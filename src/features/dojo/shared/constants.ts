import type { KanaAlphabet } from "./kanaDeck";

export const DOJO_HUB_ROUTE = "/dojo";

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

export const ALPHABET_OPTIONS: ReadonlyArray<{ id: KanaAlphabet; label: string; glyph: string }> = [
  { id: "hiragana", label: "Hiragana", glyph: "あ" },
  { id: "katakana", label: "Katakana", glyph: "ア" },
  { id: "mixed", label: "Ambos", glyph: "あア" },
];
