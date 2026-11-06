import { useEffect, useRef } from "react";
import { Brush, Target } from "lucide-react";
import { MetricCard, Panel } from "@/features/dojo/shared/components/ui";
import { answerOf } from "@/features/dojo/shared/content";
import { SessionRewards } from "@/features/dojo/progression/components/SessionRewards";
import { SELF_GRADE_OPTIONS } from "../constants";
import { summarizeBrushSession } from "../messages";
import type { BrushAttempt, BrushSession } from "../types";

function attemptDetail(attempt: BrushAttempt): string {
  const score = attempt.score ? `nota ${attempt.score.score}` : "sem nota";
  if (attempt.mode === "recall") return `${score} · ${SELF_GRADE_OPTIONS.find(({ id }) => id === attempt.grade)?.label ?? ""}`;
  if (attempt.orderErrors > 0) return `${score} · ${attempt.orderErrors} ${attempt.orderErrors === 1 ? "erro" : "erros"} de ordem/direção`;
  return attempt.corrections > 0 ? `${score} · ${attempt.corrections} ${attempt.corrections === 1 ? "correção" : "correções"} de forma` : `${score} · sem correções`;
}

interface BrushSummaryProps {
  session: BrushSession;
  storageWarning: boolean;
  onRestart: () => void;
  onClose: () => void;
}

export function BrushSummary({ session, storageWarning, onRestart, onClose }: BrushSummaryProps) {
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const summary = summarizeBrushSession(session);
  const study = session.mode === "study";

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <Panel>
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-journey-orange">Resumo</p>
      <h2 ref={headingRef} tabIndex={-1} className="mt-1.5 rounded-lg font-display text-2xl font-black tracking-[-0.03em] text-journey-ink outline-none focus-visible:ring-4 focus-visible:ring-journey-orange/40">
        {study ? "Estudo da ordem concluído" : "Sessão de escrita concluída"}
      </h2>

      {study ? (
        <p className="mt-3 text-sm font-semibold text-journey-ink/80">
          Você viu a ordem dos traços de {session.attempts.length} {session.cards[0]?.item.kind === "kanji" ? "kanji" : "kana"}. Para treinar a mão, experimente o modo Traçar.
        </p>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3">
          <MetricCard label="Acertos" value={`${summary.correct}/${summary.practiced}`} icon={<Target size={15} aria-hidden="true" />} />
          <MetricCard label="Nota média" value={summary.averageScore == null ? "—" : String(summary.averageScore)} icon={<Brush size={15} aria-hidden="true" />} />
        </div>
      )}

      <SessionRewards activity="brush" sessionId={session.id} />

      <ul className="mt-5 space-y-2">
        {session.attempts.map((attempt) => (
          <li key={attempt.card.key} className="flex items-center justify-between gap-3 rounded-xl border border-journey-wood/10 bg-white/80 px-3 py-2">
            <span className="text-sm font-bold text-journey-ink">
              <span lang="ja" className="mr-2 font-jp text-2xl font-black">
                {attempt.card.item.char}
              </span>
              {answerOf(attempt.card.item)}
            </span>
            <span className="text-right text-xs font-semibold text-journey-ink/75">
              {study ? `${attempt.card.glyph.strokes.length} traços` : attemptDetail(attempt)}
              {attempt.outcome && <span className="sr-only">{attempt.outcome === "correct" ? ", acerto" : ", erro"}</span>}
            </span>
          </li>
        ))}
      </ul>

      {storageWarning && (
        <p className="mt-4 rounded-xl bg-journey-sand px-3 py-2 text-xs font-semibold text-journey-ink" role="alert">
          Não foi possível salvar o progresso neste navegador. O treino continua funcionando normalmente.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onRestart}
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-journey-gold/60 bg-journey-orange px-5 text-sm font-black text-white shadow-[0_5px_0_hsl(var(--journey-orange)/.45)] transition hover:bg-journey-orange-hover active:translate-y-0.5 active:shadow-none"
        >
          <Brush size={16} aria-hidden="true" /> Nova sessão
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl border-2 border-journey-wood/20 bg-white px-5 text-sm font-black text-journey-ink transition hover:border-journey-orange/40"
        >
          Concluir
        </button>
      </div>
    </Panel>
  );
}
