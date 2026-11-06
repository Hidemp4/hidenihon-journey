import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { PendingResult, ProgressTotals } from "./rewards";

/*
 * Conversa com o Supabase (tabelas e funções em `supabase/schema.sql`). O resto do sistema não sabe
 * que existe servidor: só recebe totais ou um `RemoteError`.
 */

/**
 * - `network`: sem conexão (tenta de novo depois);
 * - `unavailable`: Supabase não configurado ou SQL ainda não aplicado (guarda e tenta depois);
 * - `rejected`: o servidor recusou o resultado (fora das regras): não adianta reenviar.
 */
export type RemoteErrorKind = "network" | "unavailable" | "rejected";

export class RemoteError extends Error {
  readonly kind: RemoteErrorKind;

  constructor(kind: RemoteErrorKind, message: string) {
    super(message);
    this.kind = kind;
    this.name = "RemoteError";
  }
}

export function isRemoteEnabled() {
  return isSupabaseConfigured && supabase != null;
}

/** Códigos do PostgREST/Postgres para "tabela ou função não existe" (o SQL não foi aplicado). */
const MISSING_CODES = new Set(["PGRST202", "PGRST205", "42P01", "42883"]);
/** `raise ... using errcode = '22023'` no SQL: valor fora das regras. */
const REJECTED_CODES = new Set(["22023", "23514"]);

interface PostgrestLikeError {
  code?: string;
  message?: string;
}

function toRemoteError(error: PostgrestLikeError): RemoteError {
  const code = error.code ?? "";
  if (MISSING_CODES.has(code)) return new RemoteError("unavailable", error.message ?? "Ranking indisponível.");
  if (REJECTED_CODES.has(code)) return new RemoteError("rejected", error.message ?? "Resultado recusado.");
  return new RemoteError("network", error.message ?? "Sem conexão.");
}

function client() {
  if (!isRemoteEnabled() || !supabase) throw new RemoteError("unavailable", "Supabase não configurado.");
  return supabase;
}

interface TotalsRow {
  xp: number | string;
  trophies: number;
  best_trophies: number;
  wins: number;
  draws: number;
  losses: number;
}

function toTotals(row: TotalsRow): ProgressTotals {
  // `bigint` chega como texto quando passa do limite seguro do JS; aqui nunca passa, mas converte igual.
  return {
    xp: Number(row.xp) || 0,
    trophies: row.trophies ?? 0,
    bestTrophies: row.best_trophies ?? 0,
    wins: row.wins ?? 0,
    draws: row.draws ?? 0,
    losses: row.losses ?? 0,
  };
}

async function call<T>(request: PromiseLike<{ data: T | null; error: PostgrestLikeError | null }>): Promise<T | null> {
  let response: { data: T | null; error: PostgrestLikeError | null };
  try {
    response = await request;
  } catch (error) {
    // `fetch` lança TypeError sem conexão.
    throw new RemoteError("network", error instanceof Error ? error.message : "Sem conexão.");
  }
  if (response.error) throw toRemoteError(response.error);
  return response.data;
}

/** Envia um resultado. O servidor ignora repetidos (mesma chave) e devolve os totais atuais. */
export async function pushResult(result: PendingResult): Promise<ProgressTotals> {
  const rows = await call<TotalsRow[]>(
    client().rpc("dojo_record_result", {
      p_source_id: result.key,
      p_activity: result.activity,
      p_xp: result.xp,
      p_trophies: result.trophies,
      p_outcome: result.outcome,
    })
  );
  const row = rows?.[0];
  if (!row) throw new RemoteError("network", "Resposta vazia do servidor.");
  return toTotals(row);
}

/** Totais da própria conta; `null` se ainda não jogou (sem linha no servidor). */
export async function fetchOwnTotals(userId: string): Promise<ProgressTotals | null> {
  const row = await call<TotalsRow>(
    client().from("dojo_players").select("xp, trophies, best_trophies, wins, draws, losses").eq("user_id", userId).maybeSingle()
  );
  return row ? toTotals(row) : null;
}

export interface LeaderboardRow {
  position: number;
  name: string;
  trophies: number;
  xp: number;
  isMe: boolean;
  /** Está entre os primeiros (a sua linha pode vir de fora deles). */
  inTop: boolean;
}

interface LeaderboardDbRow {
  rank_position: number | string;
  name: string | null;
  trophies: number;
  xp: number | string;
  is_me: boolean;
  in_top: boolean;
}

export const LEADERBOARD_SIZE = 50;

/** Os primeiros do ranking e, se estiver fora deles, a própria posição. */
export async function fetchLeaderboard(limit = LEADERBOARD_SIZE): Promise<LeaderboardRow[]> {
  const rows = await call<LeaderboardDbRow[]>(client().rpc("dojo_leaderboard", { p_limit: limit }));
  return (rows ?? []).map((row) => ({
    position: Number(row.rank_position) || 0,
    name: row.name?.trim() || "Estudante HideNihon",
    trophies: row.trophies ?? 0,
    xp: Number(row.xp) || 0,
    isMe: row.is_me === true,
    inTop: row.in_top !== false,
  }));
}
