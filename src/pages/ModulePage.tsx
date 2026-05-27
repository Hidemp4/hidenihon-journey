import { useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookMarked,
  BookOpen,
  CheckCircle2,
  Lock,
  Target,
  type LucideIcon,
} from "lucide-react";
import { hiraganaGroups, allHiragana } from "@/data/hiragana";
import { katakanaGroups, allKatakana } from "@/data/katakana";
import { kanjiGroups, allKanji } from "@/data/kanji";
import { practicaGroups, allPratica } from "@/data/pratica";
import type { JapaneseChar, LessonGroup } from "@/data/hiragana";
import type { ModuleType } from "@/hooks/useProgress";
import { useProgress } from "@/hooks/useProgress";
import { MODULE_LIST, type ModuleMeta } from "@/data/modules";

type LessonStep = "intro" | "identification" | "reading";

interface KanaSection {
  id: string;
  label: string;
  sublabel: string;
  emoji: string;
  colorVar: string;
  bgVar: string;
  groups: LessonGroup[];
  allChars: JapaneseChar[];
}

const KANA_SECTIONS: KanaSection[] = [
  {
    id: "hiragana",
    label: "Hiragana",
    sublabel: "ひらがな",
    emoji: "あ",
    colorVar: "--hiragana",
    bgVar: "--hiragana-bg",
    groups: hiraganaGroups,
    allChars: allHiragana,
  },
  {
    id: "katakana",
    label: "Katakana",
    sublabel: "カタカナ",
    emoji: "ア",
    colorVar: "--katakana",
    bgVar: "--katakana-bg",
    groups: katakanaGroups,
    allChars: allKatakana,
  },
  {
    id: "kanji",
    label: "Kanji",
    sublabel: "漢字",
    emoji: "漢",
    colorVar: "--kanji",
    bgVar: "--kanji-bg",
    groups: kanjiGroups,
    allChars: allKanji,
  },
];

const LESSON_STEPS: Array<{ id: LessonStep; label: string; Icon: LucideIcon }> = [
  { id: "intro", label: "Introdução", Icon: BookOpen },
  { id: "identification", label: "Identificação", Icon: Target },
  { id: "reading", label: "Leitura", Icon: BookMarked },
];

type ModuleHeaderProps = {
  moduleMeta: ModuleMeta;
  color: string;
  onBack: () => void;
  children?: ReactNode;
};

type LessonCardProps = {
  title: string;
  details: string;
  lessonIndex: number;
  completed: boolean;
  unlocked: boolean;
  score: number;
  color: string;
  bg: string;
  stepColorVar: string;
  onOpen: () => void;
};

type LessonListConfig = {
  groups: LessonGroup[];
  summary: string;
  color: string;
  bg: string;
  stepColorVar: string;
  getScopedId: (group: LessonGroup) => string;
  getDetails: (group: LessonGroup) => string;
};

function ModuleHeader({ moduleMeta, color, onBack, children }: ModuleHeaderProps) {
  return (
    <div
      className="sticky top-0 z-10 px-4 py-4"
      style={{ background: "hsl(var(--background))", borderBottom: "1px solid hsl(var(--border))" }}
    >
      <div className={`flex items-center gap-3 ${children ? "mb-3" : ""}`}>
        <button
          onClick={onBack}
          className="rounded-xl p-2 transition-all active:scale-95"
          style={{ background: "hsl(var(--muted))" }}
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-3xl font-jp" style={{ color }}>
            {moduleMeta.emoji}
          </span>
          <div>
            <h1 className="text-lg font-bold">{moduleMeta.label}</h1>
            <p className="text-xs text-muted-foreground">{moduleMeta.sublabel}</p>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

function LessonCard({
  title,
  details,
  lessonIndex,
  completed,
  unlocked,
  score,
  color,
  bg,
  stepColorVar,
  onOpen,
}: LessonCardProps) {
  return (
    <button
      onClick={onOpen}
      disabled={!unlocked}
      className="w-full rounded-2xl border p-4 text-left transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: completed ? bg : "hsl(var(--card))",
        borderColor: completed ? color : "hsl(var(--border))",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="rounded-xl w-10 h-10 flex items-center justify-center text-sm font-bold"
            style={{
              background: completed ? color : unlocked ? bg : "hsl(var(--muted))",
              color: completed ? "white" : unlocked ? color : "hsl(var(--muted-foreground))",
            }}
          >
            {completed ? <CheckCircle2 size={18} /> : unlocked ? lessonIndex + 1 : <Lock size={16} />}
          </div>
          <div>
            <p className="font-semibold text-sm">{title}</p>
            <p className="text-xs text-muted-foreground">{details}</p>
          </div>
        </div>

        {completed && (
          <span
            className="text-xs font-bold px-2 py-1 rounded-lg"
            style={{
              background: score >= 80 ? "hsl(var(--success) / 0.15)" : "hsl(var(--warning) / 0.15)",
              color: score >= 80 ? "hsl(var(--success))" : "hsl(var(--foreground))",
            }}
          >
            {score}%
          </span>
        )}
      </div>

      {unlocked && (
        <div className="flex gap-2 mt-3">
          {LESSON_STEPS.map(({ id, label, Icon }) => (
            <div
              key={id}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs"
              style={{
                background: completed ? `hsl(${stepColorVar} / 0.12)` : "hsl(var(--muted))",
                color: completed ? color : "hsl(var(--muted-foreground))",
              }}
            >
              <Icon size={16} />
              {label}
            </div>
          ))}
        </div>
      )}
    </button>
  );
}

export default function ModulePage() {
  const { module } = useParams<{ module: string }>();
  const navigate = useNavigate();
  const { getLessonProgress, isLessonUnlocked } = useProgress();
  const [activeSection, setActiveSection] = useState(KANA_SECTIONS[0].id);

  const moduleMeta = MODULE_LIST.find(m => m.id === module);
  if (!moduleMeta) return null;

  const moduleId = moduleMeta.id as ModuleType;
  const moduleColor = `hsl(${moduleMeta.colorVar})`;

  const renderLessonList = ({
    groups,
    summary,
    color,
    bg,
    stepColorVar,
    getScopedId,
    getDetails,
  }: LessonListConfig) => {
    const lessonIds = groups.map(getScopedId);

    return (
      <div className="px-4 py-5 flex flex-col gap-3 max-w-lg mx-auto">
        <p className="text-xs text-muted-foreground">{summary}</p>
        {groups.map((group, index) => {
        const scopedId = getScopedId(group);
        const lessonProgress = getLessonProgress(moduleId, scopedId);
        const unlocked = isLessonUnlocked(moduleId, index, lessonIds);
        const completed = lessonProgress?.completed ?? false;
        const score = lessonProgress?.score ?? 0;

        return (
          <LessonCard
            key={group.id}
            title={group.title}
            details={getDetails(group)}
            lessonIndex={index}
            completed={completed}
            unlocked={unlocked}
            score={score}
            color={color}
            bg={bg}
            stepColorVar={stepColorVar}
            onOpen={() => {
              if (unlocked) navigate(`/module/${moduleId}/lesson/${scopedId}`);
            }}
          />
        );
        })}
      </div>
    );
  };

  if (moduleId === "kana") {
    const section = KANA_SECTIONS.find(s => s.id === activeSection) ?? KANA_SECTIONS[0];
    const color = `hsl(${section.colorVar})`;
    const bg = `hsl(${section.bgVar})`;

    return (
      <div className="min-h-screen" style={{ background: "hsl(var(--background))" }}>
        <ModuleHeader moduleMeta={moduleMeta} color={moduleColor} onBack={() => navigate("/home")}>
          <div className="flex gap-2">
            {KANA_SECTIONS.map(s => {
              const isActive = s.id === activeSection;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className="flex-1 rounded-xl py-2 text-sm font-semibold transition-all"
                  style={{
                    background: isActive ? `hsl(${s.colorVar})` : "hsl(var(--muted))",
                    color: isActive ? "white" : "hsl(var(--muted-foreground))",
                  }}
                >
                  <span className="font-jp mr-1">{s.emoji}</span>
                  {s.label}
                </button>
              );
            })}
          </div>
        </ModuleHeader>

        {renderLessonList({
          groups: section.groups,
          summary: `${section.groups.length} lições · ${section.allChars.length} caracteres`,
          color,
          bg,
          stepColorVar: section.colorVar,
          getScopedId: group => `${section.id}__${group.id}`,
          getDetails: group => `${group.chars.length} caracteres · 3 exercícios`,
        })}
      </div>
    );
  }

  if (moduleId === "japones-pratica") {
    const color = moduleColor;
    const bg = `hsl(${moduleMeta.bgVar})`;

    return (
      <div className="min-h-screen" style={{ background: "hsl(var(--background))" }}>
        <ModuleHeader moduleMeta={moduleMeta} color={color} onBack={() => navigate("/home")} />
        {renderLessonList({
          groups: practicaGroups,
          summary: `${practicaGroups.length} lições · ${allPratica.length} itens`,
          color,
          bg,
          stepColorVar: moduleMeta.colorVar,
          getScopedId: group => `pratica__${group.id}`,
          getDetails: group => `${group.readingWords.length} palavras · 3 exercícios`,
        })}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "hsl(var(--background))" }}>
      <ModuleHeader moduleMeta={moduleMeta} color={moduleColor} onBack={() => navigate("/home")} />

      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 py-12 max-w-lg mx-auto w-full text-center">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-jp"
          style={{ background: `hsl(${moduleMeta.bgVar})`, color: `hsl(${moduleMeta.colorVar})` }}
        >
          {moduleMeta.emoji}
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">{moduleMeta.label}</h2>
          <p className="text-muted-foreground text-sm mb-4">{moduleMeta.description}</p>
        </div>

        <div className="w-full rounded-2xl border p-4" style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Conteúdo do módulo</p>
          <div className="flex flex-col gap-2">
            {moduleMeta.topics.map((t, i) => (
              <div key={t} className="flex items-center gap-3">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{ background: `hsl(${moduleMeta.bgVar})`, color: `hsl(${moduleMeta.colorVar})` }}
                >
                  {i + 1}
                </div>
                <span className="text-sm">{t}</span>
              </div>
            ))}
          </div>
        </div>

        <div
          className="rounded-2xl px-5 py-4 w-full"
          style={{ background: "hsl(var(--muted))" }}
        >
          <p className="text-sm font-semibold mb-1">🚧 Em desenvolvimento</p>
          <p className="text-xs text-muted-foreground">
            Este módulo estará disponível em breve. Complete os módulos anteriores primeiro!
          </p>
        </div>

        <button
          onClick={() => navigate("/home")}
          className="w-full rounded-2xl py-3 font-semibold transition-all active:scale-95"
          style={{ background: "hsl(var(--muted))", color: "hsl(var(--foreground))" }}
        >
          Voltar ao início
        </button>
      </div>
    </div>
  );
}
