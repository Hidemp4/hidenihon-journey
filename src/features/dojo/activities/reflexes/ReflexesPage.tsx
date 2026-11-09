import { useReducedMotion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { getActivity } from "@/features/dojo/registry";
import { ActivityShell } from "@/features/dojo/shared/components/ActivityShell";
import { AudioToggle, StatTile } from "@/features/dojo/shared/components/ui";
import { formatMs } from "@/features/dojo/shared/format";
import { BattleEffectBanner } from "./components/BattleEffectBanner";
import { CountdownScreen } from "./components/CountdownScreen";
import { IntroScreen } from "./components/IntroScreen";
import { LobbySettings } from "./components/LobbySettings";
import { ResultsPanel } from "./components/ResultsPanel";
import { StartCard } from "./components/StartCard";
import { TrainingCard } from "./components/TrainingCard";
import type { DojoStats } from "./types";
import { useDojoGame } from "./useDojoGame";

const ACTIVITY = getActivity("reflexes");

function ReflexesStats({ stats }: { stats: DojoStats }) {
  return (
    <div role="group" className="grid grid-cols-3 gap-2" aria-label="Resumo de desempenho">
      <StatTile label="Acerto" value={`${stats.accuracy}%`} />
      <StatTile label="Média" value={formatMs(stats.averageCompletionMs)} />
      <StatTile label="Mediana" value={formatMs(stats.medianCompletionMs)} />
    </div>
  );
}

export default function ReflexesPage() {
  const game = useDojoGame();
  const reduceMotion = useReducedMotion() ?? false;
  const { phase, settings, stats } = game;

  const shellAudio = { audioEnabled: game.audioEnabled, onToggleAudio: game.toggleAudio };
  const audioToggle = <AudioToggle enabled={game.audioEnabled} onToggle={game.toggleAudio} />;

  if (phase.screen === "intro") {
    return (
      <ActivityShell activity={ACTIVITY} {...shellAudio} chrome="takeover">
        <IntroScreen onEnter={game.enterLobby} entering={game.entering} audioToggle={audioToggle} reduceMotion={reduceMotion} />
      </ActivityShell>
    );
  }

  if (phase.screen === "countdown") {
    // A contagem já é o começo da batalha: o Esc não tira a pessoa daqui no meio dela.
    return (
      <ActivityShell activity={ACTIVITY} {...shellAudio} chrome="takeover" escapeToHub={false}>
        <CountdownScreen count={phase.count} audioToggle={audioToggle} reduceMotion={reduceMotion} />
      </ActivityShell>
    );
  }

  const isTraining = phase.screen === "training";
  const focusLayout = isTraining && settings.focusMode;

  return (
    <ActivityShell
      activity={ACTIVITY}
      {...shellAudio}
      chrome={focusLayout ? "focus" : "header"}
      // No treino o Esc encerra a sessão (useDojoGame); só no lobby ele volta ao Dojô.
      escapeToHub={!isTraining}
      // Cabeçalho compacto também no lobby (antes: chamada + descrição + arena alta, que no celular
      // ocupavam a primeira tela inteira). No celular a arena ainda encolhe: no lobby as configurações
      // aparecem logo; na batalha o kana fica acima do centro, livre do teclado virtual.
      mobileHeader={isTraining ? "battle" : "short"}
      eyebrow={isTraining ? "Batalha em andamento" : "Sala de preparação"}
      stats={<ReflexesStats stats={stats} />}
    >
      <main
        className={`relative mx-auto px-5 sm:px-8 sm:pt-8 lg:px-12 ${
          isTraining ? "max-w-2xl pt-2" : "grid max-w-6xl items-start gap-5 pt-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,.9fr)] lg:gap-6"
        }`}
      >
        {/* Configurações: só no lobby. Travadas durante a espera do "Iniciar batalha". */}
        {phase.screen === "lobby" && (
          <fieldset disabled={game.starting} className={`m-0 min-w-0 space-y-5 border-0 p-0 ${game.starting ? "opacity-70" : ""}`}>
            <LobbySettings settings={settings} groups={game.groups} onUpdate={game.updateSettings} onToggleGroup={game.toggleGroup} />
          </fieldset>
        )}

        {/* Celular: configurações → avançadas → "Pronto para treinar?" no fim. Desktop: coluna fixa ao lado.
            No lobby esta coluna é `contents` no celular, para o relatório poder subir sozinho (abaixo). */}
        <div className={isTraining ? "space-y-5" : "contents lg:sticky lg:top-6 lg:block lg:space-y-5"}>
          <section className="relative isolate overflow-hidden rounded-[2rem] border-2 border-[hsl(var(--journey-wood-deep))] bg-journey-forest-deep p-2.5 shadow-[0_8px_0_hsl(var(--journey-wood-deep)/.35)] sm:p-4">
            <div className="journey-leaf-pattern absolute inset-0 opacity-10" aria-hidden="true" />
            <BattleEffectBanner effect={game.effect} visual={!focusLayout} reduceMotion={reduceMotion} />

            <div className={`relative rounded-[1.5rem] bg-journey-sand text-center sm:p-8 ${isTraining ? "p-4" : "p-5"}`}>
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

          {/* O relatório só aparece fora do treino: antes ele surgia na 1ª resposta e deslocava o layout.
              Logo depois de uma batalha, no celular, ele vem antes das configurações: é o que a pessoa quer ver. */}
          {!isTraining && game.lastSession && (
            <div data-testid="reflexes-report" className={game.justFinished ? "order-first lg:order-none" : undefined}>
              <ResultsPanel session={game.lastSession} stats={stats} justFinished={game.justFinished} storageWarning={game.storageWarning} />
            </div>
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
    </ActivityShell>
  );
}
