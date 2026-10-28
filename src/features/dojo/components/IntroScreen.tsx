import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";

const RAYS = Array.from({ length: 10 }, (_, index) => index);

interface IntroScreenProps {
  onEnter: () => void;
  /** Botão desativado enquanto espera a transição para o lobby. */
  entering: boolean;
  audioToggle: ReactNode;
  reduceMotion: boolean;
}

export function IntroScreen({ onEnter, entering, audioToggle, reduceMotion }: IntroScreenProps) {
  return (
    <main className="relative isolate grid min-h-screen min-h-[100dvh] overflow-hidden bg-journey-forest-deep px-5 py-8 font-ui text-white sm:px-8">
      <img src="/narutohome.jpg" alt="" className="absolute inset-0 -z-30 h-full w-full object-cover object-center opacity-35" />
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_center,transparent_0%,hsl(var(--journey-forest-deep)/.72)_58%,hsl(var(--journey-forest-deep))_100%),linear-gradient(90deg,hsl(var(--journey-forest-deep)/.9),transparent,hsl(var(--journey-forest-deep)/.9))]" />
      <div className="journey-leaf-pattern absolute inset-0 -z-10 opacity-20" />
      {!reduceMotion &&
        RAYS.map((index) => (
          <motion.span
            key={index}
            className="absolute left-1/2 top-1/2 -z-10 h-px w-[85vw] origin-left bg-gradient-to-r from-journey-gold/60 to-transparent"
            style={{ rotate: `${index * 36}deg` }}
            animate={{ opacity: [0.08, 0.5, 0.08], scaleX: [0.5, 1.15, 0.5] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: index * 0.08 }}
          />
        ))}
      <div className="absolute right-5 top-5 z-10">{audioToggle}</div>
      <motion.div
        initial={reduceMotion ? undefined : { opacity: 0, scale: 1.08 }}
        animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="m-auto w-full max-w-4xl text-center"
      >
        <p className="text-xs font-black uppercase tracking-[0.35em] text-journey-gold">HideNihon apresenta</p>
        <p className="mt-5 font-jp text-6xl font-black text-white/10 sm:text-8xl" aria-hidden="true">
          道場
        </p>
        <h1 className="-mt-8 font-display text-6xl font-black uppercase leading-[0.85] tracking-[-0.065em] sm:-mt-12 sm:text-9xl">
          <span className="text-journey-orange">Dojô</span>
        </h1>
        <p className="mx-auto mt-7 max-w-lg text-sm font-semibold leading-6 text-white/80 sm:text-base">
          Entre no dojô, escolha seu treino e prove que seus reflexos acompanham seu conhecimento.
        </p>
        <button
          type="button"
          onClick={onEnter}
          disabled={entering}
          aria-busy={entering}
          className="group mt-9 inline-flex min-h-16 items-center gap-3 rounded-2xl border-2 border-journey-gold/60 bg-journey-orange px-9 text-sm font-black uppercase tracking-[0.12em] text-white shadow-[0_0_45px_hsl(var(--journey-orange)/.45)] transition hover:-translate-y-1 hover:bg-journey-orange-hover active:scale-95 disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-90"
        >
          <Zap size={20} fill="currentColor" className={entering && !reduceMotion ? "animate-pulse" : undefined} />
          {entering ? "Entrando…" : "Entrar na arena"}
        </button>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
          Toque para habilitar a experiência sonora
        </p>
      </motion.div>
    </main>
  );
}
