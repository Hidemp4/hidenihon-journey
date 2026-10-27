import { motion } from "framer-motion";
import type { Journey } from "@/hooks/useJourney";
import type { Reveal } from "@/hooks/useReveal";
import { CtaButton } from "./CtaButton";
import { CTA_ART } from "./art";

type Props = { journey: Journey; onStart: () => void; reveal: Reveal };

export function FinalCta({ journey, onStart, reveal }: Props) {
  const { activeModule, activeAction, loading } = journey;

  return (
    <section className="relative isolate min-h-[680px] overflow-hidden bg-journey-wood px-5 py-24 text-white sm:px-8 lg:px-12 lg:py-32">
      <img
        src={CTA_ART}
        alt="Personagem pronto para seguir sua jornada"
        loading="lazy"
        decoding="async"
        className="absolute inset-0 -z-30 h-full w-full object-cover object-[center_18%]"
      />
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,hsl(var(--journey-wood-deep)/.98),hsl(var(--journey-wood-deep)/.8)_48%,hsl(var(--journey-wood-deep)/.25)),linear-gradient(0deg,hsl(var(--journey-wood-deep)/.94),transparent_65%)]" />

      <div className="mx-auto flex min-h-[500px] max-w-7xl items-end lg:items-center">
        <motion.div {...reveal(0.7)} className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-journey-gold">Cena 04 · O próximo passo</p>
          <h2 className="mt-4 font-display text-5xl font-black uppercase leading-[0.92] tracking-[-0.06em] sm:text-7xl">A jornada continua.</h2>
          <p className="mt-5 max-w-lg text-base font-semibold leading-7 text-white/70">
            Seu próximo desafio já está esperando. Entre em ação e transforme mais um pouco do japonês em algo natural.
          </p>
          <CtaButton
            onClick={onStart}
            disabled={!activeModule || loading}
            loading={loading}
            label={activeAction}
            className="mt-8 w-full sm:w-auto"
          />
        </motion.div>
      </div>
    </section>
  );
}