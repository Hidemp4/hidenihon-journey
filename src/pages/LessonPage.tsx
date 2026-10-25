import { useState, useCallback, useEffect } from "react";
import type { CSSProperties } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Home, Trophy } from "lucide-react";
import { hiraganaGroups, allHiragana } from "@/data/hiragana";
import { katakanaGroups, allKatakana } from "@/data/katakana";
import { kanjiGroups, allKanji } from "@/data/kanji";
import { practicaGroups, allPratica } from "@/data/pratica";
import type { ModuleType } from "@/hooks/useProgress";
import { useProgress } from "@/hooks/useProgress";
import IntroductionLesson from "@/components/lessons/IntroductionLesson";
import IdentificationLesson from "@/components/lessons/IdentificationLesson";
import ReadingLesson from "@/components/lessons/ReadingLesson";
import {
  Button,
  Eyebrow,
  ExerciseHeader,
  IconBadge,
  ScoreTile,
  SegmentedProgress,
} from "@/components/lessons/ui";

/** Tema da lição aplicado direto na raiz: não depende de CSS global nem de config do Tailwind. */
const LESSON_THEME = {
  "--background": "36 48% 92%",
  "--foreground": "154 28% 10%",
  "--card": "37 62% 96%",
  "--border": "36 22% 82%",
  "--muted-foreground": "100 5% 43%",
  "--primary": "25 95% 53%",
  "--primary-foreground": "0 0% 100%",
  "--accent": "43 96% 56%",
  "--surface": "154 28% 10%",
  "--surface-foreground": "36 48% 92%",
  "--success": "142 72% 29%",
  "--success-bg": "142 50% 90%",
  "--danger": "0 72% 51%",
  "--danger-bg": "0 80% 94%",
} as CSSProperties;

const SECTION_DATA = {
  hiragana: { groups: hiraganaGroups, allChars: allHiragana, label: "Hiragana", jp: "ひらがな" },
  katakana: { groups: katakanaGroups, allChars: allKatakana, label: "Katakana", jp: "カタカナ" },
  kanji:    { groups: kanjiGroups,    allChars: allKanji,    label: "Kanji",    jp: "漢字" },
  pratica:  { groups: practicaGroups, allChars: allPratica,  label: "Japonês na Prática", jp: "実践日本語" },
};

/** Etapas da lição. Para adicionar uma etapa: uma linha aqui + um bloco no render. */
const STAGES = [
  { id: "intro", label: "Introdução" },
  {
    id: "identification",
    label: "Identificação",
    title: "Exercício de identificação",
    description: "Encontre a letra correta em cada linha.",
  },
  {
    id: "reading",
    label: "Leitura",
    title: "Exercício de leitura",
    description: "Tente ler cada palavra em japonês.",
  },
] as const;

type Step = (typeof STAGES)[number]["id"] | "done";

export default function LessonPage() {
  const { module, lessonId } = useParams<{ module: string; lessonId: string }>();
  const navigate = useNavigate();
  const { completeLesson, getLessonProgress, isLessonUnlocked, error: progressError } = useProgress();

  const [sectionId, groupId] = (lessonId ?? "").split("__");
  const sectionData = SECTION_DATA[sectionId as keyof typeof SECTION_DATA];
  const group = sectionData?.groups.find((g) => g.id === groupId);
  const groupIndex = sectionData?.groups.findIndex((g) => g.id === groupId) ?? -1;
  const lessonIds = sectionData?.groups.map((g) => `${sectionId}__${g.id}`) ?? [];
  const unlocked = module && groupIndex >= 0 ? isLessonUnlocked(module as ModuleType, groupIndex, lessonIds) : false;

  const lessonProgress = module && lessonId ? getLessonProgress(module as ModuleType, lessonId) : null;
  const canSkipCompletedLesson = lessonProgress?.completed && lessonProgress.score === 100;

  const [step, setStep] = useState<Step>("intro");
  const [idScore, setIdScore] = useState(0);
  const [idErrors, setIdErrors] = useState<Record<string, number>>({});
  const [readScore, setReadScore] = useState(0);

  const handleIntroComplete = useCallback(() => setStep("identification"), []);

  const handleIdentificationComplete = useCallback(
    (score: number, errorMap: Record<string, number>) => {
      setIdScore(score);
      setIdErrors(errorMap);
      setTimeout(() => setStep("reading"), 1200);
    },
    []
  );

  const handleReadingComplete = useCallback(
    (score: number) => {
      if (!module || !lessonId || !group) return;
      setReadScore(score);
      const finalScore = Math.round((idScore + score) / 2);
      completeLesson(module as ModuleType, lessonId, finalScore, group.chars.length, idErrors);
      setTimeout(() => setStep("done"), 500);
    },
    [idScore, idErrors, module, lessonId, group, completeLesson]
  );

  useEffect(() => {
    if (module && lessonId && group && !unlocked) navigate(`/module/${module}`, { replace: true });
  }, [module, lessonId, group, unlocked, navigate]);

  if (!module || !lessonId || !group || !sectionData || !unlocked) return null;

  const stageIndex = STAGES.findIndex((s) => s.id === step);
  const stepIndex = step === "done" ? STAGES.length : stageIndex;
  const stage = STAGES[stageIndex] as (typeof STAGES)[number] | undefined;
  const exerciseHeader =
    stage && "title" in stage ? (
      <ExerciseHeader
        eyebrow={`Etapa ${String(stageIndex + 1).padStart(2, "0")} · Treino`}
        title={stage.title}
        description={stage.description}
      />
    ) : null;

  return (
    <div
      style={LESSON_THEME}
      className="lesson-theme flex min-h-screen flex-col bg-background font-sans text-foreground"
    >
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[hsl(var(--surface-foreground)/0.14)] bg-[hsl(var(--surface)/0.92)] px-5 pb-3.5 pt-4 shadow-[0_12px_30px_hsl(var(--surface)/0.22)] backdrop-blur-xl">
        <div className="mx-auto max-w-lg">
          <div className="mb-3.5 flex items-center gap-3">
            <button
              onClick={() => navigate(`/module/${module}`)}
              aria-label="Voltar para as missões"
              className="grid h-10 w-10 place-items-center rounded-full border border-[hsl(var(--surface-foreground)/0.14)] bg-[hsl(var(--surface-foreground)/0.08)] text-[hsl(var(--surface-foreground))] transition-all active:scale-95"
            >
              <ArrowLeft size={18} strokeWidth={2.4} />
            </button>
            <div className="min-w-0 flex-1">
              <Eyebrow tone="accent">
                {sectionData.jp} · {sectionData.label}
              </Eyebrow>
              <h2 className="mt-0.5 truncate text-xl font-extrabold tracking-tight text-white">
                {group.title}
              </h2>
            </div>
          </div>

          <SegmentedProgress
            tone="onDark"
            total={STAGES.length}
            current={stepIndex}
            labels={STAGES.map((s) => s.label)}
          />
        </div>
      </header>

      {/* Conteúdo */}
      <main className="mx-auto w-full max-w-lg flex-1 overflow-y-auto pb-10 pt-6">
        {progressError && (
          <p
            role="alert"
            className="mx-5 mb-4 rounded-2xl border border-[hsl(var(--primary)/0.4)] bg-[hsl(var(--primary)/0.14)] px-4 py-3 text-sm font-bold text-[hsl(var(--danger))]"
          >
            {progressError}
          </p>
        )}

        {step === "intro" && <IntroductionLesson chars={group.chars} onComplete={handleIntroComplete} />}

        {step === "identification" && (
          <>
            {exerciseHeader}
            <IdentificationLesson
              chars={group.chars}
              allCharsPool={sectionData.allChars}
              canSkip={canSkipCompletedLesson}
              onComplete={handleIdentificationComplete}
            />
          </>
        )}

        {step === "reading" && (
          <>
            {exerciseHeader}
            <ReadingLesson
              words={group.readingWords}
              canSkip={canSkipCompletedLesson}
              onComplete={handleReadingComplete}
            />
          </>
        )}

        {step === "done" && (
          <div className="flex animate-scale-in flex-col items-center gap-6 px-5 py-4">
            <div className="relative h-[104px] w-[104px]">
              <div aria-hidden className="absolute -inset-2.5 rounded-full bg-[hsl(var(--primary)/0.16)]" />
              <IconBadge icon={Trophy} size="lg" className="relative" />
              <div
                aria-hidden
                className="absolute -bottom-0.5 -right-0.5 grid h-[30px] w-[30px] place-items-center rounded-full border-[3px] border-background bg-[hsl(var(--surface))] text-accent"
              >
                <Check size={15} strokeWidth={3.2} />
              </div>
            </div>

            <div className="text-center">
              <Eyebrow tone="primary">完了 · Missão cumprida</Eyebrow>
              <h2 className="mb-1.5 mt-2 text-4xl font-extrabold leading-none tracking-tighter">
                Lição concluída!
              </h2>
              <p className="m-0 text-[15px] text-muted-foreground">
                Você completou <strong className="text-foreground">{group.title}</strong>
              </p>
            </div>

            <div className="grid w-full grid-cols-2 gap-3">
              <ScoreTile jp="識別" label="Identificação" score={idScore} />
              <ScoreTile jp="読み" label="Leitura" score={readScore} />
            </div>

            <div className="flex w-full flex-col gap-2.5">
              <Button iconRight={ArrowRight} onClick={() => navigate(`/module/${module}`)}>
                Ver próximas lições
              </Button>
              <Button variant="ghost" iconLeft={Home} onClick={() => navigate("/home")}>
                Voltar ao início
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}