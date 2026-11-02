import type { ActivityBadge } from "@/features/dojo/registry";
import { loadLastExamResult, type LastExamResult } from "./examRepository";

export function describeExamBadge(last: LastExamResult | null): ActivityBadge {
  return last == null ? { text: "Nenhum exame ainda", tone: "neutral" } : { text: `Última nota ${last.score}%`, tone: "accent" };
}

export function getExamBadge(): ActivityBadge {
  return describeExamBadge(loadLastExamResult());
}
