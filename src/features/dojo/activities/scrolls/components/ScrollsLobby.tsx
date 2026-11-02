import { BookOpen, Shuffle } from "lucide-react";
import { systemUtcOffset } from "@/features/dojo/shared/calendar";
import { AlphabetSetting, ContentSetting, KanaGroupsPanel } from "@/features/dojo/shared/components/KanaContentPicker";
import { OptionButton, Panel, SectionTitle, SettingGroup } from "@/features/dojo/shared/components/ui";
import type { ContentGroupOption } from "@/features/dojo/shared/content";
import { NEW_PER_DAY_OPTIONS } from "../constants";
import type { ReviewAvailability } from "../queue";
import { describeDueAt } from "../scheduler";
import type { ScrollsSettings } from "../types";

interface ScrollsSettingsPanelProps {
  settings: ScrollsSettings;
  groups: readonly ContentGroupOption[];
  onUpdate: (patch: Partial<ScrollsSettings>) => void;
  onToggleGroup: (groupId: string) => void;
}

export function ScrollsSettingsPanel({ settings, groups, onUpdate, onToggleGroup }: ScrollsSettingsPanelProps) {
  return (
    <>
      <Panel>
        <SectionTitle icon={<BookOpen size={17} aria-hidden="true" />} eyebrow="Preparação" title="Configure a revisão" />
        <ContentSetting value={settings.content} onChange={(content) => onUpdate({ content })} />
        {settings.content === "kana" && <AlphabetSetting value={settings.alphabet} onChange={(alphabet) => onUpdate({ alphabet })} />}

        <SettingGroup label="Novos por dia">
          <div className="grid grid-cols-3 gap-2">
            {NEW_PER_DAY_OPTIONS.map((count) => (
              <OptionButton key={count} active={settings.newPerDay === count} onClick={() => onUpdate({ newPerDay: count })}>
                {count} novos
              </OptionButton>
            ))}
          </div>
        </SettingGroup>
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

const primaryButton =
  "inline-flex min-h-14 min-w-52 items-center justify-center gap-2 rounded-2xl border-2 border-journey-gold/60 bg-journey-orange px-6 text-sm font-black text-white shadow-[0_5px_0_hsl(var(--journey-orange)/.45)] transition hover:bg-journey-orange-hover active:translate-y-0.5 active:shadow-none motion-safe:hover:-translate-y-0.5";
const secondaryButton =
  "inline-flex min-h-12 min-w-52 items-center justify-center gap-2 rounded-2xl border-2 border-journey-wood/20 bg-white px-6 text-sm font-black text-journey-ink transition hover:border-journey-orange/40 active:scale-[0.98]";

interface ScrollsStartPanelProps {
  availability: ReviewAvailability;
  newPerDay: number;
  now: number;
  storageWarning: boolean;
  onStartReview: () => void;
  onStartFree: () => void;
}

export function ScrollsStartPanel({ availability, newPerDay, now, storageWarning, onStartReview, onStartFree }: ScrollsStartPanelProps) {
  const { due, fresh, unseen, nextDueAt } = availability;
  const empty = due + fresh === 0;

  const emptyDetail =
    nextDueAt != null
      ? `Próxima revisão ${describeDueAt(nextDueAt, now, systemUtcOffset)}.`
      : unseen > 0
        ? `Os ${newPerDay} novos de hoje já foram abertos. Volte amanhã para mais.`
        : "Escolha outros grupos ou faça um treino livre.";

  return (
    <section className="relative isolate overflow-hidden rounded-[2rem] border-2 border-[hsl(var(--journey-wood-deep))] bg-journey-forest-deep p-2.5 shadow-[0_8px_0_hsl(var(--journey-wood-deep)/.35)] sm:p-4">
      <div className="journey-leaf-pattern absolute inset-0 opacity-10" aria-hidden="true" />
      <div className="relative rounded-[1.5rem] bg-journey-sand p-5 py-8 text-center sm:p-8">
        <p aria-hidden="true" className="font-jp text-5xl font-black text-journey-wood">
          巻物
        </p>
        <p className="mt-4 text-[11px] font-black uppercase tracking-[0.18em] text-journey-orange">
          {empty ? "Agenda em dia" : "Revisão de hoje"}
        </p>
        <h2 className="mt-2 font-display text-3xl font-black tracking-[-0.045em] text-journey-ink">
          {empty ? "Tudo revisado por hoje" : `${due + fresh} ${due + fresh === 1 ? "pergaminho" : "pergaminhos"}`}
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-sm font-semibold leading-6 text-journey-ink/75">
          {empty ? emptyDetail : `${due} para revisar · ${fresh} ${fresh === 1 ? "novo" : "novos"} hoje`}
        </p>

        <div className="mt-6 flex flex-col items-center gap-3">
          {!empty && (
            <button type="button" onClick={onStartReview} className={primaryButton}>
              <BookOpen size={17} aria-hidden="true" /> Começar revisão
            </button>
          )}
          <button type="button" onClick={onStartFree} className={empty ? primaryButton : secondaryButton}>
            <Shuffle size={17} aria-hidden="true" /> Treino livre
          </button>
          <p className="max-w-xs text-xs font-semibold text-journey-ink/70">O treino livre não mexe na agenda.</p>
        </div>

        {storageWarning && (
          <p className="mt-4 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-journey-ink" role="alert">
            Não foi possível salvar o progresso neste navegador. O treino continua funcionando normalmente.
          </p>
        )}
      </div>
    </section>
  );
}
