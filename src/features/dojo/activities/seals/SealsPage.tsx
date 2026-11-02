import { useReducedMotion } from "framer-motion";
import { getActivity } from "@/features/dojo/registry";
import { ActivityShell } from "@/features/dojo/shared/components/ActivityShell";
import { StatTile } from "@/features/dojo/shared/components/ui";
import { formatTimer } from "@/features/dojo/shared/format";
import { SealsBoardView } from "./components/SealsBoardView";
import { SealsSettingsPanel, SealsStartPanel } from "./components/SealsLobby";
import { SealsResult } from "./components/SealsResult";
import { elapsedSeconds } from "./results";
import { useSealsGame } from "./useSealsGame";

const ACTIVITY = getActivity("seals");

export default function SealsPage() {
  const seals = useSealsGame();
  const reduceMotion = useReducedMotion() ?? false;
  const { game } = seals;
  const board = game.screen === "lobby" ? null : game.board;

  const eyebrow = game.screen === "lobby" ? "Sala dos selos" : game.screen === "won" ? "Mesa completa" : "Partida em andamento";

  return (
    <ActivityShell
      activity={ACTIVITY}
      audioEnabled={seals.audioEnabled}
      onToggleAudio={seals.toggleAudio}
      // Na partida o Esc encerra (volta ao lobby dos Selos); no lobby e no resultado ele volta ao Dojô.
      escapeToHub={game.screen !== "playing"}
      eyebrow={eyebrow}
      stats={
        <div role="group" aria-label="Placar dos selos" className="grid grid-cols-3 gap-2">
          <StatTile label="Jogadas" value={String(board?.moves ?? 0)} />
          <StatTile label="Tempo" value={formatTimer(elapsedSeconds(seals.elapsedMs))} />
          <StatTile label="Recorde" value={seals.best ? String(seals.best.moves) : "—"} />
        </div>
      }
    >
      <main
        className={`relative mx-auto px-5 pt-8 sm:px-8 lg:px-12 ${
          game.screen === "lobby" ? "grid max-w-6xl items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,.9fr)]" : "max-w-3xl"
        }`}
      >
        {game.screen === "lobby" && (
          <>
            <div className="min-w-0 space-y-5">
              <SealsSettingsPanel settings={seals.settings} groups={seals.groups} onUpdate={seals.updateSettings} onToggleGroup={seals.toggleGroup} />
            </div>
            {/* No celular o painel de começar vem primeiro; no desktop fica fixo ao lado das configurações. */}
            <div className="order-first lg:sticky lg:top-6 lg:order-none">
              <SealsStartPanel
                settings={seals.settings}
                availablePairs={seals.availablePairs}
                best={seals.best}
                storageWarning={seals.storageWarning}
                onStart={seals.start}
              />
            </div>
          </>
        )}

        {game.screen === "won" && (
          <SealsResult board={game.board} storageWarning={seals.storageWarning} onRestart={seals.start} onClose={seals.close} />
        )}

        {board && (
          <SealsBoardView
            key={board.id}
            board={board}
            finished={game.screen === "won"}
            reduceMotion={reduceMotion}
            onFlip={seals.flip}
            onAbandon={seals.abandon}
          />
        )}
      </main>
    </ActivityShell>
  );
}
