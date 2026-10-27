import { motion } from "framer-motion";
import type { Reveal } from "@/hooks/useReveal";
import { LEARNING_PATH } from "./data";

export const HowItWorks = ({ reveal }: { reveal: Reveal }) => (
  <section id="como-funciona" className="border-y border-journey-wood/10 bg-white/60 px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
    <div className="mx-auto max-w-7xl">
      <motion.div {...reveal(0.55)} className="grid gap-6 lg:grid-cols-[.65fr_1.35fr] lg:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-journey-orange">O caminho HideNihon</p>
          <h2 className="mt-3 font-display text-4xl font-black leading-none tracking-[-0.05em] sm:text-5xl">Do estranho ao familiar.</h2>
        </div>
        <p className="max-w-2xl text-sm font-semibold leading-6 text-journey-ink/55 lg:justify-self-end sm:text-base">
          Você não recebe tudo de uma vez. O conteúdo aparece na ordem certa, com espaço para reconhecer, repetir e realmente lembrar.
        </p>
      </motion.div>

      <div className="relative mt-14 grid gap-4 md:grid-cols-3">
        <div className="absolute left-[16%] right-[16%] top-12 hidden border-t-2 border-dashed border-journey-orange/25 md:block" aria-hidden="true" />
        {LEARNING_PATH.map((step, index) => (
          <motion.article key={step.label} {...reveal(0.45, index * 0.1)} className="relative rounded-[2rem] border border-journey-wood/10 bg-journey-sand p-6 text-center shadow-[0_14px_35px_hsl(var(--journey-wood)/.08)]">
            <span className="absolute left-5 top-5 text-[10px] font-black tracking-[0.16em] text-journey-orange">0{index + 1}</span>
            <div className="relative mx-auto grid h-24 w-24 place-items-center rounded-full border-4 border-white bg-journey-forest-deep font-jp text-5xl font-black text-journey-gold shadow-lg">{step.kana}</div>
            <h3 className="mt-6 font-display text-xl font-black">{step.label}</h3>
            <p className="mt-2 text-sm font-semibold text-journey-ink/50">{step.detail}</p>
          </motion.article>
        ))}
      </div>
    </div>
  </section>
);