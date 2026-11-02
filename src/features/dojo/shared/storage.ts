/**
 * Acesso ao localStorage que nunca lança: o treino tem que funcionar mesmo sem armazenamento
 * (modo privado, cookies bloqueados, quota cheia). Quem chama decide o que fazer com `false`/`null`.
 */

/** Prefixo das chaves novas do dojô. As antigas (`hidenihon:kana-reaction:*`) continuam como estão. */
export const DOJO_STORAGE_PREFIX = "hidenihon:dojo:";

export function dojoStorageKey(name: string) {
  return `${DOJO_STORAGE_PREFIX}${name}`;
}

function getStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    // Acessar localStorage pode lançar SecurityError (cookies bloqueados, iframe etc.).
    return null;
  }
}

export function readRaw(key: string): string | null {
  try {
    return getStorage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeRaw(key: string, value: string): boolean {
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

export function readJson(key: string): unknown {
  const raw = readRaw(key);
  if (raw == null) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Grava o primeiro payload que couber. Os candidatos vêm do maior para o menor:
 * se a quota estourar, perder os dados mais antigos é melhor do que não salvar nada.
 * Os payloads são gerados sob demanda, então os menores só são serializados se precisar.
 */
export function writeFirstThatFits(key: string, payloads: Iterable<string>): boolean {
  for (const payload of payloads) {
    if (writeRaw(key, payload)) return true;
  }
  return false;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function pickOption<T>(options: readonly T[], value: unknown, fallback: T): T {
  return options.find((option) => option === value) ?? fallback;
}
