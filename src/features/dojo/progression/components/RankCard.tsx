import { useId } from "react";
import { ChevronRight, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { trophiesText } from "../copy";
import { RANKING_ROUTE } from "../routes";
import { useProgression } from "../useProgression";
import { LeagueEmblem } from "./LeagueEmblem";

/** Barra decorativa: o texto ao lado já diz o mesmo para o leitor de tela. */
export function MeterBar({ progress, tone }: { progress: number; tone: "gold" | "orange" }) {
  return (
    <span aria-hidden="true" className="block h-2.5 overflow-hidden rounded-full bg-white/15">
      <span
        className={`block h-full rounded-full motion-safe:transition-[width] motion-safe:duration-700 ${tone === "gold" ? "bg-journey-gold" : "bg-journey-orange"}`}
        style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }}
      />
    </span>
  );
}

/** Liga, troféus e nível no hub do Dojô, com o caminho para o ranking. */
export function RankCard() {
  const titleId = useId();
  const { standing, totals, level, meta } = useProgression();
  const missing = standing.nextFloor == null ? 0 : standing.nextFloor - totals.trophies;

  return (
    <section
      aria-labelledby={titleId}
      className="relative isolate mb-8 overflow-hidden rounded-[2rem] border-2 border-[hsl(var(--journey-wood-deep))] bg-journey-forest-deep p-5 text-white shadow-[0_8px_0_hsl(var(--journey-wood-deep)/.35)] sm:p-6"
    >
      <div aria-hidden="true" className="journey-leaf-pattern absolute inset-0 -z-10 opacity-15" />

      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center">
        <div className="flex items-center gap-4">
          <LeagueEmblem standing={standing} size="lg" />
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-journey-gold">
              Sua liga ·{" "}
              <span lang="ja" className="font-jp">
                {standing.league.jp}
              </span>
            </p>
            <h2 id={titleId} className="mt-1 font-display text-2xl font-black leading-none tracking-[-0.03em] sm:text-3xl">
              {standing.label}
            </h2>
            <p className="mt-2 flex items-center gap-1.5 text-sm font-black text-journey-gold">
              <Trophy size={16} strokeWidth={2.6} aria-hidden="true" /> {trophiesText(totals.trophies)}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-xs font-bold text-white/85">
              {standing.nextLabel ? `Faltam ${trophiesText(missing)} para ${standing.nextLabel}` : "Você está no topo da escada"}
            </p>
            <MeterBar progress={standing.progress} tone="gold" />
          </div>
          <div>
            <p className="mb-1.5 flex justify-between gap-3 text-xs font-bold text-white/85">
              <span>
                Nível <strong className="font-black text-white">{level.level}</strong>
              </span>
              <span>
                {level.intoLevel.toLocaleString("pt-BR")} de {level.forNext.toLocaleString("pt-BR")} XP
              </span>
            </p>
            <MeterBar progress={level.progress} tone="orange" />
          </div>
          <p className="text-xs font-semibold text-white/85">
            Para vencer uma partida agora: desempenho de <strong className="font-black text-white">{meta}%</strong> ou mais.
          </p>
        </div>

        <Link
          to={RANKING_ROUTE}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-journey-gold/60 bg-journey-orange px-5 text-sm font-black text-white shadow-[0_5px_0_hsl(var(--journey-orange)/.45)] transition hover:bg-journey-orange-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-journey-gold/60 active:translate-y-0.5 active:shadow-none"
        >
          Ver ranking <ChevronRight size={18} strokeWidth={2.6} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
