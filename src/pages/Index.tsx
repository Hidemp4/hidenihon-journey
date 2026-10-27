import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Target } from "lucide-react";
import { MODULE_LIST } from "@/data/modules";
import { useAuthContext } from "@/contexts/auth-context-core";
import { useJourney } from "@/hooks/useJourney";
import { useReveal } from "@/hooks/useReveal";
import { FloatingLearningNav } from "@/components/navigation/FloatingLearningNav";
import { Hero } from "@/components/home/Hero";
import { MissionCard } from "@/components/home/MissionCard";
import { ProgressSection } from "@/components/home/ProgressSection";
import { FinalCta } from "@/components/home/FinalCta";
import { HomeFooter } from "@/components/home/HomeFooter";
import { SectionHeading } from "@/components/home/SectionHeading";

export default function Index() {
  const navigate = useNavigate();
  const reveal = useReveal();
  const { user, logout } = useAuthContext();
  const journey = useJourney();
  const { activeModule, loading } = journey;

  const firstName = user?.name?.trim().split(" ")[0] || "estudante";

  const goToActiveModule = () => {
    if (activeModule && !loading) navigate(`/module/${activeModule.id}`);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <main className="journey-home min-h-screen overflow-hidden bg-journey-surface font-ui text-journey-ink" aria-busy={loading}>
      <Hero firstName={firstName} journey={journey} onStart={goToActiveModule} onLogout={handleLogout} />

      <section id="treinos" className="relative px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div className="journey-mark absolute right-[-5rem] top-12 font-jp text-[18rem] font-black leading-none text-journey-forest/[0.035]" aria-hidden="true">忍</div>
        <div className="relative mx-auto max-w-7xl">
          <motion.div {...reveal()} className="max-w-2xl">
            <SectionHeading
              icon={Target}
              eyebrow="Cena 02 · Treinamentos"
              title="Escolha sua próxima missão."
              text="Cada etapa fortalece uma habilidade diferente. Comece pelos fundamentos e avance no seu próprio ritmo."
            />
          </motion.div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {MODULE_LIST.map((module, index) => (
              <MissionCard
                key={module.id}
                module={module}
                index={index}
                journey={journey}
                reveal={reveal(0.5, index * 0.06)}
                onOpen={() => navigate(`/module/${module.id}`)}
              />
            ))}
          </div>
        </div>
      </section>

      <ProgressSection firstName={firstName} journey={journey} reveal={reveal} />
      <FinalCta journey={journey} onStart={goToActiveModule} reveal={reveal} />
      <HomeFooter />
      <FloatingLearningNav />
    </main>
  );
}