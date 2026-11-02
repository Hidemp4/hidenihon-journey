import { pickWeighted, type Rng } from "@/features/dojo/shared/components/arena/rng";
import type { MasteryItems, MasteryRecord } from "@/features/dojo/shared/mastery";
import type { StudyItem } from "@/features/dojo/shared/studyItem";
import { FREE_TRAINING_SIZE } from "./constants";
import type { ScrollCard } from "./types";

function isScheduled(record: MasteryRecord | undefined): record is MasteryRecord & { dueAt: number } {
  return record?.dueAt != null;
}

function toCard(item: StudyItem, record: MasteryRecord | undefined): ScrollCard {
  return { key: item.id, item, isNew: !isScheduled(record) };
}

interface QueueContext {
  /** Cartas do baralho atual (alfabeto + grupos escolhidos). */
  items: readonly StudyItem[];
  records: MasteryItems;
  now: number;
  newPerDay: number;
  /** Novos já apresentados hoje (em outras sessões do mesmo dia). */
  introducedToday: number;
}

function splitDeck({ items, records, now, newPerDay, introducedToday }: QueueContext) {
  const scheduled = items.flatMap((item) => {
    const record = records[item.id];
    return isScheduled(record) ? [{ item, dueAt: record.dueAt, box: record.box }] : [];
  });

  const due = scheduled
    .filter((entry) => entry.dueAt <= now)
    // Mais atrasado primeiro; empate: caixa menor (a última nota foi pior). O sort é estável: depois vale a ordem do baralho.
    .sort((a, b) => a.dueAt - b.dueAt || a.box - b.box)
    .map((entry) => entry.item);

  // Novos na ordem do baralho (あいうえお...): é a ordem em que se aprende.
  const allNew = items.filter((item) => !isScheduled(records[item.id]));
  const fresh = allNew.slice(0, Math.max(0, newPerDay - introducedToday));
  const nextDueAt = scheduled.reduce<number | null>(
    (next, entry) => (entry.dueAt > now && (next == null || entry.dueAt < next) ? entry.dueAt : next),
    null
  );

  return { due, fresh, allNew, nextDueAt };
}

export interface ReviewAvailability {
  due: number;
  /** Novos que ainda cabem no limite de hoje. */
  fresh: number;
  /** Novos que existem no baralho (independente do limite). */
  unseen: number;
  /** Próximo vencimento futuro, para a tela de "tudo revisado". */
  nextDueAt: number | null;
}

export function countReviewAvailability(context: QueueContext): ReviewAvailability {
  const { due, fresh, allNew, nextDueAt } = splitDeck(context);
  return { due: due.length, fresh: fresh.length, unseen: allNew.length, nextDueAt };
}

/** Fila da revisão: vencidos (mais atrasados primeiro) + novos até o limite do dia. */
export function buildReviewQueue(context: QueueContext): ScrollCard[] {
  const { due, fresh } = splitDeck(context);
  return [...due, ...fresh].map((item) => toCard(item, context.records[item.id]));
}

/**
 * Treino livre: ignora a agenda e sorteia sem repetir, com peso do domínio
 * (quem erra mais aparece mais). Sem histórico, todos têm peso 1.
 */
export function buildFreeQueue({
  items,
  records,
  weights,
  rng,
  size = FREE_TRAINING_SIZE,
}: {
  items: readonly StudyItem[];
  records: MasteryItems;
  weights: ReadonlyMap<string, number>;
  rng: Rng;
  size?: number;
}): ScrollCard[] {
  const pool = [...items];
  const drawn: StudyItem[] = [];

  while (pool.length > 0 && drawn.length < size) {
    const item = pickWeighted(rng, pool.map((candidate) => [candidate, weights.get(candidate.id) ?? 1] as const));
    if (!item) break;
    drawn.push(item);
    pool.splice(pool.indexOf(item), 1);
  }

  return drawn.map((item) => toCard(item, records[item.id]));
}
