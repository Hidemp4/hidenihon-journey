import { Settings2 } from "lucide-react";
import { AlphabetSetting, KanaGroupsPanel } from "@/features/dojo/shared/components/KanaContentPicker";
import { OptionButton, Panel, SectionTitle, SettingGroup } from "@/features/dojo/shared/components/ui";
import { formatDuration } from "@/features/dojo/shared/format";
import type { KanaGroupOption } from "@/features/dojo/shared/kanaDeck";
import { DIFFICULTY_OPTIONS, MODE_OPTIONS, TARGET_COUNT_OPTIONS, TIME_LIMIT_OPTIONS } from "../constants";
import type { DojoSettings } from "../types";

interface LobbySettingsProps {
  settings: DojoSettings;
  groups: KanaGroupOption[];
  onUpdate: (patch: Partial<DojoSettings>) => void;
  onToggleGroup: (groupId: string) => void;
}

interface RankCardProps {
  active: boolean;
  rank: string;
  label: string;
  description: string;
  onClick: () => void;
}

/** Cartão de rank: o kanji é o protagonista e a descrição fica sempre visível (title não funciona no toque). */
function RankCard({ active, rank, label, description, onClick }: RankCardProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={`${label}: ${description}`}
      onClick={onClick}
      className={`flex min-h-32 flex-col items-center rounded-xl border-2 px-2 py-3 text-center transition active:scale-[0.98] ${
        active
          ? "border-journey-orange bg-journey-forest-deep text-white shadow-[0_4px_0_hsl(var(--journey-orange)/.55)]"
          : "border-journey-wood/15 bg-white/70 text-journey-ink hover:border-journey-orange/40 hover:bg-white"
      }`}
    >
      <span aria-hidden="true" className={`font-jp text-3xl font-black leading-none ${active ? "text-journey-gold" : "text-journey-ink/75"}`}>
        {rank}
      </span>
      <span aria-hidden="true" className="mt-2 text-xs font-black">
        {label}
      </span>
      <span aria-hidden="true" className={`mt-1 text-[11px] font-semibold leading-snug ${active ? "text-white/80" : "text-journey-ink/65"}`}>
        {description}
      </span>
    </button>
  );
}

function FocusSwitch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="mt-5 flex w-full items-center justify-between gap-4 rounded-xl border-2 border-journey-wood/15 bg-white/60 px-4 py-3 text-left transition hover:bg-white"
    >
      <span>
        <span className="block text-xs font-black text-journey-ink">Modo foco</span>
        <span className="mt-1 block text-[11px] font-semibold text-journey-ink/70">Remove a arena animada e os efeitos durante o treino.</span>
      </span>
      <span aria-hidden="true" className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? "bg-journey-orange" : "bg-journey-wood/25"}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-6" : "left-1"}`} />
      </span>
    </button>
  );
}

export function LobbySettings({ settings, groups, onUpdate, onToggleGroup }: LobbySettingsProps) {
  return (
    <>
      <Panel>
        <SectionTitle icon={<Settings2 size={17} />} eyebrow="Preparação" title="Configure sua missão" />

        <AlphabetSetting value={settings.alphabet} onChange={(alphabet) => onUpdate({ alphabet })} />

        <SettingGroup label="Rank">
          <div className="grid grid-cols-3 gap-2">
            {DIFFICULTY_OPTIONS.map((difficulty) => (
              <RankCard
                key={difficulty.id}
                active={settings.difficulty === difficulty.id}
                rank={difficulty.rank}
                label={difficulty.label}
                description={difficulty.description}
                onClick={() => onUpdate({ difficulty: difficulty.id })}
              />
            ))}
          </div>
        </SettingGroup>

        <SettingGroup label="Formato">
          <div className="grid grid-cols-3 gap-2">
            {MODE_OPTIONS.map((mode) => (
              <OptionButton key={mode.id} active={settings.mode === mode.id} onClick={() => onUpdate({ mode: mode.id })}>
                {mode.label}
              </OptionButton>
            ))}
          </div>
        </SettingGroup>

        {settings.mode === "timed" && (
          <SettingGroup label="Duração">
            <div className="grid grid-cols-4 gap-2">
              {TIME_LIMIT_OPTIONS.map((seconds) => (
                <OptionButton key={seconds} active={settings.timeLimitSeconds === seconds} onClick={() => onUpdate({ timeLimitSeconds: seconds })}>
                  {formatDuration(seconds)}
                </OptionButton>
              ))}
            </div>
          </SettingGroup>
        )}

        {settings.mode === "quantity" && (
          <SettingGroup label="Tamanho da rodada">
            <div className="grid grid-cols-3 gap-2">
              {TARGET_COUNT_OPTIONS.map((count) => (
                <OptionButton key={count} active={settings.targetCount === count} onClick={() => onUpdate({ targetCount: count })}>
                  {count} kana
                </OptionButton>
              ))}
            </div>
          </SettingGroup>
        )}

        <FocusSwitch checked={settings.focusMode} onChange={(focusMode) => onUpdate({ focusMode })} />
      </Panel>

      <KanaGroupsPanel
        alphabet={settings.alphabet}
        groups={groups}
        selectedGroupIds={settings.selectedGroupIds}
        onSelectAll={() => onUpdate({ selectedGroupIds: [] })}
        onToggle={onToggleGroup}
      />
    </>
  );
}
