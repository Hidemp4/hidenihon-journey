import { useId } from "react";
import { Check, Flame, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { getActivity } from "./registry";
import type { Streak } from "./shared/activityLog";
import type { MissionProgress, MissionTaskProgress } from "./shared/dailyMission";

function days(count: number) {
  return `${count} ${count === 1 ? "dia" : "dias"}`;
}

function streakHint(streak: Streak) {
  if (streak.activeToday) return "Treino de hoje feito. Volte amanhã para continuar.";
  if (streak.current > 0) return "Treine hoje para não perder a sequência.";
  return "Qualquer treino hoje começa uma sequência.";
}

function TaskLink({ progress }: { progress: MissionTaskProgress }) {
  const { task, done, complete } = progress;
  const activity = getActivity(task.activity);
  const percent = Math.round((done / task.target) * 100);

  return (
    <Link
      to={activity.route}
      className={`flex min-h-16 flex-col justify-center gap-2 rounded-xl border-2 px-3 py-2.5 outline-none transition focus-visible:ring-4 focus-visible:ring-journey-orange/40 ${
        complete ? "border-journey-leaf bg-journey-leaf/10" : "border-journey-wood/15 bg-white hover:border-journey-orange/50"
      }`}
    >
      <span className="flex items-center justify-between gap-2 text-sm font-black text-journey-ink">
        <span>{task.label}</span>
        <span aria-hidden="true" className="inline-flex shrink-0 items-center gap-1 text-xs text-journey-ink/80">
          {complete && <Check size={14} strokeWidth={3} className="text-journey-leaf" />}
          {done}/{task.target}
        </span>
        <span className="sr-only">
          {" "}
          ({done} de {task.target}
          {complete ? ", concluída" : ""})
        </span>
      </span>
      <span aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-journey-wood/10">
        <span className={`block h-full rounded-full ${complete ? "bg-journey-leaf" : "bg-journey-orange"}`} style={{ width: `${percent}%` }} />
      </span>
    </Link>
  );
}

/** Missão do dia + sequência de dias: o que o hub mostra antes dos cards. */
export function HubMission({ mission, streak }: { mission: MissionProgress; streak: Streak }) {
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className="mb-8 rounded-2xl border-2 border-journey-wood/15 bg-white/85 p-5 shadow-[0_5px_0_hsl(var(--journey-wood)/.12)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-journey-orange">
            <Target size={14} aria-hidden="true" /> Missão do dia
          </p>
          <h2 id={titleId} className="mt-1.5 font-display text-lg font-black tracking-[-0.025em] text-journey-ink">
            {mission.complete ? "Missão cumprida!" : `${mission.completed} de ${mission.tasks.length} tarefas feitas hoje`}
          </h2>
        </div>
        <div className="rounded-xl border-2 border-journey-wood/15 bg-journey-sand px-3 py-2 text-right">
          <p className="flex items-center justify-end gap-1.5 text-sm font-black text-journey-ink">
            <Flame size={16} aria-hidden="true" className={streak.current > 0 ? "text-journey-orange" : "text-journey-wood/60"} />
            Sequência: {days(streak.current)}
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-journey-ink/75">Melhor: {days(streak.best)}</p>
        </div>
      </div>
      <p className="mt-2 text-xs font-semibold text-journey-ink/75">{streakHint(streak)}</p>

      <ol aria-label="Tarefas da missão" className="mt-4 grid gap-2 md:grid-cols-3">
        {mission.tasks.map((progress) => (
          <li key={progress.task.activity}>
            <TaskLink progress={progress} />
          </li>
        ))}
      </ol>
    </section>
  );
}
