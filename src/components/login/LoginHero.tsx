import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, Leaf, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LOGIN_ART } from "./art";
import { MODE_CONTENT, type AuthMode } from "./config";

export function LoginHero({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const { scene, title, description } = MODE_CONTENT[mode];

  // Pré-carrega as 3 imagens para a troca de etapa não piscar.
  useEffect(() => {
    Object.values(LOGIN_ART).forEach((src) => {
      new Image().src = src;
    });
  }, []);

  return (
    <section className="relative isolate min-h-[300px] overflow-hidden bg-journey-forest text-white lg:min-h-screen">
      <img
        src={LOGIN_ART[mode]}
        alt="Personagem da jornada HideNihon"
        className="absolute inset-0 -z-30 h-full w-full object-cover object-top lg:object-center"
      />
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(0deg,hsl(var(--journey-forest-deep)/.98)_0%,hsl(var(--journey-forest-deep)/.42)_62%,hsl(var(--journey-forest-deep)/.18)),linear-gradient(90deg,hsl(var(--journey-forest-deep)/.55),transparent_70%)]" />
      <div className="journey-leaf-pattern absolute inset-0 -z-10 opacity-10" />

      <div className="flex min-h-[300px] flex-col justify-between px-5 py-6 sm:px-8 lg:min-h-screen lg:px-12 lg:py-10 xl:px-16">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-journey-forest-deep/55 px-4 text-xs font-extrabold text-white backdrop-blur-sm transition hover:border-white/40 hover:bg-journey-forest-deep/75 active:scale-95"
            aria-label="Voltar para a página inicial"
          >
            <ChevronLeft size={17} />
            <span>Voltar</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-full border-2 border-white/30 bg-journey-orange shadow-[0_0_0_4px_hsl(var(--journey-forest-deep)/.35)]">
              <Leaf size={20} strokeWidth={2.6} />
            </div>
            <div className="hidden text-right sm:block">
              <p className="font-display text-base font-black leading-none tracking-[-0.04em]">HideNihon</p>
              <p className="mt-1 font-jp text-[9px] font-bold tracking-[0.2em] text-journey-sand">木ノ葉の旅</p>
            </div>
          </div>
        </div>

        <motion.div
          key={mode}
          initial={reduceMotion ? undefined : { opacity: 0, y: 22 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="max-w-xl pb-2 lg:pb-10"
        >
          <p className="hidden items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-journey-gold lg:flex">
            <Sparkles size={15} /> {scene}
          </p>
          <h1 className="mt-3 font-display text-4xl font-black uppercase leading-[0.92] tracking-[-0.055em] sm:text-5xl lg:mt-5 lg:text-7xl">
            {title}
          </h1>
          <p className="mt-4 max-w-lg text-sm font-semibold leading-6 text-white/80 sm:text-base lg:mt-6 lg:leading-7">
            {description}
          </p>
        </motion.div>
      </div>
    </section>
  );
}