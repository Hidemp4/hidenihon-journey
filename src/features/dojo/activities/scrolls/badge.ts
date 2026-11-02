import type { ActivityBadge } from "@/features/dojo/registry";
import { masteryStore, selectDueItems, type MasteryItems } from "@/features/dojo/shared/mastery";

export function describeScrollsBadge(items: MasteryItems, now: number): ActivityBadge {
  const due = selectDueItems(items, now).length;
  if (due > 0) return { text: `${due} para revisar hoje`, tone: "accent" };

  const scheduled = Object.values(items).some((record) => record.dueAt != null);
  return scheduled ? { text: "Tudo em dia", tone: "neutral" } : { text: "Nenhuma revisão ainda", tone: "neutral" };
}

export function getScrollsBadge(now: number): ActivityBadge {
  return describeScrollsBadge(masteryStore.getItems(), now);
}
