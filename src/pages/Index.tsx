import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Flame,
  Leaf,
  LockKeyhole,
  LogOut,
  Map,
  Play,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { MODULE_LIST } from "@/data/modules";
import { useProgress, type ModuleProgress } from "@/hooks/useProgress";
import { useAuthContext } from "@/contexts/auth-context-core";
import { FloatingLearningNav } from "@/components/navigation/FloatingLearningNav";

const MISSION_ART = [
  "/midoriyahome-card.webp",
  "/tanjirohome-card.webp",
  "/isagihome-card.webp",
  "/itadorihome-card.webp",
  "/gokuhome-card.webp",
  "/haikyuuhome.png",
];

function countCompleted(lessons: ModuleProgress["lessons"]) {
  return Object.values(lessons).filter(({ completed }) => completed).length;
}

function getLastPracticedTime(lessons: ModuleProgress["lessons"]) {
  return Object.values(lessons).reduce((latest, lesson) => {
    const practicedAt = Date.parse(lesson.lastPracticed);
    return Number.isNaN(practicedAt) ? latest : Math.max(latest, practicedAt);
  }, 0);
}

export default function Index() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const { getModulePercent, progress, loading, error } = useProgress();
  const { user, logout } = useAuthContext();

  const totalLessons = Object.values(progress).reduce((sum, module) => sum + countCompleted(module.lessons), 0);
  const totalChars = Object.values(progress).reduce((sum, module) => sum + module.learnedChars, 0);
  const availableModules = MODULE_LIST.filter((module) => !module.locked);
  const overallPct = availableModules.length
    ? Math.round(availableModules.reduce((sum, module) => sum + getModulePercent(module.id), 0) / availableModules.length)
    : 0;
  const moduleSummaries = availableModules.map((module) => {
    const moduleProgress = progress[module.id];
    const percent = getModulePercent(module.id);

    return {
      module,
      percent,
      lastPracticedTime: moduleProgress ? getLastPracticedTime(moduleProgress.lessons) : 0,
    };
  });
  const startedIncompleteModules = moduleSummaries
    .filter(({ percent }) => percent > 0 && percent < 100)
    .sort((a, b) => b.lastPracticedTime - a.lastPracticedTime);
  const unstartedModule = moduleSummaries.find(({ percent }) => percent === 0);
  const latestCompletedModule = moduleSummaries
    .filter(({ percent }) => percent === 100)
    .sort((a, b) => b.lastPracticedTime - a.lastPracticedTime)[0];
  const activeModuleSummary = startedIncompleteModules[0]
    ?? unstartedModule
    ?? latestCompletedModule
    ?? moduleSummaries[0];
  const activeModule = activeModuleSummary?.module;
  const activeModulePercent = activeModuleSummary?.percent ?? 0;
  const activeModuleAction = activeModulePercent === 100
    ? "Revisar missão"
    : activeModulePercent > 0
      ? "Continuar estudando"
      : "Começar treinamento";
  const firstName = user?.name?.trim().split(" ")[0] || "estudante";
  const reveal = reduceMotion
    ? {}
    : { initial: { opacity: 0, y: 28 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.2 } };

  const goToActiveModule = () => {
    if (activeModule && !loading) navigate(`/module/${activeModule.id}`);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <main className="journey-home min-h-screen overflow-hidden bg-journey-surface font-ui text-journey-ink" aria-busy={loading}>
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
            onClick={handleLogout}
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
              <button
                type="button"
                onClick={goToActiveModule}
                disabled={!activeModule || loading}
                className="group inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-journey-orange px-7 text-sm font-black text-white shadow-[0_16px_38px_hsl(var(--journey-orange)/.34)] transition hover:-translate-y-1 hover:bg-journey-orange-hover disabled:cursor-wait disabled:opacity-70"
              >
                <Play size={18} fill="currentColor" />
                {loading ? "Preparando jornada..." : activeModuleAction}
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </button>
              <a href="#treinos" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-6 text-sm font-black text-white transition hover:bg-white/15">
                <Map size={18} />
                Explorar missões
              </a>
            </div>
          </motion.div>
        </div>

        <div className="absolute inset-x-0 bottom-0 h-16 bg-[linear-gradient(to_top,hsl(var(--journey-surface)),transparent)]" />
      </section>

      <section id="treinos" className="relative px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div className="journey-mark absolute right-[-5rem] top-12 font-jp text-[18rem] font-black leading-none text-journey-forest/[0.035]" aria-hidden="true">忍</div>
        <div className="relative mx-auto max-w-7xl">
          <motion.div {...reveal} transition={{ duration: 0.6 }} className="max-w-2xl">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-journey-orange"><Target size={16} /> Cena 02 · Treinamentos</p>
            <h2 className="mt-4 font-display text-4xl font-black leading-none tracking-[-0.055em] text-journey-ink sm:text-6xl">Escolha sua próxima missão.</h2>
            <p className="mt-5 max-w-xl text-sm font-semibold leading-6 text-journey-ink/60 sm:text-base">Cada etapa fortalece uma habilidade diferente. Comece pelos fundamentos e avance no seu próprio ritmo.</p>
          </motion.div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {MODULE_LIST.map((module, index) => {
              const moduleProgress = progress[module.id];
              const percent = getModulePercent(module.id);
              const completedLessons = moduleProgress ? countCompleted(moduleProgress.lessons) : 0;
              const isLocked = Boolean(module.locked);

              return (
                <motion.button
                  key={module.id}
                  type="button"
                  {...reveal}
                  transition={{ duration: 0.5, delay: reduceMotion ? 0 : index * 0.06 }}
                  onClick={() => !isLocked && !loading && navigate(`/module/${module.id}`)}
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
                    <span className="rounded-full border border-white/20 bg-journey-forest-deep/50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white">Missão {String(index + 1).padStart(2, "0")}</span>
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-journey-orange font-jp text-sm font-black text-white shadow-lg">{isLocked ? <LockKeyhole size={16} /> : module.emoji}</span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                    <p className="font-jp text-xs font-bold tracking-[0.14em] text-journey-gold">{module.sublabel}</p>
                    <h3 className="mt-2 font-display text-2xl font-black leading-tight tracking-[-0.04em]">{module.label}</h3>
                    <p className="mt-2 line-clamp-2 text-xs font-medium leading-5 text-white/90">{module.description}</p>
                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.08em] text-white/90">
                        <span>{loading && !isLocked ? "Carregando..." : isLocked ? "Em breve" : `${completedLessons} lições concluídas`}</span>
                        {!isLocked && !loading && <span>{percent}%</span>}
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
                        <div className={`h-full rounded-full bg-journey-orange transition-[width] duration-700 ${loading ? "motion-safe:animate-pulse" : ""}`} style={{ width: loading ? "30%" : isLocked ? 0 : `${percent}%` }} />
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden bg-journey-forest-deep px-5 py-24 text-white sm:px-8 lg:px-12 lg:py-32">
        <div className="journey-leaf-pattern absolute inset-0 -z-20 opacity-30" />
        <div className="absolute -left-32 top-1/3 -z-10 h-96 w-96 rounded-full bg-journey-leaf/20 blur-3xl" />
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[.9fr_1.1fr]">
          <motion.div {...reveal} transition={{ duration: 0.6 }}>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-journey-gold"><Trophy size={16} /> Cena 03 · Sua evolução</p>
            <h2 className="mt-4 font-display text-4xl font-black leading-none tracking-[-0.055em] sm:text-6xl">Todo grande ninja começou do zero.</h2>
            <p className="mt-5 max-w-xl text-sm font-semibold leading-6 text-white/85 sm:text-base">Continue aparecendo, missão após missão. Seu progresso já conta a história da sua disciplina.</p>
          </motion.div>

          <motion.div {...reveal} transition={{ duration: 0.65, delay: reduceMotion ? 0 : 0.12 }} className="rounded-[2.25rem] border border-white/12 bg-white/[0.07] p-5 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-journey-gold">Relatório da missão</p>
                <h3 className="mt-2 font-display text-2xl font-black">Progresso de {firstName}</h3>
              </div>
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-[5px] border-journey-orange bg-journey-forest-deep text-sm font-black">{loading ? "—" : `${overallPct}%`}</div>
            </div>

            <div className="mt-7 grid grid-cols-3 gap-3">
              {[
                { icon: BookOpen, value: totalLessons, label: "Lições" },
                { icon: Trophy, value: totalChars, label: "Caracteres" },
                { icon: Flame, value: `${overallPct}%`, label: "Jornada" },
              ].map(({ icon: Icon, value, label }) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-journey-forest-deep/55 p-4">
                  <Icon size={17} className="text-journey-orange" />
                  <p className={`mt-4 text-xl font-black sm:text-2xl ${loading ? "h-7 w-10 motion-safe:animate-pulse rounded bg-white/10 text-transparent" : ""}`}>{value}</p>
                  <p className="mt-1 truncate text-[9px] font-black uppercase tracking-[0.1em] text-white/90 sm:text-[10px]">{label}</p>
                </div>
              ))}
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
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-journey-wood/15"><div className="h-full rounded-full bg-journey-orange transition-[width] duration-700" style={{ width: `${activeModulePercent}%` }} /></div>
              </div>
            )}
            {error && <p className="mt-4 text-xs font-bold text-red-200" role="alert">{error}</p>}
          </motion.div>
        </div>
      </section>

      <section className="relative isolate min-h-[680px] overflow-hidden bg-journey-wood px-5 py-24 text-white sm:px-8 lg:px-12 lg:py-32">
        <img
          src={MISSION_ART[5]}
          alt="Goku pronto para seguir sua jornada"
          loading="lazy"
          decoding="async"
          className="absolute inset-0 -z-30 h-full w-full object-cover object-[center_18%]"
        />
        <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,hsl(var(--journey-wood-deep)/.98),hsl(var(--journey-wood-deep)/.8)_48%,hsl(var(--journey-wood-deep)/.25)),linear-gradient(0deg,hsl(var(--journey-wood-deep)/.94),transparent_65%)]" />
        <div className="mx-auto flex min-h-[500px] max-w-7xl items-end lg:items-center">
          <motion.div {...reveal} transition={{ duration: 0.7 }} className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-journey-gold">Cena 04 · O próximo passo</p>
            <h2 className="mt-4 font-display text-5xl font-black uppercase leading-[0.92] tracking-[-0.06em] sm:text-7xl">A jornada continua.</h2>
            <p className="mt-5 max-w-lg text-base font-semibold leading-7 text-white/70">Seu próximo desafio já está esperando. Entre em ação e transforme mais um pouco do japonês em algo natural.</p>
            <button type="button" onClick={goToActiveModule} disabled={!activeModule || loading} className="group mt-8 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-journey-orange px-7 text-sm font-black shadow-[0_16px_38px_hsl(var(--journey-orange)/.36)] transition hover:-translate-y-1 hover:bg-journey-orange-hover disabled:cursor-wait disabled:opacity-70 sm:w-auto">
              <Play size={18} fill="currentColor" />
              {loading ? "Preparando jornada..." : activeModuleAction}
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </button>
          </motion.div>
        </div>
      </section>

      <footer className="bg-journey-forest-deep px-5 pb-32 pt-10 text-center text-white sm:px-8">
        <p className="font-jp text-xs font-bold tracking-[0.16em] text-journey-gold">一歩ずつ、夢に近づく</p>
        <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">Um passo de cada vez, mais perto do seu objetivo</p>
      </footer>

      <FloatingLearningNav />
    </main>
  );
}
