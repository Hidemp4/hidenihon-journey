import { isStudyItemId } from "./studyItem";
import { dojoStorageKey, isFiniteNumber, isRecord, readJson, writeFirstThatFits } from "./storage";

/**
 * Registro de domínio comum a todas as atividades: cada resposta dada em qualquer treino
 * alimenta o mesmo histórico por item, e os sorteios/revisões partem daqui.
 */

export type MasteryOutcome = "correct" | "wrong";

export const LEITNER_MIN_BOX = 1;
export const LEITNER_MAX_BOX = 5;

/** Pesos no mesmo intervalo do `buildMissWeights` da Arena, para dar para trocar um pelo outro. */
export const MASTERY_MIN_WEIGHT = 1;
export const MASTERY_MAX_WEIGHT = 5;

/** Média móvel: o tempo recente pesa mais, porque é ele que mostra o nível atual da pessoa. */
const AVG_MS_SMOOTHING = 0.3;

/** Kana + ~2000 kanji cabem com folga; acima disso o mais antigo sai primeiro. */
const MAX_ITEMS = 2_000;
const FALLBACK_ITEM_LIMITS = [MAX_ITEMS, 1_000, 500, 200] as const;
const MAX_ITEM_ID_LENGTH = 64;
/** Quantos lotes recentes lembramos para não contar a mesma sessão duas vezes. */
const MAX_RECENT_SOURCES = 50;

const STORAGE_VERSION = 1;
const STORAGE_KEY = dojoStorageKey(`mastery:v${STORAGE_VERSION}`);

export interface MasteryRecord {
  seen: number;
  correct: number;
  /** Acertos seguidos (zera no erro). */
  streak: number;
  /** Epoch em ms; `null` se nunca foi visto. */
  lastSeenAt: number | null;
  /** Caixa de Leitner (1–5). Só os Pergaminhos mudam a caixa. */
  box: number;
  /** Epoch em ms da próxima revisão; `null` = ainda não entrou na agenda (é "novo" nos Pergaminhos). */
  dueAt: number | null;
  /** Média (móvel) dos tempos de acerto. */
  avgMs: number | null;
}

export type MasteryItems = Readonly<Record<string, MasteryRecord>>;

export interface MasteryState {
  items: MasteryItems;
  /** Ids dos lotes já gravados (ex.: id da sessão), do mais novo para o mais antigo. */
  recentSources: readonly string[];
}

export interface MasteryResult {
  itemId: string;
  outcome: MasteryOutcome;
  /** Tempo de resposta; só entra na média quando a resposta foi certa. */
  ms?: number | null;
  /** Nova caixa e vencimento de Leitner. Só os Pergaminhos (revisão) mandam; o resto não mexe na agenda. */
  schedule?: { box: number; dueAt: number };
}

export interface MasteryDueItem {
  itemId: string;
  dueAt: number;
  box: number;
}

export interface MasterySummary {
  itemsSeen: number;
  attempts: number;
  correct: number;
  /** 0–100 */
  accuracy: number;
  due: number;
}

export const EMPTY_MASTERY: MasteryState = { items: {}, recentSources: [] };

export function createMasteryRecord(): MasteryRecord {
  return { seen: 0, correct: 0, streak: 0, lastSeenAt: null, box: LEITNER_MIN_BOX, dueAt: null, avgMs: null };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

// ---- lógica pura -------------------------------------------------------------

export function applyResult(record: MasteryRecord, result: MasteryResult, now: number): MasteryRecord {
  const correct = result.outcome === "correct";
  const ms = result.ms != null && isFiniteNumber(result.ms) && result.ms >= 0 ? result.ms : null;
  // Tempo de erro não diz nada sobre velocidade (chute rápido ou desistência), igual às métricas da Arena.
  const avgMs =
    correct && ms != null
      ? Math.round(record.avgMs == null ? ms : record.avgMs * (1 - AVG_MS_SMOOTHING) + ms * AVG_MS_SMOOTHING)
      : record.avgMs;

  const schedule = result.schedule;
  const validSchedule =
    schedule != null && isFiniteNumber(schedule.dueAt) && schedule.dueAt >= 0 && isFiniteNumber(schedule.box);

  return {
    ...record,
    seen: record.seen + 1,
    correct: record.correct + (correct ? 1 : 0),
    streak: correct ? record.streak + 1 : 0,
    lastSeenAt: now,
    avgMs,
    ...(validSchedule
      ? { box: clamp(Math.round(schedule.box), LEITNER_MIN_BOX, LEITNER_MAX_BOX), dueAt: schedule.dueAt }
      : {}),
  };
}

/** `sourceId` torna a gravação idempotente: o mesmo lote aplicado duas vezes conta uma vez só. */
export function applyResults(
  state: MasteryState,
  results: readonly MasteryResult[],
  now: number,
  sourceId?: string
): MasteryState {
  if (sourceId != null && state.recentSources.includes(sourceId)) return state;

  const items: Record<string, MasteryRecord> = { ...state.items };
  for (const result of results) {
    if (!isStudyItemId(result.itemId)) continue;
    items[result.itemId] = applyResult(items[result.itemId] ?? createMasteryRecord(), result, now);
  }

  const recentSources =
    sourceId == null ? state.recentSources : [sourceId, ...state.recentSources].slice(0, MAX_RECENT_SOURCES);

  return { items, recentSources };
}

/**
 * Quem erra muito volta mais vezes; uma sequência de acertos "acalma" o item.
 * Item nunca visto fica fora do mapa (o sorteio usa o peso padrão 1).
 */
export function masteryWeight(record: MasteryRecord): number {
  if (record.seen === 0) return MASTERY_MIN_WEIGHT;

  const errorRate = (record.seen - record.correct) / record.seen;
  const raw = MASTERY_MIN_WEIGHT + errorRate * (MASTERY_MAX_WEIGHT - MASTERY_MIN_WEIGHT) - Math.min(record.streak, 4) * 0.5;
  return clamp(raw, MASTERY_MIN_WEIGHT, MASTERY_MAX_WEIGHT);
}

export function computeWeights(items: MasteryItems): Map<string, number> {
  const weights = new Map<string, number>();
  for (const [itemId, record] of Object.entries(items)) {
    if (record.seen > 0) weights.set(itemId, masteryWeight(record));
  }
  return weights;
}

/** Itens agendados que já venceram, o mais atrasado primeiro (empate: caixa menor, depois id). */
export function selectDueItems(items: MasteryItems, now: number): MasteryDueItem[] {
  return Object.entries(items)
    .flatMap(([itemId, record]) =>
      record.dueAt != null && record.dueAt <= now ? [{ itemId, dueAt: record.dueAt, box: record.box }] : []
    )
    .sort((a, b) => a.dueAt - b.dueAt || a.box - b.box || a.itemId.localeCompare(b.itemId));
}

export function summarizeMastery(items: MasteryItems, now: number): MasterySummary {
  let itemsSeen = 0;
  let attempts = 0;
  let correct = 0;
  let due = 0;

  for (const record of Object.values(items)) {
    if (record.seen > 0) itemsSeen += 1;
    attempts += record.seen;
    correct += record.correct;
    if (record.dueAt != null && record.dueAt <= now) due += 1;
  }

  return {
    itemsSeen,
    attempts,
    correct,
    accuracy: attempts === 0 ? 0 : Math.round((correct / attempts) * 100),
    due,
  };
}

/** Mantém os `limit` itens vistos mais recentemente (os nunca vistos saem antes). */
export function trimMasteryItems(items: MasteryItems, limit: number): MasteryItems {
  const entries = Object.entries(items);
  if (entries.length <= limit) return items;

  entries.sort(([idA, a], [idB, b]) => (b.lastSeenAt ?? -1) - (a.lastSeenAt ?? -1) || idA.localeCompare(idB));
  return Object.fromEntries(entries.slice(0, limit));
}

// ---- validação do que vem do disco -------------------------------------------

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function readCount(value: unknown, max = Number.MAX_SAFE_INTEGER): number {
  return isNonNegativeInteger(value) ? Math.min(value, max) : 0;
}

function readTimestamp(value: unknown): number | null {
  return isFiniteNumber(value) && value >= 0 ? value : null;
}

/** Campo a campo: um campo estragado vira o padrão sem descartar o resto do item. */
export function sanitizeMasteryRecord(raw: unknown): MasteryRecord | null {
  if (!isRecord(raw)) return null;

  const seen = readCount(raw.seen);
  return {
    seen,
    correct: readCount(raw.correct, seen),
    streak: readCount(raw.streak, seen),
    lastSeenAt: readTimestamp(raw.lastSeenAt),
    box: isNonNegativeInteger(raw.box) && raw.box >= LEITNER_MIN_BOX && raw.box <= LEITNER_MAX_BOX ? raw.box : LEITNER_MIN_BOX,
    dueAt: readTimestamp(raw.dueAt),
    avgMs: readTimestamp(raw.avgMs),
  };
}

export function sanitizeMastery(raw: unknown): MasteryState {
  if (!isRecord(raw) || raw.version !== STORAGE_VERSION || !isRecord(raw.items)) return EMPTY_MASTERY;

  const items: Record<string, MasteryRecord> = {};
  for (const [itemId, value] of Object.entries(raw.items)) {
    if (itemId.length > MAX_ITEM_ID_LENGTH || !isStudyItemId(itemId)) continue;
    const record = sanitizeMasteryRecord(value);
    if (record) items[itemId] = record;
  }

  const recentSources = Array.isArray(raw.recentSources)
    ? raw.recentSources
        .filter((id): id is string => typeof id === "string" && id.length <= MAX_ITEM_ID_LENGTH)
        .slice(0, MAX_RECENT_SOURCES)
    : [];

  return { items: trimMasteryItems(items, MAX_ITEMS), recentSources };
}

// ---- persistência ------------------------------------------------------------

export function loadMastery(): MasteryState {
  return sanitizeMastery(readJson(STORAGE_KEY));
}

function* masteryPayloads(state: MasteryState) {
  for (const limit of FALLBACK_ITEM_LIMITS) {
    yield JSON.stringify({
      version: STORAGE_VERSION,
      items: trimMasteryItems(state.items, limit),
      recentSources: state.recentSources,
    });
  }
}

/** Retorna `false` se não deu para gravar nem com menos itens (o treino segue normalmente). */
export function saveMastery(state: MasteryState): boolean {
  return writeFirstThatFits(STORAGE_KEY, masteryPayloads(state));
}

export interface MasteryStore {
  recordResult(itemId: string, outcome: MasteryOutcome, ms?: number | null, now?: number): boolean;
  /** Grava um lote (ex.: uma sessão inteira) com uma leitura e uma escrita só. */
  recordResults(results: readonly MasteryResult[], options?: { now?: number; sourceId?: string }): boolean;
  getRecord(itemId: string): MasteryRecord | null;
  /** Todos os registros (para montar filas que cruzam o baralho com a agenda). */
  getItems(): MasteryItems;
  getWeights(): Map<string, number>;
  getDueItems(now?: number): MasteryDueItem[];
  getSummary(now?: number): MasterySummary;
}

/**
 * O relógio entra por parâmetro (testes usam um fixo). Cada chamada relê o disco:
 * são poucos KB e assim duas abas/atividades nunca trabalham com uma cópia velha.
 */
export function createMasteryStore({ clock = Date.now }: { clock?: () => number } = {}): MasteryStore {
  function recordResults(results: readonly MasteryResult[], options: { now?: number; sourceId?: string } = {}) {
    if (results.length === 0) return true;

    const current = loadMastery();
    const next = applyResults(current, results, options.now ?? clock(), options.sourceId);
    return next === current ? true : saveMastery(next);
  }

  return {
    recordResults,
    recordResult: (itemId, outcome, ms, now) => recordResults([{ itemId, outcome, ms }], { now }),
    getRecord: (itemId) => loadMastery().items[itemId] ?? null,
    getItems: () => loadMastery().items,
    getWeights: () => computeWeights(loadMastery().items),
    getDueItems: (now = clock()) => selectDueItems(loadMastery().items, now),
    getSummary: (now = clock()) => summarizeMastery(loadMastery().items, now),
  };
}

export const masteryStore = createMasteryStore();
