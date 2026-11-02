import { pickWeighted, type Rng } from "./components/arena/rng";

/** Fisher–Yates com rng injetado (testes usam semente fixa). Não altera a lista original. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

/**
 * Sorteia evitando os últimos sorteados (mesma janela da Arena) e com peso opcional.
 * Nunca bloqueia o baralho inteiro: sempre sobra pelo menos um item diferente dos recentes.
 */
export function pickAvoidingRecent<T>(
  items: readonly T[],
  keyOf: (item: T) => string,
  recentKeys: readonly string[],
  rng: Rng,
  weightOf: (item: T) => number = () => 1
): T | null {
  if (items.length === 0) return null;
  if (items.length === 1) return items[0];

  const windowSize = Math.min(Math.max(3, Math.floor(items.length / 3)), 8, items.length - 1);
  const blocked = new Set(recentKeys.slice(-windowSize));
  const available = items.filter((item) => !blocked.has(keyOf(item)));
  const candidates = available.length > 0 ? available : items;

  return pickWeighted(rng, candidates.map((item) => [item, Math.max(0.0001, weightOf(item))] as const)) ?? candidates[0];
}

/**
 * Sorteia até `count` itens diferentes, com peso, sem reposição (quem pesa mais tende a sair primeiro).
 * Não altera a lista original.
 */
export function sampleWeighted<T>(items: readonly T[], count: number, rng: Rng, weightOf: (item: T) => number = () => 1): T[] {
  const pool = [...items];
  const chosen: T[] = [];
  while (chosen.length < count && pool.length > 0) {
    const pick = pickWeighted(rng, pool.map((item, index) => [index, Math.max(0.0001, weightOf(item))] as const)) ?? 0;
    chosen.push(pool[pick]);
    pool.splice(pick, 1);
  }
  return chosen;
}
