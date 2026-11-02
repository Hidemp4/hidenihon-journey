import type { BrushCard, BrushSession, TraceFeedback } from "./types";

/**
 * Texto do retorno de cada traço no modo Traçar (também é o anúncio para leitor de tela).
 * Começa pelo kana e traz a tentativa: o texto nunca se repete igual, então sempre é lido.
 */
export function traceFeedbackMessage(card: BrushCard, feedback: TraceFeedback | null): string {
  if (!feedback) return "";
  const total = card.glyph.strokes.length;
  const stroke = `traço ${feedback.strokeIndex + 1} de ${total}`;
  const retry = feedback.attempt > 1 ? ` (${feedback.attempt}ª tentativa)` : "";
  const { verdict } = feedback;

  switch (verdict.kind) {
    case "ok":
      return feedback.strokeIndex + 1 === total
        ? `${card.item.char}: ${stroke} certo. ${card.item.kind === "kanji" ? "Kanji" : "Kana"} completo!`
        : `${card.item.char}: ${stroke} certo.`;
    case "reversed":
      return `${card.item.char}: ${stroke} na direção contrária. Comece do outro lado${retry}.`;
    case "wrong-order":
      return verdict.matched < feedback.strokeIndex
        ? `${card.item.char}: esse é o traço ${verdict.matched + 1}, que já está feito. Agora é o ${stroke}${retry}.`
        : `${card.item.char}: esse é o traço ${verdict.matched + 1}. Agora é o ${stroke}${retry}.`;
    case "shape":
      return `${card.item.char}: não parece o ${stroke}. Siga o guia laranja${retry}.`;
    default:
      return "";
  }
}

export interface BrushSummary {
  /** Kana desenhados e avaliados (Traçar e De memória). */
  practiced: number;
  correct: number;
  /** Média das notas automáticas; `null` sem nenhuma. */
  averageScore: number | null;
}

export function summarizeBrushSession(session: Pick<BrushSession, "attempts">): BrushSummary {
  const graded = session.attempts.filter((attempt) => attempt.outcome != null);
  const scores = graded.flatMap((attempt) => (attempt.score ? [attempt.score.score] : []));
  return {
    practiced: graded.length,
    correct: graded.filter((attempt) => attempt.outcome === "correct").length,
    averageScore: scores.length > 0 ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null,
  };
}
