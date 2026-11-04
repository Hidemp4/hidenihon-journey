import type { ReactNode } from "react";
import { ArrowLeft, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import type { ModuleMeta } from "@/data/modules";

const backLinkClass =
  "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border-2 border-white/25 bg-black/45 px-4 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:border-journey-orange/60 hover:text-journey-gold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-journey-orange/60";

type Props = {
  moduleMeta: ModuleMeta;
  /** Posição do módulo na Trilha (Missão 01, 02…). */
  missionNumber: number;
  /** A mesma arte do card da missão na home: quem toca no card cai na mesma cena. */
  art: string;
  /** Placar do módulo (no celular, abaixo do texto). */
  stats?: ReactNode;
};

/** Cabeçalho do módulo no clima da Trilha: cena da missão, moldura de madeira e placar. */
export function ModuleHero({ moduleMeta, missionNumber, art, stats }: Props) {
  return (
    <header className="relative isolate overflow-hidden border-b-[6px] border-[hsl(var(--journey-wood-deep))] bg-journey-forest-deep text-white">
      <img
        src={art}
        alt=""
        decoding="async"
        className={`absolute inset-0 -z-20 h-full w-full object-cover object-[center_22%] ${moduleMeta.locked ? "grayscale" : ""}`}
      />
      {/* Escurece da esquerda (onde fica o texto) e de baixo (onde fica o placar). */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,hsl(var(--journey-forest-deep)/.96)_0%,hsl(var(--journey-forest-deep)/.8)_52%,hsl(var(--journey-forest-deep)/.38)_100%),linear-gradient(0deg,hsl(var(--journey-forest-deep)/.92)_0%,transparent_62%)]"
      />
      <div className="journey-leaf-pattern absolute inset-0 -z-10 opacity-20" aria-hidden="true" />

      <div className="mx-auto max-w-5xl px-5 pb-10 pt-5 sm:px-8 lg:px-12 lg:pb-14">
        <Link to="/home" aria-label="Voltar para a Trilha" className={backLinkClass}>
          <ArrowLeft size={16} strokeWidth={2.6} aria-hidden="true" /> Trilha
        </Link>

        <div className="mt-10 flex flex-col gap-6 md:mt-14 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-journey-gold sm:text-xs">
              <Zap size={15} fill="currentColor" aria-hidden="true" /> Missão {String(missionNumber).padStart(2, "0")}
              <span lang="ja" className="font-jp tracking-[0.14em]">
                · {moduleMeta.sublabel}
              </span>
            </p>
            <h1 className="mt-3 font-display text-5xl font-black leading-[0.95] tracking-[-0.05em] [text-shadow:0_3px_0_hsl(var(--journey-forest-deep)/.55)] sm:text-6xl">
              {moduleMeta.label}
            </h1>
            <p className="mt-4 max-w-md text-sm font-semibold leading-6 text-white/90 [text-shadow:0_1px_0_hsl(var(--journey-forest-deep)/.6)] sm:text-base">
              {moduleMeta.description}
            </p>
          </div>

          {stats && <div className="md:w-[22rem]">{stats}</div>}
        </div>
      </div>
    </header>
  );
}
