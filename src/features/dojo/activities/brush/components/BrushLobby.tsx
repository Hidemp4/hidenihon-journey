import { Brush, RotateCcw } from "lucide-react";
import { AlphabetSetting, ContentSetting, KanaGroupsPanel } from "@/features/dojo/shared/components/KanaContentPicker";
import { OptionButton, Panel, SectionTitle, SettingGroup } from "@/features/dojo/shared/components/ui";
import { ALPHABET_OPTIONS } from "@/features/dojo/shared/constants";
import { CONTENT_OPTIONS, type ContentGroupOption } from "@/features/dojo/shared/content";
import { MODE_OPTIONS, SESSION_SIZE_OPTIONS } from "../constants";
import type { BrushSettings } from "../types";
import { StrokeAttribution } from "./StrokeAttribution";

interface BrushSettingsPanelProps {
  settings: BrushSettings;
  groups: readonly ContentGroupOption[];
  onUpdate: (patch: Partial<BrushSettings>) => void;
  onToggleGroup: (groupId: string) => void;
}

export function BrushSettingsPanel({ settings, groups, onUpdate, onToggleGroup }: BrushSettingsPanelProps) {
  return (
    <>
      <Panel>
        <SectionTitle icon={<Brush size={17} aria-hidden="true" />} eyebrow="Preparação" title="Prepare o pincel" />

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

        <SettingGroup label="Por sessão">
          <div className="grid grid-cols-3 gap-2">
            {SESSION_SIZE_OPTIONS.map((size) => (
              <OptionButton key={size} active={settings.sessionSize === size} onClick={() => onUpdate({ sessionSize: size })}>
                {size} {settings.content === "kanji" ? "kanji" : "kana"}
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

const MODE_INTRO: Readonly<Record<BrushSettings["mode"], string>> = {
  trace: "Veja a ordem e trace por cima do guia. Cada traço é conferido: ordem, direção e forma.",
  recall: "Só a resposta aparece (romaji ou significado). Escreva de memória, confira com o modelo e diga como foi.",
  study: "Assista à ordem dos traços, um caractere por vez, sem desenhar.",
};

interface BrushStartPanelProps {
  settings: BrushSettings;
  deckSize: number;
  ready: boolean;
  loadFailed: boolean;
  practicedCount: number;
  storageWarning: boolean;
  onStart: () => void;
  onRetryLoad: () => void;
}

export function BrushStartPanel({ settings, deckSize, ready, loadFailed, practicedCount, storageWarning, onStart, onRetryLoad }: BrushStartPanelProps) {
  const mode = MODE_OPTIONS.find(({ id }) => id === settings.mode)?.label;
  const unit = settings.content === "kanji" ? "kanji" : "kana";
  const alphabet =
    settings.content === "kanji"
      ? CONTENT_OPTIONS.find(({ id }) => id === "kanji")?.label
      : ALPHABET_OPTIONS.find(({ id }) => id === settings.alphabet)?.label;

  return (
    <section className="relative isolate overflow-hidden rounded-[2rem] border-2 border-[hsl(var(--journey-wood-deep))] bg-journey-forest-deep p-2.5 shadow-[0_8px_0_hsl(var(--journey-wood-deep)/.35)] sm:p-4">
      <div className="journey-leaf-pattern absolute inset-0 opacity-10" aria-hidden="true" />
      <div className="relative rounded-[1.5rem] bg-journey-sand p-5 py-8 text-center sm:p-8">
        <p aria-hidden="true" className="font-jp text-6xl font-black leading-none text-journey-wood">
          筆
        </p>
        <p className="mt-4 text-[11px] font-black uppercase tracking-[0.18em] text-journey-orange">Próxima sessão</p>
        <h2 className="mt-2 font-display text-3xl font-black tracking-[-0.045em] text-journey-ink">Pronto para escrever?</h2>
        <p className="mx-auto mt-3 max-w-sm text-sm font-semibold leading-6 text-journey-ink/75">{MODE_INTRO[settings.mode]}</p>
        <p className="mx-auto mt-4 w-fit rounded-full border-2 border-journey-wood/15 bg-white px-4 py-1.5 text-xs font-black text-journey-ink/80">
          {[mode, alphabet, `${Math.min(settings.sessionSize, deckSize)} ${unit}`].join(" · ")}
        </p>

        {/* Sempre montado: avisa quando os traços terminam de carregar (ou falham). */}
        <p role="status" className="mt-2 text-[11px] font-semibold text-journey-ink/75">
          {loadFailed ? "" : ready ? `${deckSize} ${unit} no baralho · ${practicedCount} já praticados` : "Carregando os traços…"}
        </p>
        {loadFailed && (
          <div role="alert" className="mx-auto mt-3 max-w-xs rounded-xl bg-white px-3 py-2 text-xs font-semibold text-journey-ink">
            Não foi possível carregar os traços.
            <button type="button" onClick={onRetryLoad} className="ml-1 inline-flex min-h-11 items-center gap-1 font-black text-journey-orange underline">
              <RotateCcw size={13} aria-hidden="true" /> Tentar de novo
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onStart}
          disabled={!ready || deckSize === 0}
          className="mt-6 inline-flex min-h-14 min-w-52 items-center justify-center gap-2 rounded-2xl border-2 border-journey-gold/60 bg-journey-orange px-6 text-sm font-black text-white shadow-[0_5px_0_hsl(var(--journey-orange)/.45)] transition hover:bg-journey-orange-hover active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 motion-safe:hover:-translate-y-0.5"
        >
          <Brush size={17} aria-hidden="true" /> Começar sessão
        </button>

        {storageWarning && (
          <p className="mt-4 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-journey-ink" role="alert">
            Não foi possível salvar o progresso neste navegador. O treino continua funcionando normalmente.
          </p>
        )}
        <StrokeAttribution className="mt-6" />
      </div>
    </section>
  );
}
