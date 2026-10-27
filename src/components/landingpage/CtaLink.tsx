import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

type Props = { to: string; children: ReactNode; variant?: "orange" | "dark"; className?: string };

const VARIANTS = {
  orange:
    "bg-journey-orange text-white shadow-[0_14px_30px_hsl(var(--journey-orange)/.25)] hover:bg-journey-orange-hover",
  dark: "bg-journey-forest-deep text-white hover:bg-journey-forest",
};

export const CtaLink = ({ to, children, variant = "orange", className = "" }: Props) => (
  <Link
    to={to}
    className={`group inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl px-7 text-sm font-black transition hover:-translate-y-1 active:scale-[0.98] ${VARIANTS[variant]} ${className}`}
  >
    {children}
    <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
  </Link>
);