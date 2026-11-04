import { useState, useCallback, useEffect, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Home, Trophy } from "lucide-react";
import { hiraganaGroups, allHiragana } from "@/data/hiragana";
import { katakanaGroups, allKatakana } from "@/data/katakana";
import { kanjiGroups, allKanji } from "@/data/kanji";
import { practicaGroups, allPratica } from "@/data/pratica";
import type { ModuleType } from "@/hooks/useProgress";
import { useProgress } from "@/hooks/useProgress";
import { moduleHref } from "@/components/module/lessonTrail";
import IntroductionLesson from "@/components/lessons/IntroductionLesson";
import IdentificationLesson from "@/components/lessons/IdentificationLesson";
import ReadingLesson from "@/components/lessons/ReadingLesson";
import { Eyebrow, ExerciseHeader, IconBadge, ScoreTile, Surface } from "@/components/lessons/ui";
import { buttonClass, cx } from "@/components/lessons/lessonKit";

const SECTION_DATA = {
  hiragana: { groups: hiraganaGroups, allChars: allHiragana, label: "Hiragana", jp: "ひらがな" },
  katakana: { groups: katakanaGroups, allChars: allKatakana, label: "Katakana", jp: "カタカナ" },
  kanji:    { groups: kanjiGroups,    allChars: allKanji,    label: "Kanji",    jp: "漢字" },
  pratica:  { groups: practicaGroups, allChars: allPratica,  label: "Japonês na Prática", jp: "実践日本語" },
};

/** Etapas da lição. Para adicionar uma etapa: uma linha aqui + um bloco no render. */
const STAGES = [
  {
    id: "intro",
    label: "Introdução",
    title: "Conheça cada caractere",
    description: "Veja a ordem dos traços, ouça a pronúncia e avance um por um.",
  },
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

const backPillClass =
  "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border-2 border-white/25 bg-black/45 px-3.5 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:border-journey-orange/60 hover:text-journey-gold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-journey-orange/60";

/** Etapas no cabeçalho: feita (laranja, ✓), atual (dourada) e por vir. */
function LessonStepper({ current }: { current: number }) {
  return (
    <ol aria-label="Etapas da lição" className="mt-4 grid grid-cols-3 gap-2">
      {STAGES.map((stage, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={stage.id} aria-current={active ? "step" : undefined} className="min-w-0">
            <div className={cx("h-2 rounded-full transition-colors duration-500", done ? "bg-journey-orange" : active ? "bg-journey-gold" : "bg-white/20")} />
            <p
              className={cx(
                "mt-1.5 flex items-center gap-1 truncate text-[11px] font-black uppercase tracking-[0.1em]",
                done || active ? "text-white" : "text-white/70"
              )}
            >
              {done && <Check size={12} strokeWidth={3.2} aria-hidden="true" className="shrink-0 text-journey-orange" />}
              <span className="truncate">{stage.label}</span>
              {done && <span className="sr-only">(feita)</span>}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

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
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const firstStep = useRef(true);

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
    if (module && lessonId && group && !unlocked) navigate(moduleHref(module, lessonId), { replace: true });
  }, [module, lessonId, group, unlocked, navigate]);

  // Troca de etapa: o foco vai para o título dela (quem usa leitor de tela ouve onde está) e a
  // página rola até ele (com `scroll-margin` para não ficar atrás do cabeçalho fixo). Na abertura
  // da página não: o foco fica no começo, como em qualquer página nova.
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  if (!module || !lessonId || !group || !sectionData || !unlocked) return null;

  const backHref = moduleHref(module, lessonId);
  const stageIndex = STAGES.findIndex((s) => s.id === step);
  const stepIndex = step === "done" ? STAGES.length : stageIndex;
  const stage = STAGES[stageIndex] as (typeof STAGES)[number] | undefined;
  const stageHeader = stage ? (
    <ExerciseHeader
      headingRef={headingRef}
      eyebrow={`Etapa ${String(stageIndex + 1).padStart(2, "0")} · ${stage.id === "intro" ? "Estudo" : "Treino"}`}
      title={stage.title}
      description={stage.description}
    />
  ) : null;

  return (
    <div className="journey-home flex min-h-screen min-h-[100dvh] flex-col bg-journey-surface font-ui text-journey-ink">
      <header className="sticky top-0 z-20 isolate overflow-hidden border-b-[6px] border-[hsl(var(--journey-wood-deep))] bg-journey-forest-deep text-white shadow-[0_10px_24px_hsl(var(--journey-forest-deep)/.22)]">
        <div aria-hidden="true" className="journey-leaf-pattern absolute inset-0 -z-10 opacity-15" />
        <div className="mx-auto max-w-xl px-5 pb-4 pt-4">
          <div className="flex items-center gap-3">
            <Link to={backHref} aria-label="Voltar para as lições" className={backPillClass}>
              <ArrowLeft size={16} strokeWidth={2.6} aria-hidden="true" />
              <span className="hidden sm:inline">Lições</span>
            </Link>
            <div className="min-w-0 flex-1">
              <Eyebrow tone="accent" className="truncate">
                <span lang="ja" className="font-jp">
                  {sectionData.jp}
                </span>{" "}
                · {sectionData.label} · Lição {String(groupIndex + 1).padStart(2, "0")}
              </Eyebrow>
              <h1 className="mt-0.5 truncate font-display text-lg font-black tracking-[-0.02em] sm:text-xl">{group.title}</h1>
            </div>
          </div>

          <LessonStepper current={stepIndex} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-5 pb-16 pt-6">
        {progressError && (
          <p role="alert" className="mb-4 rounded-2xl border-2 border-journey-wood/30 bg-white px-4 py-3 text-sm font-bold text-journey-ink">
            Não foi possível salvar o progresso: {progressError}
          </p>
        )}

        {step === "intro" && (
          <>
            {stageHeader}
            <IntroductionLesson chars={group.chars} unit={sectionId === "pratica" ? "item" : "letter"} onComplete={handleIntroComplete} />
          </>
        )}

        {step === "identification" && (
          <>
            {stageHeader}
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
            {stageHeader}
            <ReadingLesson words={group.readingWords} canSkip={canSkipCompletedLesson} onComplete={handleReadingComplete} />
          </>
        )}

        {step === "done" && (
          <div className="flex flex-col gap-4 motion-safe:animate-scale-in">
            <Surface tone="dark" glow className="flex flex-col items-center gap-6 px-5 py-8">
              <div className="relative h-[104px] w-[104px]">
                <IconBadge icon={Trophy} size="lg" className="relative" />
                <div
                  aria-hidden
                  className="absolute -bottom-0.5 -right-0.5 grid h-[30px] w-[30px] place-items-center rounded-full border-[3px] border-journey-forest-deep bg-journey-leaf text-white"
                >
                  <Check size={15} strokeWidth={3.2} />
                </div>
              </div>

              <div className="text-center">
                <Eyebrow tone="accent">
                  <span lang="ja" className="font-jp">
                    完了
                  </span>{" "}
                  · Missão cumprida
                </Eyebrow>
                <h2 ref={headingRef} tabIndex={-1} className="mb-1.5 mt-2 scroll-mt-40 font-display text-4xl font-black leading-none tracking-[-0.04em] text-white outline-none">
                  Lição concluída!
                </h2>
                <p className="m-0 text-[15px] font-semibold text-white/85">
                  Você completou <strong className="text-white">{group.title}</strong>
                </p>
              </div>

              <div className="grid w-full grid-cols-2 gap-3">
                <ScoreTile jp="識別" label="Identificação" score={idScore} />
                <ScoreTile jp="読み" label="Leitura" score={readScore} />
              </div>
            </Surface>

            <Link to={backHref} className={buttonClass("primary")}>
              Ver próximas lições <ArrowRight size={18} strokeWidth={2.6} aria-hidden="true" />
            </Link>
            <Link to="/home" className={buttonClass("ghost")}>
              <Home size={16} strokeWidth={2.6} aria-hidden="true" /> Voltar para a Trilha
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
