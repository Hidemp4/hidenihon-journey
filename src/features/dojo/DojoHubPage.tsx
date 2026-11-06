import { useEffect, useId, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { ChevronRight, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { FloatingLearningNav } from "@/components/navigation/FloatingLearningNav";
import { HubMission } from "./HubMission";
import { RankCard } from "./progression/components/RankCard";
import { DOJO_ACTIVITIES, getActivity, type ActivityBadge, type DojoActivity } from "./registry";
import { computeStreak, countsForDay, loadActivityLog, type Streak } from "./shared/activityLog";
import { localDayNumber, systemUtcOffset } from "./shared/calendar";
import { dailyMission, missionProgress, type MissionProgress, type MissionTaskProgress } from "./shared/dailyMission";
import { ArenaHeader } from "./shared/components/ArenaHeader";
import { AudioToggle, SectionTitle, StatTile } from "./shared/components/ui";
import { masteryStore, type MasterySummary } from "./shared/mastery";
import { useArenaAudio } from "./shared/useArenaAudio";

const BADGE_TONES: Record<ActivityBadge["tone"], string> = {
  accent: "border-journey-forest-deep bg-journey-forest-deep text-journey-gold",
  neutral: "border-journey-wood/15 bg-journey-sand text-journey-ink",
  muted: "border-dashed border-journey-wood/40 bg-transparent text-journey-wood",
};

/** Kanji de 4 caracteres (中忍試験) vira 2×2 para caber no emblema sem encolher demais. */
function emblemLines(kanji: string) {
  const chars = Array.from(kanji);
  return chars.length > 2 ? [chars.slice(0, 2).join(""), chars.slice(2).join("")] : [kanji];
}

function ActivityEmblem({ kanji, ready }: { kanji: string; ready: boolean }) {
  const single = Array.from(kanji).length === 1;

  return (
    <div
      aria-hidden="true"
      className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border-2 border-[hsl(var(--journey-wood-deep))] bg-journey-forest-deep shadow-[0_4px_0_hsl(var(--journey-wood-deep)/.45)]"
    >
      <div className="journey-leaf-pattern absolute inset-0 opacity-25" />
      <span
        className={`relative text-center font-jp font-black leading-none ${single ? "text-5xl" : "text-3xl"} ${
          ready ? "text-journey-gold" : "text-journey-sand"
        }`}
      >
        {emblemLines(kanji).map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </span>
    </div>
  );
}

/** Marca visual de "está na missão de hoje". O texto acessível fica no painel da missão (com link e progresso). */
function MissionChip({ progress }: { progress: MissionTaskProgress }) {
  return (
    <span
      aria-hidden="true"
      className={`ml-2 mt-2.5 inline-flex rounded-full border-2 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] ${
        progress.complete ? "border-journey-leaf bg-journey-leaf/10 text-journey-ink" : "border-journey-orange/50 bg-white text-journey-ink"
      }`}
    >
      {progress.complete ? "Missão ✓" : `Missão ${progress.done}/${progress.task.target}`}
    </span>
  );
}

function ActivityCard({ activity, badge, mission }: { activity: DojoActivity; badge: ActivityBadge; mission?: MissionTaskProgress }) {
  const baseId = useId();
  const nameId = `${baseId}-name`;
  const detailsIds = `${baseId}-description ${baseId}-badge`;
  const ready = activity.status === "ready";

  const content = (
    <>
      <ActivityEmblem kanji={activity.kanji} ready={ready} />
      <div className="min-w-0 flex-1">
        <h3 id={nameId} className="flex flex-wrap items-baseline gap-x-2 font-display text-lg font-black leading-tight text-journey-ink">
          {activity.name}
          <span lang="ja" className="font-jp text-sm font-bold text-journey-wood">
            {activity.kanji}
          </span>
        </h3>
        <p id={`${baseId}-description`} className="mt-1 text-sm font-semibold leading-snug text-journey-ink/75">
          {activity.description}
        </p>
        <p
          id={`${baseId}-badge`}
          className={`mt-2.5 inline-flex rounded-full border-2 px-3 py-1 text-xs font-black ${BADGE_TONES[badge.tone]}`}
        >
          {badge.text}
        </p>
        {mission && <MissionChip progress={mission} />}
      </div>
      {ready ? (
        <ChevronRight size={22} strokeWidth={2.6} aria-hidden="true" className="shrink-0 text-journey-orange" />
      ) : (
        <Lock size={18} strokeWidth={2.4} aria-hidden="true" className="shrink-0 text-journey-wood" />
      )}
    </>
  );

  const shared = "flex min-h-28 items-center gap-4 rounded-2xl border-2 p-4 sm:p-5";

  if (!ready) {
    // Focável de propósito: quem navega por teclado/leitor de tela também descobre o que vem por aí.
    return (
      <div
        role="link"
        aria-disabled="true"
        tabIndex={0}
        aria-labelledby={nameId}
        aria-describedby={detailsIds}
        className={`${shared} cursor-not-allowed border-dashed border-journey-wood/25 bg-journey-sand/60 outline-none focus-visible:ring-4 focus-visible:ring-journey-orange/40`}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      to={activity.route}
      aria-labelledby={nameId}
      aria-describedby={detailsIds}
      className={`${shared} group border-journey-wood/15 bg-white/85 shadow-[0_5px_0_hsl(var(--journey-wood)/.12)] outline-none transition hover:border-journey-orange/50 hover:bg-white focus-visible:ring-4 focus-visible:ring-journey-orange/40 active:shadow-none motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0.5`}
    >
      {content}
    </Link>
  );
}

// "Revisar" só faz sentido quando existe onde revisar: até os Pergaminhos ficarem prontos seria sempre 0.
const SCROLLS_READY = getActivity("scrolls").status === "ready";

function HubStats({ summary }: { summary: MasterySummary }) {
  return (
    <div role="group" aria-label="Resumo do seu progresso" className="grid grid-cols-3 gap-2">
      <StatTile label="Vistos" value={String(summary.itemsSeen)} />
      <StatTile label="Acerto" value={summary.attempts === 0 ? "—" : `${summary.accuracy}%`} />
      {SCROLLS_READY ? (
        <StatTile label="Revisar" value={String(summary.due)} />
      ) : (
        <StatTile label="Respostas" value={String(summary.attempts)} />
      )}
    </div>
  );
}

interface HubSnapshot {
  summary: MasterySummary;
  cards: ReadonlyArray<{ activity: DojoActivity; badge: ActivityBadge }>;
  mission: MissionProgress;
  streak: Streak;
}

/** Os dados só mudam dentro das atividades, então basta ler ao abrir o hub. */
function loadHubSnapshot(now: number): HubSnapshot {
  const today = localDayNumber(now, systemUtcOffset);
  const log = loadActivityLog();
  return {
    summary: masteryStore.getSummary(now),
    cards: DOJO_ACTIVITIES.map((activity) => ({ activity, badge: activity.getBadge({ now }) })),
    mission: missionProgress(dailyMission(today), countsForDay(log, today)),
    streak: computeStreak(log, today),
  };
}

export default function DojoHubPage() {
  const reduceMotion = useReducedMotion() ?? false;
  const audio = useArenaAudio();
  const [snapshot, setSnapshot] = useState(() => loadHubSnapshot(Date.now()));

  // Ao voltar de uma atividade, ela grava o que estava pendente no cleanup de desmontagem, que roda
  // depois de o hub já ter renderizado (e lido o disco). Esta 2ª leitura, num efeito, vem depois dele.
  useEffect(() => {
    setSnapshot(loadHubSnapshot(Date.now()));
  }, []);

  return (
    <div className="journey-home min-h-screen min-h-[100dvh] bg-journey-surface pb-28 font-ui text-journey-ink">
      <ArenaHeader
        compact={false}
        reduceMotion={reduceMotion}
        eyebrow="Sala de treinamento"
        headline={
          <>
            Dojô{" "}
            <span lang="ja" className="font-jp text-journey-orange">
              道場
            </span>
          </>
        }
        description="Escolha um treino. Cada acerto em qualquer atividade conta para o seu progresso."
        aside={
          <>
            <HubStats summary={snapshot.summary} />
            <AudioToggle enabled={audio.enabled} onToggle={audio.toggle} />
          </>
        }
      />

      <main className="relative mx-auto max-w-6xl px-5 pt-8 sm:px-8 lg:px-12">
        <RankCard />
        <HubMission mission={snapshot.mission} streak={snapshot.streak} />

        <SectionTitle eyebrow="Atividades" title="Escolha seu treino" />
        <ul aria-label="Atividades" className="grid gap-4 md:grid-cols-2">
          {snapshot.cards.map(({ activity, badge }) => (
            <li key={activity.id}>
              <ActivityCard activity={activity} badge={badge} mission={snapshot.mission.tasks.find(({ task }) => task.activity === activity.id)} />
            </li>
          ))}
        </ul>
      </main>

      <FloatingLearningNav />
    </div>
  );
}
