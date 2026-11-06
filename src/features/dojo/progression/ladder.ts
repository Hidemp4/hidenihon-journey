import { LEAGUES, LEVEL_BASE_XP, LEVEL_STEP_XP, MAX_META, TOP_LEAGUE_META_STEP, type LeagueDef } from "./rules";

/* ---------- Ligas ---------- */

const DIVISION_NAMES = ["III", "II", "I"] as const;

export interface LeagueStanding {
  league: LeagueDef;
  /** Posição da liga (0 = a primeira). */
  leagueIndex: number;
  /** 0 = III (a mais baixa). `null` quando a liga não tem divisões. */
  division: number | null;
  /** "Ouro II" ou "Lendário". */
  label: string;
  /** Piso da divisão atual. */
  floor: number;
  /** Piso da próxima divisão; `null` no topo. */
  nextFloor: number | null;
  /** Rótulo da próxima divisão ("Ouro I"); `null` no topo. */
  nextLabel: string | null;
  /** 0–1 dentro da divisão (1 no topo). */
  progress: number;
}

function divisionLabel(league: LeagueDef, division: number) {
  if (league.divisions.length === 1) return league.name;
  return `${league.name} ${DIVISION_NAMES[division] ?? ""}`.trim();
}

function clampTrophies(trophies: number) {
  return Number.isFinite(trophies) ? Math.max(0, Math.floor(trophies)) : 0;
}

export function leagueIndexFor(trophies: number): number {
  const value = clampTrophies(trophies);
  let index = 0;
  LEAGUES.forEach((league, i) => {
    if (value >= league.divisions[0]) index = i;
  });
  return index;
}

/** Todas as divisões em ordem, com o piso de cada uma (a escada inteira). */
export function allDivisions(): ReadonlyArray<{ leagueIndex: number; division: number | null; label: string; floor: number }> {
  return LEAGUES.flatMap((league, leagueIndex) =>
    league.divisions.map((floor, division) => ({
      leagueIndex,
      division: league.divisions.length === 1 ? null : division,
      label: divisionLabel(league, division),
      floor,
    }))
  );
}

export function standingFor(trophies: number): LeagueStanding {
  const value = clampTrophies(trophies);
  const ladder = allDivisions();
  let position = 0;
  ladder.forEach((step, i) => {
    if (value >= step.floor) position = i;
  });

  const current = ladder[position];
  const next = ladder[position + 1] ?? null;
  const league = LEAGUES[current.leagueIndex];

  return {
    league,
    leagueIndex: current.leagueIndex,
    division: current.division,
    label: current.label,
    floor: current.floor,
    nextFloor: next?.floor ?? null,
    nextLabel: next?.label ?? null,
    progress: next ? (value - current.floor) / (next.floor - current.floor) : 1,
  };
}

/**
 * Meta (desempenho mínimo para vencer) com esses troféus. Sobe em linha reta entre o piso de uma liga
 * e o da seguinte; na última, +1 a cada `TOP_LEAGUE_META_STEP` troféus até `MAX_META`. Inteira.
 */
export function metaFor(trophies: number): number {
  const value = clampTrophies(trophies);
  const index = leagueIndexFor(value);
  const league = LEAGUES[index];
  const next = LEAGUES[index + 1];

  const raw = next
    ? league.meta + ((next.meta - league.meta) * (value - league.divisions[0])) / (next.divisions[0] - league.divisions[0])
    : league.meta + Math.floor((value - league.divisions[0]) / TOP_LEAGUE_META_STEP);
  return Math.min(MAX_META, Math.round(raw));
}

/* ---------- Nível ---------- */

/** XP para passar do nível `level` para o seguinte. */
export function xpToAdvance(level: number): number {
  return LEVEL_BASE_XP + LEVEL_STEP_XP * (Math.max(1, Math.floor(level)) - 1);
}

/** XP total para chegar ao nível `level` (nível 1 = 0). */
export function totalXpForLevel(level: number): number {
  const n = Math.max(1, Math.floor(level)) - 1;
  // (n)(n − 1) é sempre par: a divisão é exata.
  return LEVEL_BASE_XP * n + (LEVEL_STEP_XP * n * (n - 1)) / 2;
}

export interface LevelProgress {
  level: number;
  /** XP já feito dentro do nível. */
  intoLevel: number;
  /** XP do nível inteiro (para passar ao próximo). */
  forNext: number;
  /** 0–1. */
  progress: number;
}

export function levelFor(xp: number): LevelProgress {
  const total = Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0;
  // Fórmula fechada (raiz da quadrática) e ajuste fino: evita um laço de milhares de níveis.
  const a = LEVEL_STEP_XP / 2;
  const b = LEVEL_BASE_XP - LEVEL_STEP_XP / 2;
  let level = Math.max(1, Math.floor((-b + Math.sqrt(b * b + 4 * a * total)) / (2 * a)) + 1);
  while (level > 1 && totalXpForLevel(level) > total) level -= 1;
  while (totalXpForLevel(level + 1) <= total) level += 1;

  const forNext = xpToAdvance(level);
  const intoLevel = total - totalXpForLevel(level);
  return { level, intoLevel, forNext, progress: intoLevel / forNext };
}
