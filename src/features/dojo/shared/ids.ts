export function createId(): string {
  const cryptoApi = globalThis.crypto;
  // randomUUID só existe em contexto seguro (https/localhost); no celular via IP local não.
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") return cryptoApi.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
