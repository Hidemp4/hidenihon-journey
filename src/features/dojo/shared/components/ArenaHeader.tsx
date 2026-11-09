import type { ReactNode } from "react";
import { Zap } from "lucide-react";
import { NinjaArena } from "./NinjaArena";

interface ArenaHeaderProps {
  /** Em treino o cabeçalho encolhe e vira só a arena com o placar. */
  compact: boolean;
  /**
   * Batalha com digitação: no celular a faixa dos ninjas fica baixa e o placar some, para o kana e o
   * campo caberem acima do teclado virtual. A partir do `sm` é igual ao compacto.
   */
  slim?: boolean;
  /** Barra do topo da casca de atividade (voltar ao Dojô, título, áudio). */
  bar?: ReactNode;
  eyebrow?: ReactNode;
  /** Chamada grande. Quando a barra já tem o h1 da página, ela vira h2. */
  headline?: ReactNode;
  headlineAs?: "h1" | "h2";
  description?: ReactNode;
  /** Placar e/ou botões à direita (no celular, abaixo do texto). */
  aside?: ReactNode;
  reduceMotion: boolean;
}

function spacingFor(compact: boolean, slim: boolean) {
  // Ninjas a 2× ocupam uns 60px de pé: 4,5rem ainda mostra o corpo inteiro abaixo da barra.
  if (slim) return { container: "pb-[4.5rem] pt-3 sm:pb-32 sm:pt-5 lg:pb-44", bar: "sm:mb-4", aside: "hidden sm:flex" };
  if (compact) return { container: "pb-32 pt-5 lg:pb-44", bar: "mb-4", aside: "flex" };
  return { container: "pb-36 pt-8 md:pb-40 md:pt-12 lg:pb-52", bar: "mb-6 md:mb-8", aside: "flex" };
}

export function ArenaHeader({
  compact,
  slim = false,
  bar,
  eyebrow,
  headline,
  headlineAs: Headline = "h1",
  description,
  aside,
  reduceMotion,
}: ArenaHeaderProps) {
  const hasIntro = Boolean(eyebrow || headline || description);
  const spacing = spacingFor(compact, slim);

  return (
    <header className="relative isolate overflow-hidden border-b-[6px] border-[hsl(var(--journey-wood-deep))] bg-journey-forest-deep text-white">
      <NinjaArena reducedMotion={reduceMotion} className="absolute inset-0 -z-20" />
      {/* Escurece o topo da cena para o texto ficar legível; o chão (onde estão os ninjas) fica limpo. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,hsl(var(--journey-forest-deep)/.82)_0%,hsl(var(--journey-forest-deep)/.4)_42%,transparent_72%)]"
      />

      <div className={`mx-auto max-w-6xl px-5 sm:px-8 lg:px-12 ${spacing.container}`}>
        {bar && <div className={spacing.bar}>{bar}</div>}

        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          {hasIntro && (
            <div className="max-w-xl">
              {eyebrow && (
                <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-journey-gold sm:text-xs">
                  <Zap size={15} fill="currentColor" aria-hidden="true" /> {eyebrow}
                </p>
              )}
              {headline && (
                <Headline className="mt-3 font-display text-4xl font-black leading-[0.95] tracking-[-0.05em] [text-shadow:0_3px_0_hsl(var(--journey-forest-deep)/.55)] sm:text-6xl">
                  {headline}
                </Headline>
              )}
              {description && (
                <p className="mt-4 max-w-md text-sm font-semibold leading-6 text-white/90 [text-shadow:0_1px_0_hsl(var(--journey-forest-deep)/.6)] sm:text-base">
                  {description}
                </p>
              )}
            </div>
          )}

          {/* `ml-auto`: sem texto à esquerda, o placar continua encostado à direita no desktop. */}
          {aside && <div className={`${spacing.aside} items-start gap-3 md:ml-auto`}>{aside}</div>}
        </div>
      </div>
    </header>
  );
}
