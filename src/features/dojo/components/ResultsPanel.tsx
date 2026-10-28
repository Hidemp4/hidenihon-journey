import { Flame, Gauge, Target } from "lucide-react";
import { DojoStatsIcon } from "@/components/navigation/FloatingLearningNav";
import { formatMs, formatSessionDate } from "../format";
import { getPerformanceLabel } from "../metrics";
import type { DojoAttempt, DojoSession, DojoStats } from "../types";
import { MetricCard, Panel, SectionTitle } from "./ui";

function LastAttempt({ attempt }: { attempt: DojoAttempt }) {
  const ok = attempt.outcome === "correct";
  const tone = ok ? "border-emerald-700/15 bg-emerald-50" : "border-red-700/15 bg-red-50";
  const titleTone = ok ? "text-emerald-800" : "text-red-800";

  const title = ok ? "Correto" : attempt.outcome === "timeout" ? "Tempo esgotado" : "Revisar";
  const detail = ok
    ? `${getPerformanceLabel(attempt.completionMs, attempt.romaji.length)} · reação ${formatMs(attempt.reactionMs)}`
    : attempt.outcome === "timeout"
      ? "Nenhuma resposta dentro do limite."
      : `Você digitou “${attempt.answer}”.`;

  return (
    <div className={`flex items-center justify-between gap-3 rounded-2xl border p-4 ${tone}`}>
      <div>
        <p className={`text-xs font-black ${titleTone}`}>{title}</p>
        <p className="mt-1 text-xs font-semibold text-journey-ink/70">{detail}</p>
      </div>
      <div className="shrink-0 font-black text-journey-ink">
        <span className="mr-1 font-jp text-3xl">{attempt.kana}</span> {attempt.romaji}
      </div>
    </div>
  );
}

interface ResultsPanelProps {
  session: DojoSession;
  stats: DojoStats;
  justFinished: boolean;
  storageWarning: boolean;
}

export function ResultsPanel({ session, stats, justFinished, storageWarning }: ResultsPanelProps) {
  const lastAttempt = session.attempts[session.attempts.length - 1];
  const date = formatSessionDate(session.finishedAt ?? session.startedAt);

  return (
    <Panel>
      <SectionTitle
        icon={<DojoStatsIcon />}
        eyebrow="Desempenho"
        title={justFinished ? "Resultado da missão" : `Última sessão${date ? ` · ${date}` : ""}`}
      />

      {lastAttempt && <LastAttempt attempt={lastAttempt} />}

      <div className="mt-3 grid grid-cols-2 gap-3">
        <MetricCard label="Acertos" value={`${stats.correct}/${stats.total}`} icon={<Target size={15} />} />
        <MetricCard label="Mais rápido" value={formatMs(stats.fastestCompletionMs)} icon={<Gauge size={15} />} />
      </div>

      {stats.timeouts > 0 && (
        <p className="mt-3 text-xs font-semibold text-journey-ink/70">
          {stats.timeouts} {stats.timeouts === 1 ? "resposta esgotou" : "respostas esgotaram"} o tempo.
        </p>
      )}

      <div className="mt-5 border-t border-journey-wood/10 pt-5">
        <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-journey-orange">
          <Flame size={14} /> Kana para reforçar
        </p>
        {stats.weakKana.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {stats.weakKana.map((item) => (
              <span
                key={`${item.kana}-${item.romaji}`}
                className="rounded-full border border-journey-wood/10 bg-journey-sand px-3 py-2 text-xs font-extrabold text-journey-ink/80"
              >
                <span className="mr-1 font-jp text-base text-journey-ink">{item.kana}</span> {item.romaji} · {item.misses}{" "}
                {item.misses === 1 ? "erro" : "erros"}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs font-semibold text-journey-ink/70">Nenhum erro nesta sessão.</p>
        )}
      </div>

      {storageWarning && (
        <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-800" role="alert">
          Não foi possível salvar o histórico neste navegador. O treino continua funcionando normalmente.
        </p>
      )}
    </Panel>
  );
}
