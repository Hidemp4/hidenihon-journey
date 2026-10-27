import { motion } from "framer-motion";
import type { Reveal } from "@/hooks/useReveal";
import { CtaLink } from "./CtaLink";

export const LandingFinalCta = ({ reveal }: { reveal: Reveal }) => (
  <section className="px-5 pb-16 sm:px-8 lg:px-12 lg:pb-24">
    <motion.div {...reveal(0.6)} className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-journey-orange px-6 py-14 text-center text-white shadow-[0_24px_60px_hsl(var(--journey-orange)/.22)] sm:px-12 sm:py-16">
      <div className="absolute -left-8 -top-12 font-jp text-[12rem] font-black text-white/[0.08]" aria-hidden="true">始</div>
      <div className="relative">
        <p className="font-jp text-xs font-bold tracking-[0.18em] text-journey-sand">準備はいいですか？</p>
        <h2 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-black leading-none tracking-[-0.055em] sm:text-6xl">Seu primeiro símbolo está esperando.</h2>
        <p className="mx-auto mt-5 max-w-xl text-sm font-semibold leading-6 text-white/80 sm:text-base">Crie sua conta e comece sem compromisso. A jornada cresce junto com você.</p>
        <CtaLink to="/login" variant="dark" className="mt-8">Criar minha conta</CtaLink>
      </div>
    </motion.div>
  </section>
);