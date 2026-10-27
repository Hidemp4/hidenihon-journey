import type { InputHTMLAttributes } from "react";

const INPUT_CLASS =
  "w-full rounded-2xl border border-journey-wood/15 bg-white/70 px-4 py-3.5 text-sm font-semibold text-journey-ink outline-none transition placeholder:text-journey-ink/35 focus:border-journey-orange focus:bg-white focus:ring-4 focus:ring-journey-orange/10";

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string };

export const AuthField = ({ label, ...props }: Props) => (
  <label className="block">
    <span className="mb-2 block text-xs font-black uppercase tracking-[0.1em] text-journey-wood/70">{label}</span>
    <input required {...props} className={INPUT_CLASS} />
  </label>
);