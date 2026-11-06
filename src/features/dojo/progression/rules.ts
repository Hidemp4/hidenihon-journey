import type { ActivityId } from "../registry";

/*
 * Todos os números do sistema de ligas, troféus e XP. As regras por extenso estão em `REGRAS.md`
 * (mesma pasta): mudou um número aqui, atualize lá também.
 */

/* ---------- Ligas ---------- */

export interface LeagueDef {
  /** Identificador estável (vai para os testes e para o visual); o nome pode mudar à vontade. */
  id: "bronze" | "prata" | "ouro" | "platina" | "diamante" | "imortal" | "tita" | "lendario";
  /** Nome exibido. Os nomes ainda vão mudar: é só trocar aqui. */
  name: string;
  /** A mesma palavra em japonês (legenda ao lado do nome). Mudou o nome, mude esta também. */
  jp: string;
  /** Piso de cada divisão, da III (a mais baixa) para a I. Uma divisão só = liga sem divisões. */
  divisions: readonly number[];
  /** Meta (desempenho mínimo para vencer) no piso da liga, em %. */
  meta: number;
  /** Multiplicador da derrota: as primeiras ligas perdem menos. */
  lossFactor: number;
  /** XP na 1ª vez que alcança a liga (a primeira liga não tem: é onde todos começam). */
  firstReachXp: number;
}

export const LEAGUES: readonly LeagueDef[] = [
  { id: "bronze", name: "Bronze", jp: "銅", divisions: [0, 100, 200], meta: 40, lossFactor: 0.5, firstReachXp: 0 },
  { id: "prata", name: "Prata", jp: "銀", divisions: [300, 450, 600], meta: 55, lossFactor: 0.75, firstReachXp: 100 },
  { id: "ouro", name: "Ouro", jp: "金", divisions: [750, 950, 1150], meta: 65, lossFactor: 1, firstReachXp: 200 },
  { id: "platina", name: "Platina", jp: "白金", divisions: [1350, 1600, 1850], meta: 73, lossFactor: 1, firstReachXp: 300 },
  { id: "diamante", name: "Diamante", jp: "ダイヤ", divisions: [2100, 2400, 2700], meta: 80, lossFactor: 1, firstReachXp: 500 },
  { id: "imortal", name: "Imortal", jp: "不死", divisions: [3000, 3300, 3600], meta: 86, lossFactor: 1, firstReachXp: 750 },
  { id: "tita", name: "Titã", jp: "巨人", divisions: [3900, 4250, 4600], meta: 91, lossFactor: 1, firstReachXp: 1000 },
  { id: "lendario", name: "Lendário", jp: "伝説", divisions: [5000], meta: 95, lossFactor: 1, firstReachXp: 1500 },
];

/** Na última liga a meta continua subindo: +1 ponto a cada tantos troféus, até o teto. */
export const TOP_LEAGUE_META_STEP = 250;
export const MAX_META = 99;

/* ---------- Partida ---------- */

/** Abaixo da meta, mas até este tanto: empate (0 troféus). */
export const DRAW_MARGIN = 3;

export const WIN_BASE = 20;
/** Bônus de vitória pela folga sobre a meta (0 na meta, cheio com desempenho 100). */
export const WIN_MARGIN_BONUS = 10;
export const MAX_WIN = 45;

export const LOSS_BASE = 15;
/** Extra de derrota pela distância abaixo da faixa de empate (cheio com desempenho 0). */
export const LOSS_DISTANCE_PENALTY = 10;
export const MAX_LOSS = 30;

export const VOLUME_FACTOR = { min: 0.5, max: 1.5 } as const;
export const VARIETY_FACTOR = { min: 0.25, max: 1 } as const;
export const MAX_DIFFICULTY = 1.5;

/** Atividades que medem o desempenho sozinhas (os Pergaminhos são autoavaliados: só XP). */
export type RankedActivityId = Exclude<ActivityId, "scrolls">;

export interface RankedActivityRules {
  /** Itens para a sessão valer como partida (respostas, pares, caracteres). */
  minItems: number;
  /** Itens de uma sessão "padrão": volume 1. */
  referenceItems: number;
  /** Itens diferentes para a variedade cheia (`null` = sempre cheia). */
  fullVariety: number | null;
}

export const RANKED_ACTIVITIES: Readonly<Record<RankedActivityId, RankedActivityRules>> = {
  reflexes: { minItems: 15, referenceItems: 30, fullVariety: 12 },
  exam: { minItems: 10, referenceItems: 20, fullVariety: 8 },
  seals: { minItems: 6, referenceItems: 8, fullVariety: null },
  brush: { minItems: 5, referenceItems: 10, fullVariety: 5 },
};

/** Bônus de dificuldade (só nas vitórias; o produto é limitado a `MAX_DIFFICULTY`). */
export const DIFFICULTY_BONUS = {
  kanji: 1.25,
  reflexes: { genin: 1, chunin: 1.1, jonin: 1.25 },
  exam: { round: 1, survival: 1.1, lightning: 1.2 },
  brushRecall: 1.25,
} as const;

/* ---------- Desempenho ---------- */

/** Peso da precisão (o resto é velocidade). */
export const REFLEXES_ACCURACY_WEIGHT = 0.75;
export const EXAM_ACCURACY_WEIGHT = 0.85;

/** Régua de velocidade de cada acerto: 100 até `fullMs`, 0 a partir de `zeroMs`. */
export const REFLEXES_SPEED = { fullMs: 500, zeroMs: 1_500 } as const;
export const EXAM_SPEED = { fullMs: 1_500, zeroMs: 5_000 } as const;
/** Tempo descontado por letra além da primeira (o mesmo do rótulo de reação da Arena). */
export const REFLEXES_TYPING_MS_PER_EXTRA_CHAR = 120;

/** Jogadas por par com memória perfeita (a mesma conta das estrelas dos Selos). */
export const SEALS_PERFECT_MOVES_PER_PAIR = 1.6;

/** Nota do Pincel que já vale desempenho 100 (a nota é rígida: um traço caprichado fica perto de 82). */
export const BRUSH_FULL_SCORE = 85;
/** No Traçar, o caractere com erro de ordem/direção vale esta fração. */
export const BRUSH_ORDER_ERROR_FACTOR = 0.5;

/* ---------- XP ---------- */

export const PRACTICE_XP = {
  /** Por carta avaliada (qualquer nota). */
  scrollsCard: 2,
  /** A carta precisa ficar este tempo antes de virar para contar. */
  scrollsMinThinkMs: 1_000,
  reflexesCorrect: 1,
  examCorrect: 2,
  sealsPair: 4,
  /** Máximo por caractere; proporcional à nota. */
  brushMax: 8,
} as const;

/** Arena e Exame: abaixo desta precisão o XP de prática cai pela metade (chutar não compensa). */
export const LOW_ACCURACY = { threshold: 0.5, factor: 0.5 } as const;

/** Sessão concluída (com o mínimo de volume da atividade; Pergaminhos usam este mínimo). */
export const SESSION_COMPLETE_XP = 10;
export const SCROLLS_MIN_CARDS = 5;

export const RESULT_XP = { win: 15, draw: 5, loss: 0 } as const;

export const DAILY_BONUS = { base: 20, perStreakDay: 5, maxStreakBonus: 50 } as const;

export const MISSION_TASK_XP = 25;
export const MISSION_COMPLETE_XP = 50;

/* ---------- Nível ---------- */

/** XP para passar do nível n para o n+1: `LEVEL_BASE_XP + LEVEL_STEP_XP × (n − 1)`. */
export const LEVEL_BASE_XP = 100;
export const LEVEL_STEP_XP = 25;

/* ---------- Servidor ---------- */

/** O servidor recusa fora disto (as mesmas faixas estão no SQL). */
export const SERVER_LIMITS = { maxXp: 3_000, maxWin: MAX_WIN, maxLoss: MAX_LOSS } as const;
