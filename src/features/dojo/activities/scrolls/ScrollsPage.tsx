import { useReducedMotion } from "framer-motion";
import { getActivity } from "@/features/dojo/registry";
import { ActivityShell } from "@/features/dojo/shared/components/ActivityShell";
import { StatTile } from "@/features/dojo/shared/components/ui";
import { ScrollsSettingsPanel, ScrollsStartPanel } from "./components/ScrollsLobby";
import { ScrollsSessionView } from "./components/ScrollsSessionView";
import { ScrollsSummary } from "./components/ScrollsSummary";
import { useScrollsGame } from "./useScrollsGame";

const ACTIVITY = getActivity("scrolls");

export default function ScrollsPage() {
  const scrolls = useScrollsGame();
  const reduceMotion = useReducedMotion() ?? false;
  const { game, availability } = scrolls;

  const eyebrow =
    game.screen === "lobby"
      ? "Revisão espaçada"
      : game.screen === "summary"
        ? "Resumo da sessão"
        : game.session.mode === "free"
          ? "Treino livre"
          : "Revisão em andamento";

  return (
    <ActivityShell
      activity={ACTIVITY}
      audioEnabled={scrolls.audioEnabled}
      onToggleAudio={scrolls.toggleAudio}
      // Na sessão o Esc encerra (vai para o resumo); no lobby e no resumo ele volta ao Dojô.
      escapeToHub={game.screen !== "session"}
      eyebrow={eyebrow}
      stats={
        <div role="group" aria-label="Resumo da agenda" className="grid grid-cols-3 gap-2">
          <StatTile label="Revisar" value={String(availability.due)} />
          <StatTile label="Novos" value={String(availability.fresh)} />
          <StatTile label="Na agenda" value={String(scrolls.scheduled)} />
        </div>
      }
    >
      <main
        className={`relative mx-auto px-5 pt-8 sm:px-8 lg:px-12 ${
          game.screen === "lobby" ? "grid max-w-6xl items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,.9fr)]" : "max-w-2xl"
        }`}
      >
        {game.screen === "lobby" && (
          <>
            <div className="min-w-0 space-y-5">
              <ScrollsSettingsPanel
                settings={scrolls.settings}
                groups={scrolls.groups}
                onUpdate={scrolls.updateSettings}
                onToggleGroup={scrolls.toggleGroup}
              />
            </div>
            {/* No celular o painel de começar vem primeiro; no desktop fica fixo ao lado das configurações. */}
            <div className="order-first lg:sticky lg:top-6 lg:order-none">
              <ScrollsStartPanel
                availability={availability}
                newPerDay={scrolls.settings.newPerDay}
                now={scrolls.now}
                storageWarning={scrolls.storageWarning}
                onStartReview={scrolls.startReview}
                onStartFree={scrolls.startFree}
              />
            </div>
          </>
        )}

        {game.screen === "session" && (
          <ScrollsSessionView
            session={game.session}
            reduceMotion={reduceMotion}
            onFlip={scrolls.flip}
            onGrade={scrolls.grade}
            onUndo={scrolls.undo}
            onFinish={scrolls.finish}
          />
        )}

        {game.screen === "summary" && (
          <ScrollsSummary session={game.session} onClose={scrolls.close} onStartFree={scrolls.startFree} onUndo={scrolls.undo} />
        )}
      </main>
    </ActivityShell>
  );
}
