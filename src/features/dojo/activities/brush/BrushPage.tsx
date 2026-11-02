import { useReducedMotion } from "framer-motion";
import { getActivity } from "@/features/dojo/registry";
import { ActivityShell } from "@/features/dojo/shared/components/ActivityShell";
import { StatTile } from "@/features/dojo/shared/components/ui";
import { BrushSettingsPanel, BrushStartPanel } from "./components/BrushLobby";
import { BrushSessionView } from "./components/BrushSessionView";
import { BrushSummary } from "./components/BrushSummary";
import { StrokeAttribution } from "./components/StrokeAttribution";
import { MODE_OPTIONS } from "./constants";
import { useBrushGame } from "./useBrushGame";

const ACTIVITY = getActivity("brush");

export default function BrushPage() {
  const brush = useBrushGame();
  const reduceMotion = useReducedMotion() ?? false;
  const { game, session, card } = brush;

  const eyebrow =
    game.screen === "lobby"
      ? "Sala de caligrafia"
      : game.screen === "summary"
        ? "Resumo da sessão"
        : `${MODE_OPTIONS.find(({ id }) => id === game.session.mode)?.label} em andamento`;
  // A nota do caractere em tela (já conferido) ou a do último avaliado.
  const lastScore = session?.score?.score ?? [...(session?.attempts ?? [])].reverse().find((attempt) => attempt.score != null)?.score?.score;

  return (
    <ActivityShell
      activity={ACTIVITY}
      audioEnabled={brush.audioEnabled}
      onToggleAudio={brush.toggleAudio}
      // Na sessão o Esc encerra (vai para o resumo); no lobby e no resumo ele volta ao Dojô.
      escapeToHub={game.screen !== "session"}
      eyebrow={eyebrow}
      stats={
        <div role="group" aria-label="Placar do pincel" className="grid grid-cols-3 gap-2">
          <StatTile label="Kana" value={session ? `${Math.min(session.index + 1, session.cards.length)}/${session.cards.length}` : "—"} />
          <StatTile label="Nota" value={lastScore == null ? "—" : String(lastScore)} />
          <StatTile label="Praticados" value={String(brush.practicedTotal)} />
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
              <BrushSettingsPanel settings={brush.settings} groups={brush.groups} onUpdate={brush.updateSettings} onToggleGroup={brush.toggleGroup} />
            </div>
            {/* No celular o painel de começar vem primeiro; no desktop fica fixo ao lado das configurações. */}
            <div className="order-first lg:sticky lg:top-6 lg:order-none">
              <BrushStartPanel
                settings={brush.settings}
                deckSize={brush.deckSize}
                ready={brush.strokeSet != null}
                loadFailed={brush.loadFailed}
                practicedCount={brush.practicedCount}
                storageWarning={brush.storageWarning}
                onStart={brush.start}
                onRetryLoad={brush.retryLoad}
              />
            </div>
          </>
        )}

        {game.screen === "session" && card && (
          <>
            <BrushSessionView
              session={game.session}
              card={card}
              reduceMotion={reduceMotion}
              onStroke={brush.stroke}
              onUndo={brush.undo}
              onClear={brush.clear}
              onCheck={brush.check}
              onGrade={brush.grade}
              onNext={brush.next}
              onPrev={brush.prev}
              onSkip={brush.skip}
              onFinish={brush.finish}
            />
            <StrokeAttribution className="mt-4 text-center" />
          </>
        )}

        {game.screen === "summary" && (
          <BrushSummary session={game.session} storageWarning={brush.storageWarning} onRestart={brush.start} onClose={brush.close} />
        )}
      </main>
    </ActivityShell>
  );
}
