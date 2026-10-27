import { motion, type MotionProps } from "framer-motion";
import { LockKeyhole } from "lucide-react";
import type { MODULE_LIST } from "@/data/modules";
import { countCompleted, type Journey } from "@/hooks/useJourney";
import { MISSION_ART } from "./art";

type Props = {
  module: (typeof MODULE_LIST)[number];
  index: number;
  journey: Journey;
  reveal: MotionProps;
  onOpen: () => void;
};

export function MissionCard({ module, index, journey, reveal, onOpen }: Props) {
  const { progress, getModulePercent, loading } = journey;
  const isLocked = Boolean(module.locked);
  const percent = getModulePercent(module.id);
  const moduleProgress = progress[module.id];
  const completed = moduleProgress ? countCompleted(moduleProgress.lessons) : 0;

  const status = loading && !isLocked
    ? "Carregando..."
    : isLocked
      ? "Em breve"
      : `${completed} lições concluídas`;

  return (
    <motion.button
      type="button"
      {...reveal}
      onClick={() => !isLocked && !loading && onOpen()}
      disabled={isLocked || loading}
      className={`mission-card group relative min-h-[430px] overflow-hidden rounded-[2rem] text-left shadow-[0_22px_55px_hsl(var(--journey-wood)/.16)] ${index === 0 ? "md:col-span-2 xl:col-span-1" : ""}`}
      aria-busy={loading && !isLocked}
    >
      <img
        src={MISSION_ART[index % MISSION_ART.length]}
        alt=""
        loading="lazy"
        decoding="async"
        className={`absolute inset-0 h-full w-full object-cover object-top transition-transform duration-300 group-enabled:group-hover:scale-[1.02] ${isLocked ? "grayscale" : ""}`}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-journey-forest-deep via-journey-forest-deep/48 to-transparent" />

      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5">
        <span className="rounded-full border border-white/20 bg-journey-forest-deep/50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white">
          Missão {String(index + 1).padStart(2, "0")}
        </span>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-journey-orange font-jp text-sm font-black text-white shadow-lg">
          {isLocked ? <LockKeyhole size={16} /> : module.emoji}
        </span>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-6 text-white">
        <p className="font-jp text-xs font-bold tracking-[0.14em] text-journey-gold">{module.sublabel}</p>
        <h3 className="mt-2 font-display text-2xl font-black leading-tight tracking-[-0.04em]">{module.label}</h3>
        <p className="mt-2 line-clamp-2 text-xs font-medium leading-5 text-white/90">{module.description}</p>
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.08em] text-white/90">
            <span>{status}</span>
            {!isLocked && !loading && <span>{percent}%</span>}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
            <div
              className={`h-full rounded-full bg-journey-orange transition-[width] duration-700 ${loading ? "motion-safe:animate-pulse" : ""}`}
              style={{ width: loading ? "30%" : isLocked ? 0 : `${percent}%` }}
            />
          </div>
        </div>
      </div>
    </motion.button>
  );
}