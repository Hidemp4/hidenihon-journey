import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { hiraganaGroups, allHiragana } from "@/data/hiragana";
import { katakanaGroups, allKatakana } from "@/data/katakana";
import { kanjiGroups, allKanji } from "@/data/kanji";
import { practicaGroups, allPratica } from "@/data/pratica";
import type { ModuleType } from "@/hooks/useProgress";
import { useProgress } from "@/hooks/useProgress";
import IntroductionLesson from "@/components/lessons/IntroductionLesson";
import IdentificationLesson from "@/components/lessons/IdentificationLesson";
import ReadingLesson from "@/components/lessons/ReadingLesson";

type Step = "intro" | "identification" | "reading" | "done";
const STEPS: Step[] = ["intro", "identification", "reading", "done"];
const LESSON_STEPS: Step[] = ["intro", "identification", "reading"];

const SECTION_DATA = {
  hiragana: { groups: hiraganaGroups, allChars: allHiragana, label: "Hiragana",          colorVar: "--hiragana" },
  katakana: { groups: katakanaGroups, allChars: allKatakana, label: "Katakana",          colorVar: "--katakana" },
  kanji:    { groups: kanjiGroups,    allChars: allKanji,    label: "Kanji",             colorVar: "--kanji"    },
  pratica:  { groups: practicaGroups, allChars: allPratica,  label: "Japonês na Prática", colorVar: "--katakana" },
};

const STEP_LABELS: Record<Step, string> = {
  intro: "Introdução",
  identification: "Identificação",
  reading: "Leitura",
  done: "Concluído",
};

type ExerciseHeaderProps = {
  title: string;
  description: string;
};

type ResultCardProps = {
  label: string;
  score: number;
  colorVar: string;
};

function ExerciseHeader({ title, description }: ExerciseHeaderProps) {
  return (
    <div className="px-4 mb-4">
      <h3 className="font-bold text-base">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function ResultCard({ label, score, colorVar }: ResultCardProps) {
  return (
    <div
      className="rounded-2xl p-4 text-center border"
      style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
    >
      <p className="text-2xl font-bold" style={{ color: `hsl(${colorVar})` }}>{score}%</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

export default function LessonPage() {
  const { module, lessonId } = useParams<{ module: string; lessonId: string }>();
  const navigate = useNavigate();
  const { completeLesson } = useProgress();

  const [sectionId, groupId] = (lessonId ?? "").split("__");
  const sectionData = SECTION_DATA[sectionId as keyof typeof SECTION_DATA];
  const group = sectionData?.groups.find(g => g.id === groupId);

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
      completeLesson(
        module as ModuleType,
        lessonId,
        finalScore,
        group.chars.length,
        idErrors
      );
      setTimeout(() => setStep("done"), 500);
    },
    [idScore, idErrors, module, lessonId, group, completeLesson]
  );

  if (!module || !lessonId || !group || !sectionData) return null;

  const stepIndex = STEPS.indexOf(step);
  const color = sectionData.colorVar;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "hsl(var(--background))" }}>
      <div
        className="sticky top-0 z-10 px-4 pt-4 pb-3"
        style={{ background: "hsl(var(--background))", borderBottom: "1px solid hsl(var(--border))" }}
      >
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate(`/module/${module}`)}
            className="rounded-xl p-2 transition-all active:scale-95"
            style={{ background: "hsl(var(--muted))" }}
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">{sectionData.label}</p>
            <h2 className="text-sm font-bold truncate">{group.title}</h2>
          </div>
        </div>

        <div className="flex gap-1">
          {LESSON_STEPS.map((lessonStep, i) => (
            <div key={lessonStep} className="flex-1 flex flex-col gap-1">
              <div
                className="h-1.5 rounded-full transition-all duration-500"
                style={{
                  background:
                    i < stepIndex
                      ? `hsl(${color})`
                      : i === stepIndex
                      ? `hsl(${color} / 0.5)`
                      : "hsl(var(--border))",
                }}
              />
              <p
                className="text-[10px] text-center font-medium"
                style={{
                  color: i <= stepIndex ? `hsl(${color})` : "hsl(var(--muted-foreground))",
                }}
              >
                {STEP_LABELS[lessonStep]}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 max-w-lg mx-auto w-full">
        {step === "intro" && (
          <IntroductionLesson chars={group.chars} onComplete={handleIntroComplete} />
        )}

        {step === "identification" && (
          <>
            <ExerciseHeader
              title="Exercício de Identificação"
              description="Encontre a letra correta em cada linha"
            />
            <IdentificationLesson
              chars={group.chars}
              allCharsPool={sectionData.allChars}
              onComplete={handleIdentificationComplete}
            />
          </>
        )}

        {step === "reading" && (
          <>
            <ExerciseHeader
              title="Exercício de Leitura"
              description="Tente ler cada palavra em japonês"
            />
            <ReadingLesson words={group.readingWords} onComplete={handleReadingComplete} />
          </>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-6 px-4 py-8 animate-scale-in">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-5xl"
              style={{ background: `hsl(${color} / 0.15)` }}
            >
              🏆
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold">Lição Concluída!</h2>
              <p className="text-muted-foreground mt-1">
                Você completou <strong>{group.title}</strong>
              </p>
            </div>

            <div className="w-full grid grid-cols-2 gap-3">
              <ResultCard label="Identificação" score={idScore} colorVar={color} />
              <ResultCard label="Leitura" score={readScore} colorVar={color} />
            </div>

            <div className="w-full flex flex-col gap-3">
              <button
                onClick={() => navigate(`/module/${module}`)}
                className="w-full rounded-2xl py-4 text-base font-bold transition-all active:scale-95"
                style={{
                  background: `hsl(${color})`,
                  color: "white",
                  boxShadow: `0 4px 20px hsl(${color} / 0.35)`,
                }}
              >
                Ver próximas lições
              </button>
              <button
                onClick={() => navigate("/")}
                className="w-full rounded-2xl py-3 text-sm font-medium transition-all active:scale-95"
                style={{ background: "hsl(var(--muted))", color: "hsl(var(--foreground))" }}
              >
                Voltar ao início
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
