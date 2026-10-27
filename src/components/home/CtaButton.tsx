import { ArrowRight, Play } from "lucide-react";

type Props = {
  onClick: () => void;
  disabled?: boolean;
  loading: boolean;
  label: string;
  className?: string;
};

export const CtaButton = ({ onClick, disabled, loading, label, className = "" }: Props) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`group inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-journey-orange px-7 text-sm font-black text-white shadow-[0_16px_38px_hsl(var(--journey-orange)/.35)] transition hover:-translate-y-1 hover:bg-journey-orange-hover disabled:cursor-wait disabled:opacity-70 ${className}`}
  >
    <Play size={18} fill="currentColor" />
    {loading ? "Preparando jornada..." : label}
    <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
  </button>
);