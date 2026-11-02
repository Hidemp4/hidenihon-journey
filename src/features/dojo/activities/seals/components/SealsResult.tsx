import { useEffect, useRef } from "react";
import { Footprints, RotateCcw, Timer } from "lucide-react";
import { MetricCard, Panel } from "@/features/dojo/shared/components/ui";
import { formatTimer } from "@/features/dojo/shared/format";
import { MAX_STARS } from "../constants";
import { boardResult, elapsedSeconds, isBetterResult, movesForThreeStars } from "../results";
import type { SealsBoard } from "../types";
import { Stars } from "./Stars";

interface SealsResultProps {
  board: SealsBoard;
  storageWarning: boolean;
  onRestart: () => void;
  onClose: () => void;
}

export function SealsResult({ board, storageWarning, onRestart, onClose }: SealsResultProps) {
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const result = boardResult(board, board.finishedAt ?? 0);
  const previous = board.previousBest;
  const newBest = isBetterResult(result, previous);

  // O foco sai da última carta e vem para o resultado (o leitor de tela lê o título).
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <Panel className="mx-auto mb-5 max-w-2xl text-center">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-journey-orange">Selos completos</p>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="mt-1.5 rounded-lg font-display text-2xl font-black tracking-[-0.03em] text-journey-ink outline-none focus-visible:ring-4 focus-visible:ring-journey-orange/40"
      >
        Todos os pares carimbados!
      </h2>

      <div className="mt-4 flex justify-center">
        <Stars count={result.stars} size={34} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-left">
        <MetricCard label="Jogadas" value={String(result.moves)} icon={<Footprints size={15} aria-hidden="true" />} />
        <MetricCard label="Tempo" value={formatTimer(elapsedSeconds(result.ms))} icon={<Timer size={15} aria-hidden="true" />} />
      </div>

      <p className="mt-4 text-sm font-bold text-journey-ink">
        {newBest
          ? previous
            ? `Novo recorde neste tabuleiro! Antes: ${previous.moves} jogadas.`
            : "Primeiro recorde neste tabuleiro!"
          : `Recorde: ${previous?.moves} jogadas em ${formatTimer(elapsedSeconds(previous?.ms ?? 0))}.`}
      </p>
      {result.stars < MAX_STARS && (
        <p className="mt-1 text-xs font-semibold text-journey-ink/75">
          Para {MAX_STARS} estrelas: até {movesForThreeStars(board.pairs.length)} jogadas.
        </p>
      )}

      {storageWarning && (
        <p className="mt-4 rounded-xl bg-journey-sand px-3 py-2 text-xs font-semibold text-journey-ink" role="alert">
          Não foi possível salvar o resultado neste navegador. O jogo continua funcionando normalmente.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onRestart}
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-journey-gold/60 bg-journey-orange px-5 text-sm font-black text-white shadow-[0_5px_0_hsl(var(--journey-orange)/.45)] transition hover:bg-journey-orange-hover active:translate-y-0.5 active:shadow-none"
        >
          <RotateCcw size={16} aria-hidden="true" /> Jogar de novo
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
