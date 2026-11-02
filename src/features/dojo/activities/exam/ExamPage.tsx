import { getActivity } from "@/features/dojo/registry";
import { ActivityShell } from "@/features/dojo/shared/components/ActivityShell";
import { StatTile } from "@/features/dojo/shared/components/ui";
import { ExamResult } from "./components/ExamResult";
import { ExamSettingsPanel, ExamStartPanel } from "./components/ExamLobby";
import { QuestionView } from "./components/QuestionView";
import { MODE_OPTIONS } from "./constants";
import { useExamGame } from "./useExamGame";

const ACTIVITY = getActivity("exam");

export default function ExamPage() {
  const exam = useExamGame();
  const { game } = exam;
  const inRun = game.screen === "question" || game.screen === "feedback";

  const eyebrow =
    game.screen === "lobby"
      ? "Sala de exame"
      : game.screen === "result"
        ? "Resultado"
        : game.run.review
          ? "Revisão dos erros"
          : `${MODE_OPTIONS.find(({ id }) => id === game.run.mode)?.label} em andamento`;

  const correct = game.screen === "lobby" ? 0 : game.run.answers.filter((answer) => answer.outcome === "correct").length;
  const answered = game.screen === "lobby" ? 0 : game.run.answers.length;

  return (
    <ActivityShell
      activity={ACTIVITY}
      audioEnabled={exam.audioEnabled}
      onToggleAudio={exam.toggleAudio}
      // Na rodada o Esc encerra (vai para o resultado); no lobby e no resultado ele volta ao Dojô.
      escapeToHub={!inRun}
      eyebrow={eyebrow}
      stats={
        <div role="group" aria-label="Placar do exame" className="grid grid-cols-3 gap-2">
          <StatTile label="Acertos" value={String(correct)} />
          <StatTile label="Erros" value={String(answered - correct)} />
          <StatTile label="Última" value={exam.lastResult ? `${exam.lastResult.score}%` : "—"} />
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
              <ExamSettingsPanel settings={exam.settings} groups={exam.groups} onUpdate={exam.updateSettings} onToggleGroup={exam.toggleGroup} />
            </div>
            {/* No celular o painel de começar vem primeiro; no desktop fica fixo ao lado das configurações. */}
            <div className="order-first lg:sticky lg:top-6 lg:order-none">
              <ExamStartPanel
                settings={exam.settings}
                deckSize={exam.deckSize}
                lastResult={exam.lastResult}
                storageWarning={exam.storageWarning}
                onStart={exam.start}
              />
            </div>
          </>
        )}

        {inRun && (
          <QuestionView
            run={game.run}
            answered={game.screen === "feedback"}
            onAnswer={exam.answer}
            onTimeout={exam.timeout}
            onNext={exam.next}
            onFinish={exam.finish}
          />
        )}

        {game.screen === "result" && (
          <ExamResult
            run={game.run}
            storageWarning={exam.storageWarning}
            onReviewMisses={exam.reviewMisses}
            onRestart={exam.start}
            onClose={exam.close}
          />
        )}
      </main>
    </ActivityShell>
  );
}
