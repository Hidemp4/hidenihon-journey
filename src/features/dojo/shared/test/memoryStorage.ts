/** localStorage em memória para os testes; `failOnSet` simula quota cheia. */
export function createMemoryStorage(options: { failOnSet?: (value: string) => boolean } = {}) {
  const data = new Map<string, string>();

  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (options.failOnSet?.(value)) throw new Error("QuotaExceededError");
      data.set(key, value);
    },
    removeItem: (key: string) => void data.delete(key),
  };
}
