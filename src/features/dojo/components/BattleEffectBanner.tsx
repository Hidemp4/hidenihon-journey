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
            className="pointer-events-none absolute inset-x-3 top-5 z-30 flex justify-center"
          >
            <div className={`-rotate-3 border-4 bg-journey-forest-deep px-6 py-3 text-center text-white shadow-2xl ${banner.border}`}>
              <p className="font-jp text-5xl font-black">{banner.kanji}</p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.2em]">{banner.label}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
