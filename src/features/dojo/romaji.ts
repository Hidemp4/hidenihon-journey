/**
 * Variantes de digitação aceitas além do romaji Hepburn guardado nos dados.
 * Ex.: し = "shi", mas quem digita em layout japonês escreve "si".
 */
const ROMAJI_ALIASES: Readonly<Record<string, readonly string[]>> = {
  shi: ["si"],
  chi: ["ti"],
  tsu: ["tu"],
  fu: ["hu"],
  ji: ["zi"],
  sha: ["sya"],
  shu: ["syu"],
  sho: ["syo"],
  cha: ["tya", "cya"],
  chu: ["tyu", "cyu"],
  cho: ["tyo", "cyo"],
  ja: ["zya", "jya"],
  ju: ["zyu", "jyu"],
  jo: ["zyo", "jyo"],
};

export type AnswerStatus = "correct" | "partial" | "wrong";

export function normalizeAnswer(value: string) {
  return value.trim().toLowerCase();
}

export function getAcceptedRomaji(romaji: string): string[] {
  const base = normalizeAnswer(romaji);
  return [base, ...(ROMAJI_ALIASES[base] ?? [])];
}

/**
 * - `correct`: bate com uma resposta aceita.
 * - `partial`: ainda é prefixo de uma resposta aceita (continue digitando).
 * - `wrong`: não pode mais virar uma resposta aceita (falha imediata).
 */
export function evaluateAnswer(romaji: string, input: string): AnswerStatus {
  const value = normalizeAnswer(input);
  const accepted = getAcceptedRomaji(romaji);

  if (accepted.includes(value)) return "correct";
  if (accepted.some((candidate) => candidate.startsWith(value))) return "partial";
  return "wrong";
}
