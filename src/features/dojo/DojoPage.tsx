import { useReducedMotion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { FloatingLearningNav } from "@/components/navigation/FloatingLearningNav";
import { ArenaHeader } from "./components/ArenaHeader";
import { BattleEffectBanner } from "./components/BattleEffectBanner";
import { CountdownScreen } from "./components/CountdownScreen";
import { IntroScreen } from "./components/IntroScreen";
import { LobbySettings } from "./components/LobbySettings";
import { ResultsPanel } from "./components/ResultsPanel";
import { StartCard } from "./components/StartCard";
import { TrainingCard } from "./components/TrainingCard";
import { AudioToggle } from "./components/ui";
import { useDojoGame } from "./useDojoGame";

export default function DojoPage() {
  const game = useDojoGame();
  const reduceMotion = useReducedMotion() ?? false;
  const { phase, settings, stats } = game;

  const audioToggle = <AudioToggle enabled={game.audioEnabled} onToggle={game.toggleAudio} />;

  if (phase.screen === "intro") {
    return <IntroScreen onEnter={game.enterLobby} entering={game.entering} audioToggle={audioToggle} reduceMotion={reduceMotion} />;
  }

  if (phase.screen === "countdown") {
    return <CountdownScreen count={phase.count} audioToggle={audioToggle} reduceMotion={reduceMotion} />;
  }

  const isTraining = phase.screen === "training";
  const focusLayout = isTraining && settings.focusMode;

  return (
    <div className="journey-home min-h-screen min-h-[100dvh] bg-journey-surface pb-28 font-ui text-journey-ink">
      {focusLayout ? (
        <div className="fixed right-4 top-4 z-20">{audioToggle}</div>
      ) : (
        <ArenaHeader compact={isTraining} stats={stats} audioToggle={audioToggle} reduceMotion={reduceMotion} />
      )}

      <main
        className={`relative mx-auto px-5 pt-8 sm:px-8 lg:px-12 ${
          isTraining ? "max-w-2xl" : "grid max-w-6xl items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,.9fr)]"
        }`}
      >
        {/* Configurações: só no lobby. Travadas durante a espera do "Iniciar batalha". */}
        {phase.screen === "lobby" && (
          <fieldset disabled={game.starting} className={`m-0 min-w-0 space-y-5 border-0 p-0 ${game.starting ? "opacity-70" : ""}`}>
            <LobbySettings settings={settings} groups={game.groups} onUpdate={game.updateSettings} onToggleGroup={game.toggleGroup} />
          </fieldset>
        )}

        {/* No celular o painel de iniciar vem primeiro; no desktop fica fixo ao lado das configurações. */}
        <div className={`space-y-5 ${isTraining ? "" : "order-first lg:sticky lg:top-6 lg:order-none"}`}>
          <section className="relative isolate overflow-hidden rounded-[2rem] border-2 border-[hsl(var(--journey-wood-deep))] bg-journey-forest-deep p-2.5 shadow-[0_8px_0_hsl(var(--journey-wood-deep)/.35)] sm:p-4">
            <div className="journey-leaf-pattern absolute inset-0 opacity-10" aria-hidden="true" />
            <BattleEffectBanner effect={game.effect} visual={!focusLayout} reduceMotion={reduceMotion} />

            <div className="relative rounded-[1.5rem] bg-journey-sand p-5 text-center sm:p-8">
              {phase.screen === "training" ? (
                <TrainingCard
                  session={phase.session}
                  prompt={phase.prompt}
                  startedAtPerf={phase.startedAtPerf}
                  onPromptShown={game.markPromptShown}
                  onAnswer={game.submitAnswer}
                  onTimeout={game.timeoutPrompt}
                />
              ) : (
                <StartCard
                  settings={settings}
                  deckSize={game.deckSize}
                  justFinished={game.justFinished}
                  starting={game.starting}
                  onStart={game.prepareBattle}
                />
              )}
            </div>
          </section>

          {/* O relatório só aparece fora do treino: antes ele surgia na 1ª resposta e deslocava o layout. */}
          {!isTraining && game.lastSession && (
            <ResultsPanel session={game.lastSession} stats={stats} justFinished={game.justFinished} storageWarning={game.storageWarning} />
          )}

          {isTraining && (
            <button
              type="button"
              onClick={game.finishTraining}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-journey-wood/15 bg-white/60 px-5 text-xs font-black text-journey-ink/70 transition hover:border-journey-orange/30 hover:bg-white hover:text-journey-orange active:scale-[0.98]"
            >
              <RotateCcw size={15} /> Encerrar sessão
            </button>
          )}
        </div>
      </main>

      <FloatingLearningNav />
    </div>
  );
}
