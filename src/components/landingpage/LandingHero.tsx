import { motion, useReducedMotion } from "framer-motion";
import { Check, Play, Sparkles } from "lucide-react";
import { BENEFITS } from "./data";
import { LANDINGPAGE_ART } from "./art";
import { CtaLink } from "./CtaLink";

export function LandingHero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative px-5 pb-20 pt-12 sm:px-8 sm:pt-16 lg:px-12 lg:pb-28 lg:pt-20">
      <div className="absolute left-[-6rem] top-12 font-jp text-[20rem] font-black leading-none text-journey-forest/[0.025]" aria-hidden="true">旅</div>
      <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[.9fr_1.1fr]">
        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 24 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          className="relative z-10"
        >
          <div className="inline-flex rotate-[-2deg] items-center gap-2 border border-journey-orange/25 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-journey-orange shadow-[3px_3px_0_hsl(var(--journey-orange)/.14)]">
            <Sparkles size={14} /> Seu japonês começa pequeno
          </div>
          <h1 className="mt-7 max-w-2xl font-display text-5xl font-black leading-[0.9] tracking-[-0.065em] sm:text-7xl lg:text-[5.8rem]">
            Um símbolo.<br />Uma descoberta.<br /><span className="text-journey-orange">Todo dia.</span>
          </h1>
          <p className="mt-7 max-w-xl text-base font-semibold leading-7 text-journey-ink/65 sm:text-lg">
            Uma trilha visual para quem quer aprender japonês sem se perder entre listas, regras e excesso de conteúdo.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <CtaLink to="/login">Começar gratuitamente</CtaLink>
            <a href="#experiencia" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-journey-wood/15 bg-white/60 px-6 text-sm font-black transition hover:bg-white active:scale-[0.98]">
              <Play size={17} fill="currentColor" /> Ver por dentro
            </a>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
            {BENEFITS.map((benefit) => (
              <span key={benefit} className="flex items-center gap-2 text-xs font-bold text-journey-ink/55">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-journey-leaf/10 text-journey-leaf"><Check size={12} strokeWidth={3} /></span>
                {benefit}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, scale: 0.96, rotate: 1 }}
          animate={reduceMotion ? undefined : { opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.75, delay: 0.08, ease: "easeOut" }}
          className="relative mx-auto w-full max-w-2xl pb-8 pt-4"
        >
          <div className="absolute -right-3 top-0 z-20 rotate-6 rounded-sm bg-journey-gold px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-journey-wood shadow-md sm:right-5">
            Caderno de viagem · 01
          </div>
          <div className="relative ml-auto w-[88%] rotate-[2deg] overflow-hidden rounded-[2rem] border-[10px] border-white bg-journey-forest-deep shadow-[0_30px_70px_hsl(var(--journey-wood)/.24)] sm:w-[82%]">
            <img src={LANDINGPAGE_ART[0]} alt="Personagem principal da trilha de japonês" className="aspect-[4/5] w-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-t from-journey-forest-deep/80 via-transparent to-transparent" />
            <p className="absolute bottom-5 left-5 right-5 font-jp text-sm font-bold tracking-[0.16em] text-white">最初の一歩 · O primeiro passo</p>
          </div>
          <div className="absolute bottom-0 left-0 z-10 w-[43%] -rotate-6 overflow-hidden rounded-[1.5rem] border-[7px] border-white bg-white shadow-[0_22px_45px_hsl(var(--journey-wood)/.22)]">
            <img src={LANDINGPAGE_ART[1]} alt="Personagem em uma jornada de aprendizado" className="aspect-[4/5] w-full object-cover object-top" />
          </div>
          <div className="absolute left-[30%] top-[18%] z-20 grid h-20 w-20 -rotate-12 place-items-center rounded-full border-4 border-journey-sand bg-journey-orange font-jp text-4xl font-black text-white shadow-xl sm:h-24 sm:w-24 sm:text-5xl">学</div>
        </motion.div>
      </div>
    </section>
  );
}