import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

const RAYS = Array.from({ length: 16 }, (_, index) => index);

interface CountdownScreenProps {
  count: number;
  audioToggle: ReactNode;
  reduceMotion: boolean;
}

export function CountdownScreen({ count, audioToggle, reduceMotion }: CountdownScreenProps) {
  return (
    <main className="relative isolate grid min-h-screen min-h-[100dvh] overflow-hidden bg-journey-forest-deep font-ui text-white">
      <div className="journey-leaf-pattern absolute inset-0 -z-20 opacity-30" />
      <motion.div
        className="absolute inset-0 -z-10 bg-journey-orange/10"
        animate={reduceMotion ? undefined : { opacity: [0.1, 0.35, 0.1] }}
        transition={{ duration: 0.9, repeat: Infinity }}
      />
      {!reduceMotion &&
        RAYS.map((index) => (
          <motion.span
            key={index}
            className="absolute left-1/2 top-1/2 h-1 w-[75vw] origin-left bg-gradient-to-r from-white/70 to-transparent"
            style={{ rotate: `${index * 22.5}deg` }}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: [0, 0.7, 0] }}
            transition={{ duration: 0.7, repeat: Infinity, delay: index * 0.025 }}
          />
        ))}
      <div className="absolute right-5 top-5 z-20">{audioToggle}</div>
      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 2.2, rotate: -8 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.3 }}
          transition={{ duration: reduceMotion ? 0.05 : 0.28, ease: "easeOut" }}
          className="m-auto text-center"
          role="status"
          aria-live="polite"
        >
          <p className="text-xs font-black uppercase tracking-[0.35em] text-journey-gold">Prepare-se para a batalha</p>
          <p className="mt-4 font-display text-[10rem] font-black leading-none text-journey-orange drop-shadow-[0_10px_0_hsl(var(--journey-wood-deep))] sm:text-[15rem]">
            {count === 0 ? "GO!" : count}
          </p>
          <p className="font-jp text-3xl font-black text-white/70" aria-hidden="true">
            {count === 0 ? "開始" : "集中"}
          </p>
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
