import { useReveal } from "@/hooks/useReveal";
import { LandingHeader } from "@/components/landingpage/LandingHeader";
import { LandingHero } from "@/components/landingpage/LandingHero";
import { HowItWorks } from "@/components/landingpage/HowItWorks";
import { ExperiencePreview } from "@/components/landingpage/ExperiencePreview";
import { LandingFinalCta } from "@/components/landingpage/LandingFinalCta";
import { LandingFooter } from "@/components/landingpage/LandingFooter";

export default function LandingPage() {
  const reveal = useReveal();

  return (
    <main className="min-h-screen overflow-hidden bg-journey-surface font-ui text-journey-ink">
      <LandingHeader />
      <LandingHero />
      <HowItWorks reveal={reveal} />
      <ExperiencePreview reveal={reveal} />
      <LandingFinalCta reveal={reveal} />
      <LandingFooter />
    </main>
  );
}