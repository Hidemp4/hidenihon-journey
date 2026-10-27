import { Leaf } from "lucide-react";
import { Link } from "react-router-dom";

export const LandingHeader = () => (
  <div className="relative border-b border-journey-wood/10 bg-journey-sand">
    <div className="journey-leaf-pattern absolute inset-0 opacity-20" />
    <header className="relative mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
      <Link to="/" className="flex items-center gap-3" aria-label="HideNihon início">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-journey-forest-deep text-white shadow-[0_0_0_4px_hsl(var(--journey-orange)/.16)]">
          <Leaf size={20} strokeWidth={2.6} />
        </div>
        <div>
          <p className="font-display text-lg font-black leading-none tracking-[-0.04em]">HideNihon</p>
          <p className="mt-1 font-jp text-[9px] font-bold tracking-[0.2em] text-journey-leaf">日本語の道</p>
        </div>
      </Link>

      <nav className="flex items-center gap-2" aria-label="Navegação principal">
        <a href="#como-funciona" className="hidden rounded-full px-4 py-2 text-xs font-extrabold text-journey-ink/60 transition hover:bg-white/50 hover:text-journey-ink sm:inline-flex">
          Como funciona
        </a>
        <Link to="/login" className="inline-flex min-h-11 items-center rounded-full bg-journey-forest-deep px-5 text-xs font-extrabold text-white transition hover:bg-journey-forest active:scale-95">
          Entrar
        </Link>
      </nav>
    </header>
  </div>
);