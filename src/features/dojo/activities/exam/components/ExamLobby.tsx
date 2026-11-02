import { GraduationCap } from "lucide-react";
import { AlphabetSetting, ContentSetting, KanaGroupsPanel } from "@/features/dojo/shared/components/KanaContentPicker";
import { OptionButton, Panel, SectionTitle, SettingGroup } from "@/features/dojo/shared/components/ui";
import { ALPHABET_OPTIONS } from "@/features/dojo/shared/constants";
import { CONTENT_OPTIONS, directionLabel, type ContentGroupOption } from "@/features/dojo/shared/content";
import { DIRECTION_OPTIONS, MODE_OPTIONS, OPTION_COUNT, QUESTION_COUNT_OPTIONS, TIME_LIMIT_OPTIONS } from "../constants";
import type { LastExamResult } from "../examRepository";
import type { ExamSettings } from "../types";

interface ExamSettingsPanelProps {
  settings: ExamSettings;
  groups: readonly ContentGroupOption[];
  onUpdate: (patch: Partial<ExamSettings>) => void;
  onToggleGroup: (groupId: string) => void;
}

export function ExamSettingsPanel({ settings, groups, onUpdate, onToggleGroup }: ExamSettingsPanelProps) {
  return (
    <>
      <Panel>
        <SectionTitle icon={<GraduationCap size={17} aria-hidden="true" />} eyebrow="Preparação" title="Monte o exame" />

        <SettingGroup label="Modo">
          <div className="grid grid-cols-3 gap-2">
            {MODE_OPTIONS.map((mode) => (
              <OptionButton key={mode.id} active={settings.mode === mode.id} onClick={() => onUpdate({ mode: mode.id })} className="min-h-24">
                <span className="block">{mode.label}</span>
                <span className={`mt-1 block text-[11px] font-semibold leading-snug ${settings.mode === mode.id ? "text-white/85" : "text-journey-ink/70"}`}>
                  {mode.description}
                </span>
              </OptionButton>
            ))}
          </div>
        </SettingGroup>

        <ContentSetting value={settings.content} onChange={(content) => onUpdate({ content })} />
        {settings.content === "kana" && <AlphabetSetting value={settings.alphabet} onChange={(alphabet) => onUpdate({ alphabet })} />}

        <SettingGroup label="Direção">
          <div className="grid grid-cols-3 gap-2">
            {DIRECTION_OPTIONS.map((direction) => (
              <OptionButton key={direction.id} active={settings.direction === direction.id} onClick={() => onUpdate({ direction: direction.id })}>
                {directionLabel(settings.content, direction.id)}
              </OptionButton>
            ))}
          </div>
        </SettingGroup>

        {settings.mode !== "survival" && (
          <SettingGroup label="Perguntas">
            <div className="grid grid-cols-3 gap-2">
              {QUESTION_COUNT_OPTIONS.map((count) => (
                <OptionButton key={count} active={settings.questionCount === count} onClick={() => onUpdate({ questionCount: count })}>
                  {count} perguntas
                </OptionButton>
              ))}
            </div>
          </SettingGroup>
        )}

        {settings.mode === "lightning" && (
          <SettingGroup label="Tempo por pergunta">
            <div className="grid grid-cols-3 gap-2">
              {TIME_LIMIT_OPTIONS.map((seconds) => (
                <OptionButton key={seconds} active={settings.timeLimitSeconds === seconds} onClick={() => onUpdate({ timeLimitSeconds: seconds })}>
                  {seconds}s
                </OptionButton>
              ))}
            </div>
          </SettingGroup>
        )}

        <button
          type="button"
          role="switch"
          aria-checked={settings.autoAdvance}
          onClick={() => onUpdate({ autoAdvance: !settings.autoAdvance })}
          className="mt-5 flex w-full items-center justify-between gap-4 rounded-xl border-2 border-journey-wood/15 bg-white/60 px-4 py-3 text-left transition hover:bg-white"
        >
          <span>
            <span className="block text-xs font-black text-journey-ink">Avançar sozinho</span>
            <span className="mt-1 block text-[11px] font-semibold text-journey-ink/70">Depois do feedback, vai para a próxima sem precisar de Enter.</span>
          </span>
          <span aria-hidden="true" className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${settings.autoAdvance ? "bg-journey-orange" : "bg-journey-wood/25"}`}>
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${settings.autoAdvance ? "left-6" : "left-1"}`} />
          </span>
        </button>
      </Panel>

      <KanaGroupsPanel
        alphabet={settings.alphabet}
        groups={groups}
        selectedGroupIds={settings.selectedGroupIds}
        onSelectAll={() => onUpdate({ selectedGroupIds: [] })}
        onToggle={onToggleGroup}
        title={settings.content === "kanji" ? "Temas de kanji" : "Grupos de kana"}
      />
    </>
  );
}

function describeExam(settings: ExamSettings) {
  const mode = MODE_OPTIONS.find(({ id }) => id === settings.mode)?.label;
  const alphabet =
    settings.content === "kanji"
      ? CONTENT_OPTIONS.find(({ id }) => id === "kanji")?.label
      : ALPHABET_OPTIONS.find(({ id }) => id === settings.alphabet)?.label;
  const size =
    settings.mode === "survival"
      ? "3 vidas"
      : settings.mode === "lightning"
        ? `${settings.questionCount} perguntas · ${settings.timeLimitSeconds}s`
        : `${settings.questionCount} perguntas`;
  return [mode, alphabet, size].join(" · ");
}

interface ExamStartPanelProps {
  settings: ExamSettings;
  deckSize: number;
  lastResult: LastExamResult | null;
  storageWarning: boolean;
  onStart: () => void;
}

export function ExamStartPanel({ settings, deckSize, lastResult, storageWarning, onStart }: ExamStartPanelProps) {
  return (
    <section className="relative isolate overflow-hidden rounded-[2rem] border-2 border-[hsl(var(--journey-wood-deep))] bg-journey-forest-deep p-2.5 shadow-[0_8px_0_hsl(var(--journey-wood-deep)/.35)] sm:p-4">
      <div className="journey-leaf-pattern absolute inset-0 opacity-10" aria-hidden="true" />
      <div className="relative rounded-[1.5rem] bg-journey-sand p-5 py-8 text-center sm:p-8">
        <p aria-hidden="true" className="font-jp text-4xl font-black leading-tight text-journey-wood">
          中忍
          <br />
          試験
        </p>
        <p className="mt-4 text-[11px] font-black uppercase tracking-[0.18em] text-journey-orange">Próximo exame</p>
        <h2 className="mt-2 font-display text-3xl font-black tracking-[-0.045em] text-journey-ink">Pronto para o exame?</h2>
        <p className="mx-auto mt-3 max-w-sm text-sm font-semibold leading-6 text-journey-ink/75">
          Escolha entre {OPTION_COUNT} alternativas. Use 1–4 no teclado ou toque na resposta.
        </p>
        <p className="mx-auto mt-4 w-fit rounded-full border-2 border-journey-wood/15 bg-white px-4 py-1.5 text-xs font-black text-journey-ink/80">
          {describeExam(settings)}
        </p>
        <p className="mt-2 text-[11px] font-semibold text-journey-ink/70">{deckSize} {settings.content === "kanji" ? "kanji" : "kana"} no baralho</p>
        {deckSize < OPTION_COUNT && (
          <p className="mx-auto mt-2 max-w-xs text-xs font-semibold text-journey-ink/75">
            Com menos de {OPTION_COUNT} itens, as perguntas terão menos alternativas.
          </p>
        )}

        <button
          type="button"
          onClick={onStart}
          disabled={deckSize === 0}
          className="mt-6 inline-flex min-h-14 min-w-52 items-center justify-center gap-2 rounded-2xl border-2 border-journey-gold/60 bg-journey-orange px-6 text-sm font-black text-white shadow-[0_5px_0_hsl(var(--journey-orange)/.45)] transition hover:bg-journey-orange-hover active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 motion-safe:hover:-translate-y-0.5"
        >
          <GraduationCap size={17} aria-hidden="true" /> Começar exame
        </button>

        {lastResult && (
          <p className="mt-4 text-xs font-bold text-journey-ink/75">
            Última nota: {lastResult.score}% ({MODE_OPTIONS.find(({ id }) => id === lastResult.mode)?.label}, {lastResult.total} perguntas)
          </p>
        )}
        {storageWarning && (
          <p className="mt-4 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-journey-ink" role="alert">
            Não foi possível salvar o resultado neste navegador. O exame continua funcionando normalmente.
          </p>
        )}
      </div>
    </section>
  );
}
