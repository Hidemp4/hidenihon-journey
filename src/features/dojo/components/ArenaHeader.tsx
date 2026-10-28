import type { ReactNode } from "react";
import { Zap } from "lucide-react";
import { formatMs } from "../format";
import type { DojoStats } from "../types";
import { NinjaArena } from "./NinjaArena";
import { StatTile } from "./ui";

interface ArenaHeaderProps {
  /** Em treino o cabeçalho encolhe e vira só a arena com o placar. */
  compact: boolean;
  stats: DojoStats;
  audioToggle: ReactNode;
  reduceMotion: boolean;
}

export function ArenaHeader({ compact, stats, audioToggle, reduceMotion }: ArenaHeaderProps) {
  return (
    <header className="relative isolate overflow-hidden border-b-[6px] border-[hsl(var(--journey-wood-deep))] bg-journey-forest-deep text-white">
      <NinjaArena reducedMotion={reduceMotion} className="absolute inset-0 -z-20" />
      {/* Escurece o topo da cena para o texto ficar legível; o chão (onde estão os ninjas) fica limpo. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,hsl(var(--journey-forest-deep)/.82)_0%,hsl(var(--journey-forest-deep)/.4)_42%,transparent_72%)]"
      />

      <div
        className={`mx-auto flex max-w-6xl flex-col gap-6 px-5 sm:px-8 md:flex-row md:items-start md:justify-between lg:px-12 ${
          compact ? "pb-32 pt-5 lg:pb-44" : "pb-36 pt-8 md:pb-40 md:pt-12 lg:pb-52"
        }`}
      >
        <div className="max-w-xl">
          <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-journey-gold sm:text-xs">
            <Zap size={15} fill="currentColor" /> {compact ? "Batalha em andamento" : "Sala de preparação"}
          </p>
          {compact ? (
            <h1 className="sr-only">Arena de reflexos</h1>
          ) : (
            <>
              <h1 className="mt-3 font-display text-4xl font-black leading-[0.95] tracking-[-0.05em] [text-shadow:0_3px_0_hsl(var(--journey-forest-deep)/.55)] sm:text-6xl">
                Monte sua <span className="text-journey-orange">missão</span>
              </h1>
              <p className="mt-4 max-w-md text-sm font-semibold leading-6 text-white/90 [text-shadow:0_1px_0_hsl(var(--journey-forest-deep)/.6)] sm:text-base">
                Escolha o alfabeto, defina seu rank e prepare-se para entrar no combate.
              </p>
            </>
          )}
        </div>

        <div className="flex items-start gap-3">
          <div className="grid grid-cols-3 gap-2" aria-label="Resumo de desempenho">
            <StatTile label="Acerto" value={`${stats.accuracy}%`} />
            <StatTile label="Média" value={formatMs(stats.averageCompletionMs)} />
            <StatTile label="Mediana" value={formatMs(stats.medianCompletionMs)} />
          </div>
          {audioToggle}
        </div>
      </div>
    </header>
  );
}
