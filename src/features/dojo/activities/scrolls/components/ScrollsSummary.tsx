import { Shuffle, Undo2 } from "lucide-react";
import { MetricCard, Panel, SectionTitle } from "@/features/dojo/shared/components/ui";
import { PracticeXpPreview } from "@/features/dojo/progression/components/SessionRewards";
import { scrollsSummary } from "@/features/dojo/progression/summaries";
import { GRADE_OPTIONS } from "../constants";
import { describeReturn } from "../scheduler";
import { summarizeScrollSession } from "../summary";
import type { ScrollSession } from "../types";

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

interface ScrollsSummaryProps {
  session: ScrollSession;
  onClose: () => void;
  onStartFree: () => void;
  onUndo: () => void;
}

export function ScrollsSummary({ session, onClose, onStartFree, onUndo }: ScrollsSummaryProps) {
  const last = session.history[session.history.length - 1];
  // A referência de "hoje" é a última nota: o resumo não muda se a pessoa deixar a tela aberta.
  const summary = summarizeScrollSession(session, last?.gradedAt ?? 0, session.offsetAt);
  const review = session.mode === "review";

  return (
    <Panel>
      <SectionTitle eyebrow="Resumo" title={review ? "Pergaminhos guardados" : "Treino livre concluído"} />

      <h3 className="text-[11px] font-black uppercase tracking-[0.14em] text-journey-wood">Notas dadas</h3>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {GRADE_OPTIONS.map((option) => (
          <MetricCard key={option.id} label={option.label} value={String(summary.grades[option.id])} />
        ))}
      </div>

      <PracticeXpPreview summary={scrollsSummary(session)} />

      {review ? (
        <>
          <h3 className="mt-6 text-[11px] font-black uppercase tracking-[0.14em] text-journey-wood">Quando voltam</h3>
          <ul className="mt-2 space-y-1.5">
            {summary.upcoming.map(({ days, count }) => (
              <li key={days} className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-sm font-bold text-journey-ink">
                <span className="first-letter:uppercase">{describeReturn(days)}</span>
                <span>{plural(count, "carta", "cartas")}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-5 text-sm font-semibold text-journey-ink/75">O treino livre não muda os vencimentos, mas conta para o seu domínio dos caracteres.</p>
      )}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl border-2 border-journey-gold/60 bg-journey-orange px-5 text-sm font-black text-white shadow-[0_5px_0_hsl(var(--journey-orange)/.45)] transition hover:bg-journey-orange-hover active:translate-y-0.5 active:shadow-none"
        >
          Concluir
        </button>
        <button
          type="button"
          onClick={onStartFree}
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-journey-wood/20 bg-white px-5 text-sm font-black text-journey-ink transition hover:border-journey-orange/40"
        >
          <Shuffle size={16} aria-hidden="true" /> Treino livre
        </button>
        <button
          type="button"
          onClick={onUndo}
          aria-keyshortcuts="Z"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-journey-wood/15 bg-white/60 px-5 text-sm font-black text-journey-ink/80 transition hover:border-journey-orange/30 hover:text-journey-orange"
        >
          <Undo2 size={16} aria-hidden="true" /> Desfazer (Z)
        </button>
      </div>
    </Panel>
  );
}
