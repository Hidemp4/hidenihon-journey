import { motion, useReducedMotion } from "framer-motion";
import { Leaf, LogOut, Map, Sparkles } from "lucide-react";
import type { Journey } from "@/hooks/useJourney";
import { CtaButton } from "./CtaButton";

type Props = {
  firstName: string;
  journey: Journey;
  onStart: () => void;
  onLogout: () => void;
};

export function Hero({ firstName, journey, onStart, onLogout }: Props) {
  const reduceMotion = useReducedMotion();
  const { activeModule, activeAction, loading } = journey;

  return (
    <section className="relative isolate min-h-[780px] overflow-hidden bg-journey-forest text-white lg:min-h-screen">
      <img
        src="/narutohome.jpg"
        alt="Naruto diante de uma paisagem inspirada na Vila da Folha"
        className="absolute inset-0 -z-30 h-full w-full object-cover object-[64%_center] sm:object-center"
      />
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,hsl(var(--journey-forest-deep)/.98)_0%,hsl(var(--journey-forest-deep)/.8)_42%,hsl(var(--journey-forest-deep)/.18)_75%),linear-gradient(0deg,hsl(var(--journey-forest-deep)/.94)_0%,transparent_52%)]" />

      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-12">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-full border-2 border-white/30 bg-journey-orange shadow-[0_0_0_5px_hsl(var(--journey-forest-deep)/.35)]">
            <Leaf size={23} strokeWidth={2.6} />
          </div>
          <div>
            <p className="font-display text-lg font-black leading-none tracking-[-0.04em]">HideNihon</p>
            <p className="mt-1 font-jp text-[10px] font-bold tracking-[0.22em] text-journey-sand">木ノ葉の旅</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-journey-forest-deep/55 px-4 text-xs font-extrabold transition hover:border-white/40 hover:bg-journey-forest-deep/75 active:scale-95"
          aria-label="Sair da conta"
        >
          <LogOut size={15} />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </header>

      <div className="mx-auto flex min-h-[680px] w-full max-w-7xl items-end px-5 pb-20 pt-16 sm:px-8 lg:min-h-[calc(100vh-96px)] lg:items-center lg:px-12 lg:pb-24 lg:pt-8">
        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, x: -32 }}
          animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-2xl"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-journey-gold/40 bg-journey-forest-deep/55 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-journey-gold sm:text-xs">
            <Sparkles size={14} />
            Bem-vindo à Vila, {firstName}
          </span>
          <h1 className="mt-6 font-display text-5xl font-black uppercase leading-[0.88] tracking-[-0.065em] text-white sm:text-7xl lg:text-[6.6rem]">
            Sua aventura<br />no <span className="text-journey-orange">japonês</span><br />começa aqui.
          </h1>
          <p className="mt-6 max-w-xl text-base font-semibold leading-7 text-white/85 sm:text-lg">
            Aprenda no seu ritmo, supere desafios e comemore cada nova conquista na sua jornada.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <CtaButton onClick={onStart} disabled={!activeModule || loading} loading={loading} label={activeAction} />
            <a
              href="#treinos"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-6 text-sm font-black text-white transition hover:bg-white/15"
            >
              <Map size={18} />
              Explorar missões
            </a>
          </div>
        </motion.div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-16 bg-[linear-gradient(to_top,hsl(var(--journey-surface)),transparent)]" />
    </section>
  );
}