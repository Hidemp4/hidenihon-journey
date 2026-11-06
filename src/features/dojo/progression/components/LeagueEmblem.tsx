import { useId } from "react";
import type { LeagueStanding } from "../ladder";
import { LEAGUES } from "../rules";

const SIZES = { sm: 36, md: 56, lg: 88 } as const;
const NUMERALS = ["III", "II", "I"] as const;

/** Quanto mais alta a liga, mais enfeite: borda dourada a partir do Diamante, coroa no Lendário. */
const GOLD_RIM_FROM = LEAGUES.findIndex((league) => league.id === "diamante");

/**
 * Brasão da liga: escudo na cor da liga com a divisão (III, II, I) numa faixa.
 * Decorativo: quem usa leitor de tela recebe o nome da liga no texto ao lado.
 */
export function LeagueEmblem({ standing, size = "md", className = "" }: { standing: Pick<LeagueStanding, "league" | "leagueIndex" | "division">; size?: keyof typeof SIZES; className?: string }) {
  // `useId` traz ":" e `url(#…)` com ":" falha em alguns navegadores.
  const gradientId = `league-shine-${useId().replace(/:/g, "")}`;
  const { league, leagueIndex, division } = standing;
  const px = SIZES[size];
  const top = leagueIndex === LEAGUES.length - 1;
  const goldRim = leagueIndex >= GOLD_RIM_FROM;
  const color = `hsl(var(--league-${league.id}))`;

  return (
    <svg aria-hidden="true" width={px} height={Math.round(px * 1.12)} viewBox="0 0 64 72" className={`shrink-0 drop-shadow-[0_3px_0_hsl(var(--journey-wood-deep)/.45)] ${className}`}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="white" stopOpacity="0.38" />
          <stop offset="0.55" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      {top && <path d="M18 9 L22 1 L28 7 L32 0 L36 7 L42 1 L46 9 Z" style={{ fill: "hsl(var(--journey-gold))" }} />}
      <path
        d="M32 6 L57 15 V36 C57 51 46 62 32 68 C18 62 7 51 7 36 V15 Z"
        style={{ fill: color, stroke: goldRim ? "hsl(var(--journey-gold))" : "hsl(var(--journey-wood-deep))" }}
        strokeWidth={goldRim ? 4 : 3}
        strokeLinejoin="round"
      />
      <path d="M32 6 L57 15 V36 C57 51 46 62 32 68 C18 62 7 51 7 36 V15 Z" fill={`url(#${gradientId})`} />
      {/* Estrela no centro (a liga); a faixa embaixo traz a divisão. */}
      <path
        d="M32 18 L35.6 26.4 L44.5 27.2 L37.8 33.1 L39.8 41.9 L32 37.2 L24.2 41.9 L26.2 33.1 L19.5 27.2 L28.4 26.4 Z"
        style={{ fill: "hsl(var(--journey-surface))", stroke: "hsl(var(--journey-wood-deep) / .35)" }}
        strokeWidth={1.2}
      />
      {division != null ? (
        <>
          <rect x="17" y="46" width="30" height="13" rx="4" style={{ fill: "hsl(var(--journey-forest-deep))" }} />
          <text x="32" y="56.2" textAnchor="middle" fontSize="10" fontWeight="900" fontFamily="var(--font-display)" style={{ fill: "hsl(var(--journey-gold))" }}>
            {NUMERALS[division]}
          </text>
        </>
      ) : (
        <rect x="21" y="48" width="22" height="7" rx="3.5" style={{ fill: "hsl(var(--journey-gold))" }} />
      )}
    </svg>
  );
}
