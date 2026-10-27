import { motion } from "framer-motion";
import { BookOpen, Flame, Trophy, type LucideIcon } from "lucide-react";
import type { Journey } from "@/hooks/useJourney";
import type { Reveal } from "@/hooks/useReveal";
import { SectionHeading } from "./SectionHeading";

type StatProps = { icon: LucideIcon; value: string | number; label: string; loading: boolean };

const Stat = ({ icon: Icon, value, label, loading }: StatProps) => (
  <div className="rounded-2xl border border-white/10 bg-journey-forest-deep/55 p-4">
    <Icon size={17} className="text-journey-orange" />
    <p className={`mt-4 text-xl font-black sm:text-2xl ${loading ? "h-7 w-10 motion-safe:animate-pulse rounded bg-white/10 text-transparent" : ""}`}>
      {value}
    </p>
    <p className="mt-1 truncate text-[9px] font-black uppercase tracking-[0.1em] text-white/90 sm:text-[10px]">{label}</p>
  </div>
);

type Props = { firstName: string; journey: Journey; reveal: Reveal };

export function ProgressSection({ firstName, journey, reveal }: Props) {
  const { loading, error, overallPct, totalLessons, totalChars, activeModule, activePercent } = journey;

  return (
    <section className="relative isolate overflow-hidden bg-journey-forest-deep px-5 py-24 text-white sm:px-8 lg:px-12 lg:py-32">
      <div className="journey-leaf-pattern absolute inset-0 -z-20 opacity-30" />
      <div className="absolute -left-32 top-1/3 -z-10 h-96 w-96 rounded-full bg-journey-leaf/20 blur-3xl" />

      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[.9fr_1.1fr]">
        <motion.div {...reveal()}>
          <SectionHeading
            tone="dark"
            icon={Trophy}
            eyebrow="Cena 03 · Sua evolução"
            title="Todo grande ninja começou do zero."
            text="Continue aparecendo, missão após missão. Seu progresso já conta a história da sua disciplina."
          />
        </motion.div>

        <motion.div {...reveal(0.65, 0.12)} className="rounded-[2.25rem] border border-white/12 bg-white/[0.07] p-5 shadow-2xl sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-journey-gold">Relatório da missão</p>
              <h3 className="mt-2 font-display text-2xl font-black">Progresso de {firstName}</h3>
            </div>
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-[5px] border-journey-orange bg-journey-forest-deep text-sm font-black">
              {loading ? "—" : `${overallPct}%`}
            </div>
          </div>

          <div className="mt-7 grid grid-cols-3 gap-3">
            <Stat icon={BookOpen} value={totalLessons} label="Lições" loading={loading} />
            <Stat icon={Trophy} value={totalChars} label="Caracteres" loading={loading} />
            <Stat icon={Flame} value={`${overallPct}%`} label="Jornada" loading={loading} />
          </div>

          {activeModule && (
            <div className="mt-6 rounded-2xl bg-journey-sand p-5 text-journey-ink">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-journey-wood/60">Missão atual</p>
                  <p className="mt-1 font-display text-lg font-black">{activeModule.label}</p>
                </div>
                <span className="font-jp text-2xl font-black text-journey-orange">{activeModule.emoji}</span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-journey-wood/15">
                <div className="h-full rounded-full bg-journey-orange transition-[width] duration-700" style={{ width: `${activePercent}%` }} />
              </div>
            </div>
          )}

          {error && <p className="mt-4 text-xs font-bold text-red-200" role="alert">{error}</p>}
        </motion.div>
      </div>
    </section>
  );
}