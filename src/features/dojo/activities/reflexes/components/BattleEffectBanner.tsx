import { AnimatePresence, motion } from "framer-motion";
import type { BattleEffect } from "../dojoReducer";
import type { AttemptOutcome } from "../types";

const BANNERS: Record<AttemptOutcome, { kanji: string; label: string; border: string }> = {
  correct: { kanji: "命中", label: "Golpe certeiro", border: "border-emerald-400" },
  wrong: { kanji: "失敗", label: "Combo interrompido", border: "border-red-400" },
  timeout: { kanji: "時間切", label: "Tempo esgotado · combo perdido", border: "border-journey-gold" },
};

interface BattleEffectBannerProps {
  effect: BattleEffect | null;
  /** `false` no modo foco: mantém só o anúncio para leitores de tela. */
  visual: boolean;
  reduceMotion: boolean;
}

export function BattleEffectBanner({ effect, visual, reduceMotion }: BattleEffectBannerProps) {
  const banner = effect ? BANNERS[effect.type] : null;

  return (
    <>
      {/* Região live sempre montada: anúncios só funcionam se o elemento já existir. */}
      <p className="sr-only" role="status" aria-live="polite">
        {banner?.label ?? ""}
      </p>
      <AnimatePresence>
        {visual && effect && banner && (
          <motion.div
            key={effect.id}
            aria-hidden="true"
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: reduceMotion ? 1 : 1.3 }}
            transition={{ duration: reduceMotion ? 0.05 : 0.18 }}
            // No celular o cartão é baixo e o próximo kana aparece logo abaixo do topo: lá a faixa é uma
            // linha só, em cima do contador, para não cobrir o kana novo nos 700 ms em que fica na tela.
            className="pointer-events-none absolute inset-x-3 top-1.5 z-30 flex justify-center sm:top-5"
          >
            <div
              className={`flex -rotate-2 items-center gap-2.5 border-[3px] bg-journey-forest-deep px-4 py-1 text-white shadow-2xl sm:block sm:-rotate-3 sm:border-4 sm:px-6 sm:py-3 sm:text-center ${banner.border}`}
            >
              <p className="font-jp text-2xl font-black sm:text-5xl">{banner.kanji}</p>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] sm:mt-1 sm:text-xs sm:tracking-[0.2em]">{banner.label}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
