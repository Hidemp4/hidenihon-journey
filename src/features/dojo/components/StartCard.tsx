import { Trophy, Zap } from "lucide-react";
import { ALPHABET_OPTIONS, DIFFICULTY_OPTIONS } from "../constants";
import { formatDuration } from "../format";
import type { DojoSettings } from "../types";

interface StartCardProps {
  settings: DojoSettings;
  /** Quantos kana existem na seleção atual. */
  deckSize: number;
  justFinished: boolean;
  /** Botão travado enquanto espera a transição para a contagem regressiva. */
  starting: boolean;
  onStart: () => void;
}

function describeMission(settings: DojoSettings) {
  const alphabet = ALPHABET_OPTIONS.find(({ id }) => id === settings.alphabet)?.label;
  const rank = DIFFICULTY_OPTIONS.find(({ id }) => id === settings.difficulty)?.label;
  const format =
    settings.mode === "quantity" ? `${settings.targetCount} kana` : settings.mode === "timed" ? formatDuration(settings.timeLimitSeconds) : "Livre";

  return [alphabet, rank, format].join(" · ");
}

export function StartCard({ settings, deckSize, justFinished, starting, onStart }: StartCardProps) {
  const deckEmpty = deckSize === 0;

  return (
    <div className="py-3 sm:py-6">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border-2 border-journey-gold/60 bg-journey-orange text-white shadow-[0_5px_0_hsl(var(--journey-orange)/.45)]">
        {justFinished ? <Trophy size={28} /> : <Zap size={28} fill="currentColor" />}
      </div>
      <p className="mt-5 text-[11px] font-black uppercase tracking-[0.18em] text-journey-orange">
        {justFinished ? "Relatório concluído" : "Próxima missão"}
      </p>
      <h2 className="mt-2 font-display text-3xl font-black tracking-[-0.045em] text-journey-ink">
        {justFinished ? "Sessão finalizada" : "Pronto para treinar?"}
      </h2>
      <p className="mx-auto mt-3 max-w-sm text-sm font-semibold leading-6 text-journey-ink/70">
        {deckEmpty
          ? "Nenhum kana nesta seleção. Escolha outros grupos."
          : justFinished
            ? "Confira seu desempenho abaixo ou inicie outra rodada."
            : "Pressione Espaço ou toque no botão para começar."}
      </p>

      <p className="mx-auto mt-4 w-fit rounded-full border-2 border-journey-wood/15 bg-white px-4 py-1.5 text-xs font-black text-journey-ink/80">
        {describeMission(settings)}
      </p>
      <p className="mt-2 text-[11px] font-semibold text-journey-ink/65">{deckSize} kana no baralho</p>

      <button
        type="button"
        onClick={onStart}
        disabled={deckEmpty || starting}
        aria-busy={starting}
        className="mt-6 inline-flex min-h-14 min-w-52 items-center justify-center gap-2 rounded-2xl border-2 border-journey-gold/60 bg-journey-orange px-6 text-sm font-black text-white shadow-[0_5px_0_hsl(var(--journey-orange)/.45)] transition hover:-translate-y-0.5 hover:bg-journey-orange-hover active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Zap size={17} fill="currentColor" className={starting ? "animate-pulse" : undefined} />
        {starting ? "Preparando…" : justFinished ? "Entrar em nova batalha" : "Iniciar batalha"}
      </button>
    </div>
  );
}
