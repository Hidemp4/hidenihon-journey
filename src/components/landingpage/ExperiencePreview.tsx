import { motion } from "framer-motion";
import { Clock3, Target, Trophy, Volume2 } from "lucide-react";
import type { Reveal } from "@/hooks/useReveal";
import { EXERCISE_ANSWERS } from "./data";

function ExerciseMock() {
  return (
    <div className="rounded-[1.9rem] bg-journey-sand p-5 sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-journey-orange">Exercício 04 de 08</p>
          <h3 className="mt-2 font-display text-xl font-black sm:text-2xl">Qual é o som deste kana?</h3>
        </div>
        <button type="button" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-journey-forest shadow-sm" aria-label="Ouvir pronúncia">
          <Volume2 size={20} />
        </button>
      </div>
      <div className="my-8 grid place-items-center rounded-[2rem] border border-journey-wood/10 bg-white py-10 shadow-inner sm:py-14">
        <span className="font-jp text-8xl font-black text-journey-ink sm:text-9xl">か</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {EXERCISE_ANSWERS.map((answer, index) => (
          <div key={answer} className={`rounded-2xl border px-4 py-3 text-center text-sm font-black ${index === 0 ? "border-journey-orange bg-journey-orange text-white" : "border-journey-wood/10 bg-white text-journey-ink/65"}`}>
            {answer}
          </div>
        ))}
      </div>
      <div className="mt-6 h-2 overflow-hidden rounded-full bg-journey-wood/10">
        <div className="h-full w-1/2 rounded-full bg-journey-orange" />
      </div>
    </div>
  );
}

export const ExperiencePreview = ({ reveal }: { reveal: Reveal }) => (
  <section id="experiencia" className="relative px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
    <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
      <motion.div {...reveal(0.55)}>
        <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-journey-leaf"><Target size={16} /> Dentro do treinamento</span>
        <h2 className="mt-4 font-display text-4xl font-black leading-[0.95] tracking-[-0.055em] sm:text-6xl">Menos distração.<br />Mais prática.</h2>
        <p className="mt-6 max-w-lg text-sm font-semibold leading-6 text-journey-ink/60 sm:text-base">
          Cada tela tem uma função clara. Você aprende o símbolo, escuta o som, responde e vê sua evolução — sem menus competindo pela atenção.
        </p>
        <div className="mt-8 grid max-w-md grid-cols-2 gap-3">
          <div className="rounded-2xl bg-journey-forest-deep p-4 text-white">
            <Clock3 size={18} className="text-journey-gold" />
            <p className="mt-4 text-2xl font-black">5–10 min</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white/60">por sessão</p>
          </div>
          <div className="rounded-2xl bg-journey-orange p-4 text-white">
            <Trophy size={18} />
            <p className="mt-4 text-2xl font-black">1 passo</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white/70">de cada vez</p>
          </div>
        </div>
      </motion.div>

      <motion.div {...reveal(0.65, 0.1)} className="relative rounded-[2.5rem] bg-journey-forest-deep p-4 shadow-[0_30px_70px_hsl(var(--journey-forest-deep)/.2)] sm:p-7">
        <ExerciseMock />
      </motion.div>
    </div>
  </section>
);