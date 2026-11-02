import { Gauge, RotateCcw, Target } from "lucide-react";
import { MetricCard, Panel, SectionTitle } from "@/features/dojo/shared/components/ui";
import { formatMs } from "@/features/dojo/shared/format";
import { summarizeExamRun } from "../results";
import type { ExamRun } from "../types";

interface ExamResultProps {
  run: ExamRun;
  storageWarning: boolean;
  onReviewMisses: () => void;
  onRestart: () => void;
  onClose: () => void;
}

export function ExamResult({ run, storageWarning, onReviewMisses, onRestart, onClose }: ExamResultProps) {
  const result = summarizeExamRun(run);
  const title = run.review ? "Revisão dos erros" : run.mode === "survival" ? `Você chegou à pergunta ${result.total}` : "Resultado do exame";

  return (
    <Panel>
      <SectionTitle eyebrow="Resultado" title={title} />

      <p className="text-center font-display text-7xl font-black tracking-[-0.05em] text-journey-ink">
        {result.score}
        <span className="text-4xl">%</span>
      </p>
      <p className="mt-1 text-center text-sm font-bold text-journey-ink/75">
        {result.correct} de {result.total} {result.total === 1 ? "pergunta" : "perguntas"}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <MetricCard label="Acertos" value={`${result.correct}/${result.total}`} icon={<Target size={15} aria-hidden="true" />} />
        <MetricCard label="Tempo médio" value={formatMs(result.averageMs)} icon={<Gauge size={15} aria-hidden="true" />} />
      </div>

      <h3 className="mt-6 text-[11px] font-black uppercase tracking-[0.14em] text-journey-wood">Erros</h3>
      {result.misses.length === 0 ? (
        <p className="mt-2 text-sm font-semibold text-journey-ink/75">Nenhum erro. Exame aprovado!</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {result.misses.map((miss) => (
            <li key={miss.questionId} className="flex items-center justify-between gap-3 rounded-xl border border-journey-wood/10 bg-white/80 px-3 py-2">
              <span className="text-sm font-bold text-journey-ink">
                <span lang="ja" className="mr-2 font-jp text-2xl font-black">
                  {miss.char}
                </span>
                {miss.answer}
              </span>
              <span className="text-right text-xs font-semibold text-journey-ink/75">
                {miss.chosen == null ? "Tempo esgotado" : `Você marcou ${miss.chosen}`}
              </span>
            </li>
          ))}
        </ul>
      )}

      {storageWarning && (
        <p className="mt-4 rounded-xl bg-journey-sand px-3 py-2 text-xs font-semibold text-journey-ink" role="alert">
          Não foi possível salvar o resultado neste navegador. O exame continua funcionando normalmente.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        {result.misses.length > 0 && (
          <button
            type="button"
            onClick={onReviewMisses}
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl border-2 border-journey-gold/60 bg-journey-orange px-5 text-sm font-black text-white shadow-[0_5px_0_hsl(var(--journey-orange)/.45)] transition hover:bg-journey-orange-hover active:translate-y-0.5 active:shadow-none"
          >
            Revisar só os erros
          </button>
        )}
        <button
          type="button"
          onClick={onRestart}
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-journey-wood/20 bg-white px-5 text-sm font-black text-journey-ink transition hover:border-journey-orange/40"
        >
          <RotateCcw size={16} aria-hidden="true" /> Novo exame
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl border-2 border-journey-wood/15 bg-white/60 px-5 text-sm font-black text-journey-ink/80 transition hover:border-journey-orange/30"
        >
          Concluir
        </button>
      </div>
    </Panel>
  );
}
