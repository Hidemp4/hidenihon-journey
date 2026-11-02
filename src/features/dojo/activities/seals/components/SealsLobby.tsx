import { Stamp } from "lucide-react";
import { AlphabetSetting, KanaGroupsPanel } from "@/features/dojo/shared/components/KanaContentPicker";
import { OptionButton, Panel, SectionTitle, SettingGroup } from "@/features/dojo/shared/components/ui";
import { ALPHABET_OPTIONS } from "@/features/dojo/shared/constants";
import { formatTimer } from "@/features/dojo/shared/format";
import type { ContentGroupOption } from "@/features/dojo/shared/content";
import { BOARD_SIZES, getBoardSize, PAIR_TYPE_OPTIONS } from "../constants";
import { contentSelection } from "../pairs";
import { elapsedSeconds } from "../results";
import type { SealsBest, SealsSettings } from "../types";
import { Stars } from "./Stars";

interface SealsSettingsPanelProps {
  settings: SealsSettings;
  groups: readonly ContentGroupOption[];
  onUpdate: (patch: Partial<SealsSettings>) => void;
  onToggleGroup: (groupId: string) => void;
}

export function SealsSettingsPanel({ settings, groups, onUpdate, onToggleGroup }: SealsSettingsPanelProps) {
  return (
    <>
      <Panel>
        <SectionTitle icon={<Stamp size={17} aria-hidden="true" />} eyebrow="Preparação" title="Monte a mesa" />

        <SettingGroup label="Pares">
          <div className="grid grid-cols-3 gap-2">
            {PAIR_TYPE_OPTIONS.map((option) => (
              <OptionButton key={option.id} active={settings.pairType === option.id} onClick={() => onUpdate({ pairType: option.id })} className="min-h-16">
                <span aria-hidden="true" className="block font-jp text-lg leading-none">
                  {option.example}
                </span>
                <span className="mt-1 block">{option.label}</span>
              </OptionButton>
            ))}
          </div>
        </SettingGroup>

        {/* Hiragana ↔ katakana sempre usa os dois alfabetos: a escolha de alfabeto não se aplica. */}
        {settings.pairType === "kana-romaji" && <AlphabetSetting value={settings.alphabet} onChange={(alphabet) => onUpdate({ alphabet })} />}

        <SettingGroup label="Tabuleiro">
          <div className="grid grid-cols-3 gap-2">
            {BOARD_SIZES.map((size) => (
              <OptionButton key={size.id} active={settings.sizeId === size.id} onClick={() => onUpdate({ sizeId: size.id })}>
                <span className="block font-display text-base">{size.label}</span>
                <span className={`mt-0.5 block text-[11px] font-semibold ${settings.sizeId === size.id ? "text-white/85" : "text-journey-ink/70"}`}>
                  {size.pairs} pares
                </span>
              </OptionButton>
            ))}
          </div>
        </SettingGroup>
      </Panel>

      <KanaGroupsPanel
        alphabet={contentSelection(settings).alphabet}
        title={settings.pairType === "kanji-meaning" ? "Temas de kanji" : "Grupos de kana"}
        groups={groups}
        selectedGroupIds={settings.selectedGroupIds}
        onSelectAll={() => onUpdate({ selectedGroupIds: [] })}
        onToggle={onToggleGroup}
      />
    </>
  );
}

function describeSeals(settings: SealsSettings) {
  const pairType = PAIR_TYPE_OPTIONS.find(({ id }) => id === settings.pairType)?.label;
  const alphabet = settings.pairType === "kana-romaji" ? ALPHABET_OPTIONS.find(({ id }) => id === settings.alphabet)?.label : null;
  const size = getBoardSize(settings.sizeId);
  return [pairType, alphabet, `${size.label} (${size.pairs} pares)`].filter(Boolean).join(" · ");
}

interface SealsStartPanelProps {
  settings: SealsSettings;
  availablePairs: number;
  best: SealsBest | null;
  storageWarning: boolean;
  onStart: () => void;
}

export function SealsStartPanel({ settings, availablePairs, best, storageWarning, onStart }: SealsStartPanelProps) {
  const size = getBoardSize(settings.sizeId);
  const enough = availablePairs >= size.pairs;

  return (
    <section className="relative isolate overflow-hidden rounded-[2rem] border-2 border-[hsl(var(--journey-wood-deep))] bg-journey-forest-deep p-2.5 shadow-[0_8px_0_hsl(var(--journey-wood-deep)/.35)] sm:p-4">
      <div className="journey-leaf-pattern absolute inset-0 opacity-10" aria-hidden="true" />
      <div className="relative rounded-[1.5rem] bg-journey-sand p-5 py-8 text-center sm:p-8">
        <p
          aria-hidden="true"
          className="mx-auto grid h-24 w-24 -rotate-6 place-items-center rounded-2xl border-4 border-journey-orange bg-white/70 font-jp text-6xl font-black leading-none text-journey-orange"
        >
          印
        </p>
        <p className="mt-5 text-[11px] font-black uppercase tracking-[0.18em] text-journey-orange">Próxima partida</p>
        <h2 className="mt-2 font-display text-3xl font-black tracking-[-0.045em] text-journey-ink">Pronto para carimbar?</h2>
        <p className="mx-auto mt-3 max-w-sm text-sm font-semibold leading-6 text-journey-ink/75">
          Vire duas cartas por vez e encontre os pares. Setas andam pela mesa; Enter ou Espaço vira.
        </p>
        <p className="mx-auto mt-4 w-fit rounded-full border-2 border-journey-wood/15 bg-white px-4 py-1.5 text-xs font-black text-journey-ink/80">
          {describeSeals(settings)}
        </p>
        {enough ? (
          <p className="mt-2 text-[11px] font-semibold text-journey-ink/70">Sorteio entre {availablePairs} pares do conteúdo escolhido</p>
        ) : (
          <p className="mx-auto mt-3 max-w-xs text-xs font-semibold text-journey-ink/80">
            Este tabuleiro pede {size.pairs} pares e o conteúdo escolhido tem {availablePairs}. Escolha mais grupos ou um tabuleiro menor.
          </p>
        )}

        <button
          type="button"
          onClick={onStart}
          disabled={!enough}
          className="mt-6 inline-flex min-h-14 min-w-52 items-center justify-center gap-2 rounded-2xl border-2 border-journey-gold/60 bg-journey-orange px-6 text-sm font-black text-white shadow-[0_5px_0_hsl(var(--journey-orange)/.45)] transition hover:bg-journey-orange-hover active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 motion-safe:hover:-translate-y-0.5"
        >
          <Stamp size={17} aria-hidden="true" /> Começar partida
        </button>

        {best && (
          <p className="mt-4 text-xs font-bold text-journey-ink/75">
            Recorde neste tabuleiro: {best.moves} jogadas · {formatTimer(elapsedSeconds(best.ms))} · <Stars count={best.stars} size={14} />
          </p>
        )}
        {storageWarning && (
          <p className="mt-4 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-journey-ink" role="alert">
            Não foi possível salvar o resultado neste navegador. O jogo continua funcionando normalmente.
          </p>
        )}
      </div>
    </section>
  );
}
