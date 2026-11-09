import { Fragment, useCallback, useEffect, useId, useState, type ReactNode } from "react";
import { RotateCcw, Trophy } from "lucide-react";
import { getActivity } from "../registry";
import { ActivityShell } from "../shared/components/ActivityShell";
import { Panel, SectionTitle, StatTile } from "../shared/components/ui";
import { useArenaAudio } from "../shared/useArenaAudio";
import { LeagueEmblem } from "./components/LeagueEmblem";
import { MeterBar } from "./components/RankCard";
import { formatSigned, matchLine, trophiesText } from "./copy";
import { levelFor, standingFor } from "./ladder";
import { fetchLeaderboard, isRemoteEnabled, RemoteError, type LeaderboardRow } from "./remote";
import {
  DRAW_MARGIN,
  LEAGUES,
  MAX_LOSS,
  MAX_WIN,
  MISSION_COMPLETE_XP,
  MISSION_TASK_XP,
  RANKED_ACTIVITIES,
  RESULT_XP,
  SESSION_COMPLETE_XP,
  DAILY_BONUS,
  LEVEL_BASE_XP,
  LEVEL_STEP_XP,
  type RankedActivityId,
} from "./rules";
import { progressionStore } from "./store";
import { useProgression } from "./useProgression";

const RANKING_ACTIVITY = { name: "Ranking", kanji: "番付" };

type BoardState =
  | { status: "loading" }
  | { status: "ready"; rows: LeaderboardRow[] }
  | { status: "local" }
  | { status: "unavailable" }
  | { status: "offline" };

const UNITS: Readonly<Record<RankedActivityId, string>> = {
  reflexes: "respostas",
  exam: "respostas",
  seals: "pares formados",
  brush: "caracteres desenhados",
};

const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

function Section({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <Panel>
      <SectionTitle eyebrow={eyebrow} title={title} />
      {children}
    </Panel>
  );
}

/* ---------- Classificação ---------- */

function useLeaderboard() {
  const [state, setState] = useState<BoardState>(() => (isRemoteEnabled() ? { status: "loading" } : { status: "local" }));

  const load = useCallback(async () => {
    if (!isRemoteEnabled()) {
      setState({ status: "local" });
      return;
    }
    setState({ status: "loading" });
    // Envia o que está pendente antes: a sua linha no ranking já sai atualizada.
    await progressionStore.sync();
    try {
      setState({ status: "ready", rows: await fetchLeaderboard() });
    } catch (error) {
      setState({ status: error instanceof RemoteError && error.kind === "unavailable" ? "unavailable" : "offline" });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { state, reload: load };
}

function BoardRow({ row }: { row: LeaderboardRow }) {
  const standing = standingFor(row.trophies);
  const level = levelFor(row.xp).level;

  return (
    <li
      className={`grid grid-cols-[2.75rem_auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border-2 px-3 py-2.5 ${
        row.isMe ? "border-journey-orange/60 bg-journey-orange/10" : "border-journey-wood/10 bg-white/80"
      }`}
    >
      <span className="text-center font-display text-lg font-black text-journey-ink">
        {row.position}º
      </span>
      <LeagueEmblem standing={standing} size="sm" />
      <span className="min-w-0">
        <span className="flex items-center gap-2 truncate text-sm font-black text-journey-ink">
          <span className="truncate">{row.name}</span>
          {row.isMe && <span className="shrink-0 rounded-full bg-journey-orange px-2 py-0.5 text-[11px] font-black uppercase tracking-[0.08em] text-white">Você</span>}
        </span>
        <span className="block truncate text-xs font-semibold text-journey-ink/75">
          {standing.label} · nível {level}
        </span>
      </span>
      <span className="flex items-center gap-1 text-sm font-black text-journey-ink">
        <Trophy size={15} strokeWidth={2.6} aria-hidden="true" className="text-journey-orange" />
        {row.trophies.toLocaleString("pt-BR")}
        <span className="sr-only"> troféus</span>
      </span>
    </li>
  );
}

function BoardMessage({ children, onRetry }: { children: ReactNode; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-journey-wood/25 bg-journey-sand/60 px-4 py-3 text-sm font-semibold text-journey-ink">
      <p>{children}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-journey-wood/20 bg-white px-4 text-sm font-black text-journey-ink transition hover:border-journey-orange/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-journey-orange/40"
        >
          <RotateCcw size={16} aria-hidden="true" /> Tentar de novo
        </button>
      )}
    </div>
  );
}

function Leaderboard() {
  const { state, reload } = useLeaderboard();

  let body: ReactNode;
  if (state.status === "loading") body = <BoardMessage>Carregando o ranking…</BoardMessage>;
  else if (state.status === "local") body = <BoardMessage>O ranking online não está ligado neste app (sem servidor configurado). O seu progresso fica salvo neste aparelho.</BoardMessage>;
  else if (state.status === "unavailable") body = <BoardMessage>O ranking online ainda não foi ativado no servidor. O seu progresso fica guardado e é enviado assim que ele estiver no ar.</BoardMessage>;
  else if (state.status === "offline") body = <BoardMessage onRetry={() => void reload()}>Sem conexão com o servidor. O seu progresso fica guardado e é enviado depois.</BoardMessage>;
  else if (state.rows.length === 0) body = <BoardMessage>Ninguém treinou no Dojô ainda. Faça uma sessão e seja o primeiro!</BoardMessage>;
  else
    body = (
      <ol aria-label="Classificação" className="space-y-2">
        {state.rows.map((row, index) => (
          <Fragment key={`${row.position}-${index}`}>
            {/* A sua linha vem por último quando você está fora dos primeiros. */}
            {!row.inTop && (
              <li aria-hidden="true" className="text-center text-lg font-black leading-none text-journey-wood">
                …
              </li>
            )}
            <BoardRow row={row} />
          </Fragment>
        ))}
      </ol>
    );

  return (
    <Section eyebrow="Classificação" title="Ranking do Dojô">
      <div aria-live="polite" aria-busy={state.status === "loading"}>
        {body}
      </div>
    </Section>
  );
}

/* ---------- Você ---------- */

/** Placa pequena das partidas (a `StatTile` do cabeçalho é alta demais para três lado a lado aqui). */
function MatchTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-xl border-2 border-white/15 bg-black/30 px-2.5 py-1.5">
      <p className="truncate text-[11px] font-black uppercase tracking-[0.06em] text-white/75">{label}</p>
      <p className="font-display text-lg font-black leading-tight text-white">{value.toLocaleString("pt-BR")}</p>
    </div>
  );
}

/**
 * Sua liga. No celular ela era a tela inteira (brasão grande, placas altas e quatro linhas de números)
 * e empurrava a classificação para longe: agora o brasão encolhe, as placas são baixas e os números
 * viram uma linha corrida.
 */
function YouCard() {
  const titleId = useId();
  const { standing, totals, level, meta, pendingCount, syncStatus } = useProgression();
  const missing = standing.nextFloor == null ? 0 : standing.nextFloor - totals.trophies;
  const matches = totals.wins + totals.draws + totals.losses;

  return (
    <section
      aria-labelledby={titleId}
      className="relative isolate overflow-hidden rounded-[1.75rem] border-2 border-[hsl(var(--journey-wood-deep))] bg-journey-forest-deep p-4 text-white shadow-[0_6px_0_hsl(var(--journey-wood-deep)/.35)] sm:rounded-[2rem] sm:p-6 sm:shadow-[0_8px_0_hsl(var(--journey-wood-deep)/.35)]"
    >
      <div aria-hidden="true" className="journey-leaf-pattern absolute inset-0 -z-10 opacity-15" />
      <div className="flex items-center gap-3 sm:gap-4">
        <LeagueEmblem standing={standing} size="lg" className="h-[63px] w-14 sm:h-[99px] sm:w-[88px]" />
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-journey-gold">
            Sua liga ·{" "}
            <span lang="ja" className="font-jp">
              {standing.league.jp}
            </span>
          </p>
          <h2 id={titleId} className="mt-1 font-display text-2xl font-black leading-none tracking-[-0.03em] sm:text-3xl">
            {standing.label}
          </h2>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm font-black text-journey-gold sm:mt-2">
            <Trophy size={16} strokeWidth={2.6} aria-hidden="true" /> {trophiesText(totals.trophies)}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2.5 sm:mt-5 sm:space-y-3">
        <div>
          <p className="mb-1.5 text-xs font-bold text-white/85">
            {standing.nextLabel ? `Faltam ${trophiesText(missing)} para ${standing.nextLabel}` : "Você está no topo da escada"}
          </p>
          <MeterBar progress={standing.progress} tone="gold" />
        </div>
        <div>
          <p className="mb-1.5 flex justify-between gap-3 text-xs font-bold text-white/85">
            <span>
              Nível <strong className="font-black text-white">{level.level}</strong>
            </span>
            <span>
              {level.intoLevel.toLocaleString("pt-BR")} de {level.forNext.toLocaleString("pt-BR")} XP
            </span>
          </p>
          <MeterBar progress={level.progress} tone="orange" />
        </div>
      </div>

      <div role="group" aria-label="Suas partidas" className="mt-4 grid grid-cols-3 gap-2 sm:mt-5">
        <MatchTile label="Vitórias" value={totals.wins} />
        <MatchTile label="Empates" value={totals.draws} />
        <MatchTile label="Derrotas" value={totals.losses} />
      </div>
      <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-white/85">
        <div className="flex gap-1">
          <dt>Meta para vencer agora:</dt>
          <dd className="font-black text-white">{meta}%</dd>
        </div>
        <div className="flex gap-1">
          <dt>Recorde:</dt>
          <dd className="font-black text-white">{trophiesText(totals.bestTrophies)}</dd>
        </div>
        <div className="flex gap-1">
          <dt>XP total:</dt>
          <dd className="font-black text-white">{totals.xp.toLocaleString("pt-BR")}</dd>
        </div>
        <div className="flex gap-1">
          <dt>Partidas ranqueadas:</dt>
          <dd className="font-black text-white">{matches.toLocaleString("pt-BR")}</dd>
        </div>
      </dl>
      {pendingCount > 0 && syncStatus !== "syncing" && (
        <p className="mt-3 rounded-xl bg-black/30 px-3 py-2 text-xs font-semibold text-white/90">
          {pendingCount === 1 ? "1 resultado esperando" : `${pendingCount} resultados esperando`} para ir ao servidor.
        </p>
      )}
    </section>
  );
}

/* ---------- Escada ---------- */

function Ladder() {
  const { standing } = useProgression();

  return (
    <Section eyebrow="Ligas" title="A escada">
      <ol aria-label="Ligas, da mais alta para a primeira" className="space-y-2">
        {[...LEAGUES].reverse().map((league) => {
          const index = LEAGUES.indexOf(league);
          const current = index === standing.leagueIndex;
          return (
            <li
              key={league.id}
              aria-current={current ? "true" : undefined}
              className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 ${current ? "border-journey-orange/60 bg-journey-orange/10" : "border-journey-wood/10 bg-white/80"}`}
            >
              <LeagueEmblem standing={{ league, leagueIndex: index, division: null }} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-2 text-sm font-black text-journey-ink">
                  {league.name}
                  <span lang="ja" className="font-jp text-xs font-bold text-journey-wood">
                    {league.jp}
                  </span>
                  {current && <span className="text-[11px] font-black uppercase tracking-[0.08em] text-journey-orange">Você está aqui</span>}
                </span>
                <span className="block text-xs font-semibold text-journey-ink/75">
                  {league.divisions.length > 1
                    ? league.divisions.map((floor, division) => `${["III", "II", "I"][division]} ${floor.toLocaleString("pt-BR")}`).join(" · ")
                    : `A partir de ${trophiesText(league.divisions[0])}`}
                </span>
              </span>
              <span className="shrink-0 text-right text-xs font-bold text-journey-ink/80">
                meta
                <span className="block font-display text-base font-black text-journey-ink">{league.meta}%</span>
              </span>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}

/* ---------- Como funciona ---------- */

function Rules() {
  const ranked = Object.entries(RANKED_ACTIVITIES) as Array<[RankedActivityId, (typeof RANKED_ACTIVITIES)[RankedActivityId]]>;

  return (
    <Section eyebrow="Regras" title="Como funciona">
      <div className="space-y-4 text-sm font-semibold leading-relaxed text-journey-ink/85">
        <div>
          <h3 className="font-black text-journey-ink">Troféus (sobem e descem)</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>Cada partida dá um desempenho de 0 a 100. Bateu a meta da sua faixa: vitória, de +1 a +{MAX_WIN} troféus.</li>
            <li>Até {DRAW_MARGIN} pontos abaixo da meta: empate, sem troféus. Mais abaixo: derrota, de −1 a −{MAX_LOSS}.</li>
            <li>A meta sobe junto com os troféus: quanto mais alto, mais difícil vencer. No Bronze a derrota tira metade e na Prata três quartos.</li>
            <li>Sessões maiores, mais variadas e mais difíceis (kanji, Relâmpago, Avançado, De memória) valem mais nas vitórias.</li>
            <li>Sair no meio não salva da derrota, e nunca vale vitória.</li>
          </ul>
        </div>
        <div>
          <h3 className="font-black text-journey-ink">O que vale troféus</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {ranked.map(([id, rules]) => (
              <li key={id}>
                {getActivity(id).name}: a partir de {rules.minItems} {UNITS[id]}.
              </li>
            ))}
            <li>Pergaminhos, revisão dos erros e Estudar ordem só dão XP.</li>
          </ul>
        </div>
        <div>
          <h3 className="font-black text-journey-ink">XP e nível (só sobem)</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>Todo treino dá XP de prática. Sessão concluída: +{SESSION_COMPLETE_XP}. Vitória: +{RESULT_XP.win}. Empate: +{RESULT_XP.draw}.</li>
            <li>
              Primeiro treino do dia: +{DAILY_BONUS.base}, mais {DAILY_BONUS.perStreakDay} por dia de sequência (até +{DAILY_BONUS.maxStreakBonus}).
            </li>
            <li>
              Missão do dia: +{MISSION_TASK_XP} por tarefa e +{MISSION_COMPLETE_XP} com as três. A primeira vez em cada liga também dá XP.
            </li>
            <li>
              Do nível n para o n + 1: {LEVEL_BASE_XP} + {LEVEL_STEP_XP} × (n − 1) XP.
            </li>
          </ul>
        </div>
      </div>
    </Section>
  );
}

/* ---------- Histórico ---------- */

function History() {
  const { rewards } = useProgression();

  return (
    <Section eyebrow="Histórico" title="Últimas sessões">
      {rewards.length === 0 ? (
        <p className="text-sm font-semibold text-journey-ink/75">Nenhuma sessão ainda. Escolha um treino no Dojô.</p>
      ) : (
        <ul aria-label="Últimas sessões" className="space-y-2">
          {rewards.map((reward) => (
            <li key={reward.key} className="flex items-center justify-between gap-3 rounded-xl border-2 border-journey-wood/10 bg-white/80 px-3 py-2.5">
              <span className="min-w-0">
                <span className="block truncate text-sm font-black text-journey-ink">{getActivity(reward.activity).name}</span>
                <span className="block truncate text-xs font-semibold text-journey-ink/75">
                  {dateFormat.format(reward.at)} ·{" "}
                  {matchLine(reward.match, reward.activity)}
                </span>
              </span>
              <span className="shrink-0 text-right text-xs font-black text-journey-ink">
                {reward.match.ranked && (
                  <span className="block">
                    {formatSigned(reward.match.trophies)} <span aria-hidden="true">🏆</span>
                    <span className="sr-only"> troféus</span>
                  </span>
                )}
                <span className="block text-journey-ink/80">{formatSigned(reward.xp)} XP</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

/* ---------- Página ---------- */

export default function RankingPage() {
  const audio = useArenaAudio();
  const { totals, level } = useProgression();

  return (
    <ActivityShell
      activity={RANKING_ACTIVITY}
      audioEnabled={audio.enabled}
      onToggleAudio={audio.toggle}
      eyebrow="Ligas, troféus e nível"
      // No celular os troféus e o nível já estão no cartão da liga logo abaixo: o cabeçalho fica só
      // com a barra e uma faixa baixa de ninjas, e a classificação aparece na primeira tela.
      mobileHeader="minimal"
      stats={
        <div role="group" aria-label="Resumo" className="grid grid-cols-2 gap-2">
          <StatTile label="Troféus" value={totals.trophies.toLocaleString("pt-BR")} />
          <StatTile label="Nível" value={String(level.level)} />
        </div>
      }
    >
      <main className="relative mx-auto grid max-w-6xl gap-5 px-5 pt-5 sm:gap-6 sm:px-8 sm:pt-8 lg:grid-cols-2 lg:px-12">
        <div className="space-y-5 sm:space-y-6">
          <YouCard />
          <Leaderboard />
        </div>
        <div className="space-y-5 sm:space-y-6">
          <Ladder />
          <Rules />
          <History />
        </div>
      </main>
    </ActivityShell>
  );
}
