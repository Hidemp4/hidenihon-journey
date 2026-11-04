import { useMemo, type ReactNode } from "react";
import { Construction, Lock } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { hiraganaGroups, allHiragana } from "@/data/hiragana";
import { katakanaGroups, allKatakana } from "@/data/katakana";
import { kanjiGroups, allKanji } from "@/data/kanji";
import { practicaGroups, allPratica } from "@/data/pratica";
import type { JapaneseChar, LessonGroup } from "@/data/hiragana";
import type { ModuleType } from "@/hooks/useProgress";
import { useProgress } from "@/hooks/useProgress";
import { MODULE_LIST, type ModuleMeta } from "@/data/modules";
import { MISSION_ART } from "@/components/home/art";
import { FloatingLearningNav } from "@/components/navigation/FloatingLearningNav";
import { LessonTrail, NextLessonPanel, SectionSwitcher, TrailHeading, type SectionOption } from "@/components/module/LessonTrail";
import { ModuleHero } from "@/components/module/ModuleHero";
import { buildTrail, nextLesson, parseKanaSection, summarizeTrail, type KanaSectionId, type TrailLesson } from "@/components/module/lessonTrail";
import { Panel, StatTile } from "@/features/dojo/shared/components/ui";

interface KanaSection {
  id: KanaSectionId;
  label: string;
  sublabel: string;
  glyph: string;
  groups: LessonGroup[];
  allChars: JapaneseChar[];
}

const KANA_SECTIONS: readonly KanaSection[] = [
  { id: "hiragana", label: "Hiragana", sublabel: "ひらがな", glyph: "あ", groups: hiraganaGroups, allChars: allHiragana },
  { id: "katakana", label: "Katakana", sublabel: "カタカナ", glyph: "ア", groups: katakanaGroups, allChars: allKatakana },
  { id: "kanji", label: "Kanji", sublabel: "漢字", glyph: "漢", groups: kanjiGroups, allChars: allKanji },
];

const kanaScopedId = (section: KanaSectionId) => (group: LessonGroup) => `${section}__${group.id}`;
const practicaScopedId = (group: LessonGroup) => `pratica__${group.id}`;

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** Casca comum das telas de módulo: cena da missão no topo, conteúdo no papel da Trilha, menu flutuante. */
function ModuleShell({ moduleMeta, stats, children }: { moduleMeta: ModuleMeta; stats?: ReactNode; children: ReactNode }) {
  const index = Math.max(0, MODULE_LIST.findIndex((module) => module.id === moduleMeta.id));
  return (
    <div className="journey-home min-h-screen min-h-[100dvh] bg-journey-surface pb-28 font-ui text-journey-ink">
      <ModuleHero moduleMeta={moduleMeta} missionNumber={index + 1} art={MISSION_ART[index % MISSION_ART.length]} stats={stats} />
      <main className="relative mx-auto max-w-3xl px-5 pt-8 sm:px-8">{children}</main>
      <FloatingLearningNav />
    </div>
  );
}

function ModuleStats({ lessons, chars, charsLabel = "Caracteres", percent }: { lessons: string; chars: string; charsLabel?: string; percent: number }) {
  return (
    <div role="group" aria-label="Progresso do módulo" className="grid grid-cols-3 gap-2">
      <StatTile label="Lições" value={lessons} />
      <StatTile label={charsLabel} value={chars} />
      <StatTile label="Progresso" value={`${percent}%`} />
    </div>
  );
}

function BackToTrail() {
  return (
    <Link
      to="/home"
      className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-2xl border-2 border-journey-wood/20 bg-white px-6 text-sm font-black text-journey-ink outline-none transition hover:border-journey-orange/40 focus-visible:ring-4 focus-visible:ring-journey-orange/40"
    >
      Ver outras missões
    </Link>
  );
}

/** Módulo bloqueado ou ainda em construção: o que vem nele e por que não dá para entrar. */
function UnavailableModule({ moduleMeta }: { moduleMeta: ModuleMeta }) {
  const locked = Boolean(moduleMeta.locked);
  return (
    <ModuleShell moduleMeta={moduleMeta}>
      <Panel>
        <div className="flex items-start gap-4">
          <div aria-hidden="true" className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border-2 border-[hsl(var(--journey-wood-deep))] bg-journey-forest-deep text-journey-gold">
            {locked ? <Lock size={24} /> : <Construction size={24} />}
          </div>
          <div>
            <h2 className="font-display text-xl font-black text-journey-ink">{locked ? "Missão bloqueada" : "Em construção"}</h2>
            <p className="mt-1 text-sm font-semibold text-journey-ink/75">
              {locked ? `Complete as missões anteriores para liberar ${moduleMeta.label}.` : "Este módulo estará disponível em breve. Complete os módulos anteriores primeiro!"}
            </p>
          </div>
        </div>

        <h3 className="mt-6 text-[11px] font-black uppercase tracking-[0.14em] text-journey-wood">Conteúdo da missão</h3>
        <ol className="mt-3 flex flex-col gap-2">
          {moduleMeta.topics.map((topic, index) => (
            <li key={topic} className="flex items-center gap-3 rounded-xl bg-journey-sand/70 px-3 py-2 text-sm font-bold text-journey-ink">
              <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-journey-forest-deep text-xs font-black text-journey-gold">
                {index + 1}
              </span>
              {topic}
            </li>
          ))}
        </ol>
        <BackToTrail />
      </Panel>
    </ModuleShell>
  );
}

export default function ModulePage() {
  const { module } = useParams<{ module: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { progress, getLessonProgress, isLessonUnlocked, getModulePercent } = useProgress();

  const moduleMeta = MODULE_LIST.find((m) => m.id === module);
  const moduleId = moduleMeta?.id as ModuleType | undefined;
  const activeSection = parseKanaSection(searchParams.get("secao"));

  const kanaTrails = useMemo(
    () =>
      KANA_SECTIONS.map((section) =>
        buildTrail({
          groups: section.groups,
          getScopedId: kanaScopedId(section.id),
          getProgress: (scopedId) => getLessonProgress("kana", scopedId),
          isUnlocked: (index, ids) => isLessonUnlocked("kana", index, ids),
        })
      ),
    [getLessonProgress, isLessonUnlocked]
  );

  if (!moduleMeta || !moduleId) return null;
  if (moduleMeta.locked || (moduleId !== "kana" && moduleId !== "japones-pratica")) return <UnavailableModule moduleMeta={moduleMeta} />;

  const lessonHref = (lesson: TrailLesson) => `/module/${moduleId}/lesson/${lesson.scopedId}`;
  const moduleProgress = progress[moduleId];

  if (moduleId === "kana") {
    const sectionIndex = KANA_SECTIONS.findIndex((section) => section.id === activeSection);
    const section = KANA_SECTIONS[sectionIndex];
    const trail = kanaTrails[sectionIndex];
    const summary = summarizeTrail(trail);
    const next = nextLesson(trail);
    const totals = kanaTrails.map(summarizeTrail).reduce((sum, item) => ({ completed: sum.completed + item.completed, total: sum.total + item.total }), { completed: 0, total: 0 });
    const options: SectionOption[] = KANA_SECTIONS.map((item, index) => ({ id: item.id, label: item.label, glyph: item.glyph, summary: summarizeTrail(kanaTrails[index]) }));
    const details = (lesson: TrailLesson) => `${plural(lesson.group.chars.length, "caractere", "caracteres")} · 3 etapas`;

    return (
      <ModuleShell
        moduleMeta={moduleMeta}
        stats={
          <ModuleStats
            lessons={`${totals.completed}/${totals.total}`}
            chars={`${moduleProgress?.learnedChars ?? 0}/${moduleProgress?.totalChars ?? 0}`}
            percent={getModulePercent("kana")}
          />
        }
      >
        <SectionSwitcher
          sections={options}
          active={section.id}
          // `replace`: trocar de aba não enche o histórico (o "voltar" do celular sai do módulo).
          onSelect={(id) => setSearchParams({ secao: id }, { replace: true })}
        />

        <div className="mt-8">
          <TrailHeading
            title={section.label}
            jp={section.sublabel}
            details={`${plural(section.groups.length, "lição", "lições")} · ${plural(section.allChars.length, "caractere", "caracteres")}`}
            summary={summary}
          />
        </div>

        <div className="mt-5">
          <NextLessonPanel lesson={next} href={next ? lessonHref(next) : null} details={next ? details(next) : ""} allDone={summary.completed === summary.total} />
        </div>

        <div className="mt-6">
          <LessonTrail trail={trail} fallbackGlyph={section.glyph} getDetails={details} getHref={lessonHref} />
        </div>
      </ModuleShell>
    );
  }

  // Japonês na Prática: uma trilha só, liberada em sequência.
  const trail = buildTrail({
    groups: practicaGroups,
    getScopedId: practicaScopedId,
    getProgress: (scopedId) => getLessonProgress(moduleId, scopedId),
    isUnlocked: (index, ids) => isLessonUnlocked(moduleId, index, ids),
  });
  const summary = summarizeTrail(trail);
  const next = nextLesson(trail);
  const details = (lesson: TrailLesson) => `${plural(lesson.group.readingWords.length, "palavra", "palavras")} · 3 etapas`;

  return (
    <ModuleShell
      moduleMeta={moduleMeta}
      stats={
        <ModuleStats
          lessons={`${summary.completed}/${summary.total}`}
          chars={`${moduleProgress?.learnedChars ?? 0}/${allPratica.length}`}
          charsLabel="Itens"
          percent={getModulePercent(moduleId)}
        />
      }
    >
      <TrailHeading
        title="Lições"
        details={`${plural(practicaGroups.length, "lição", "lições")} · ${plural(allPratica.length, "item", "itens")}`}
        summary={summary}
      />
      <div className="mt-5">
        <NextLessonPanel lesson={next} href={next ? lessonHref(next) : null} details={next ? details(next) : ""} allDone={summary.completed === summary.total} />
      </div>
      <div className="mt-6">
        <LessonTrail trail={trail} fallbackGlyph={moduleMeta.emoji} getDetails={details} getHref={lessonHref} />
      </div>
    </ModuleShell>
  );
}
