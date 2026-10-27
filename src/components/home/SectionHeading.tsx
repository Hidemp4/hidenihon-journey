import type { LucideIcon } from "lucide-react";

type Props = {
  icon?: LucideIcon;
  eyebrow: string;
  title: string;
  text?: string;
  tone?: "light" | "dark";
};

export const SectionHeading = ({ icon: Icon, eyebrow, title, text, tone = "light" }: Props) => {
  const light = tone === "light";

  return (
    <>
      <p className={`flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] ${light ? "text-journey-orange" : "text-journey-gold"}`}>
        {Icon && <Icon size={16} />} {eyebrow}
      </p>
      <h2 className="mt-4 font-display text-4xl font-black leading-none tracking-[-0.055em] sm:text-6xl">{title}</h2>
      {text && (
        <p className={`mt-5 max-w-xl text-sm font-semibold leading-6 sm:text-base ${light ? "text-journey-ink/60" : "text-white/85"}`}>
          {text}
        </p>
      )}
    </>
  );
};