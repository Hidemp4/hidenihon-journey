import { useId, useState, type ReactNode } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { ALPHABET_OPTIONS } from "../constants";
import { CONTENT_OPTIONS, type ContentGroupOption, type StudyContent } from "../content";
import type { KanaAlphabet } from "../kanaDeck";
import { OptionButton, Panel, SectionTitle, SettingGroup } from "./ui";

/** Kana ou Kanji N5: vem antes do alfabeto (que só vale para kana). */
export function ContentSetting({ value, onChange }: { value: StudyContent; onChange: (content: StudyContent) => void }) {
  return (
    <SettingGroup label="Conteúdo">
      <div className="grid grid-cols-2 gap-2">
        {CONTENT_OPTIONS.map((content) => (
          <OptionButton key={content.id} active={value === content.id} onClick={() => onChange(content.id)}>
            <span aria-hidden="true" className="block font-jp text-lg leading-none">
              {content.glyph}
            </span>
            <span className="mt-1 block">{content.label}</span>
          </OptionButton>
        ))}
      </div>
    </SettingGroup>
  );
}

/** Escolha de alfabeto (Hiragana / Katakana / Ambos), igual em todas as atividades de kana. */
export function AlphabetSetting({ value, onChange }: { value: KanaAlphabet; onChange: (alphabet: KanaAlphabet) => void }) {
  return (
    <SettingGroup label="Alfabeto">
      <div className="grid grid-cols-3 gap-2">
        {ALPHABET_OPTIONS.map((alphabet) => (
          <OptionButton key={alphabet.id} active={value === alphabet.id} onClick={() => onChange(alphabet.id)}>
            <span aria-hidden="true" className="block font-jp text-lg leading-none">
              {alphabet.glyph}
            </span>
            <span className="mt-1 block">{alphabet.label}</span>
          </OptionButton>
        ))}
      </div>
    </SettingGroup>
  );
}

function groupLabel(group: ContentGroupOption, mixed: boolean) {
  if (!mixed || !group.alphabet) return group.label;
  return `${group.label} ${group.alphabet === "hiragana" ? "あ" : "ア"}`;
}

interface AdvancedSettingsProps {
  /** O que está valendo agora, visível mesmo fechado (ex.: "Grupos de kana: todos"). */
  summary: string;
  children: ReactNode;
}

/**
 * Ajustes que quase ninguém precisa mexer ficam fechados atrás de "Abrir configurações avançadas":
 * o lobby mostra primeiro o essencial, e o resumo diz o que está valendo sem precisar abrir.
 */
export function AdvancedSettings({ summary, children }: AdvancedSettingsProps) {
  const [open, setOpen] = useState(false);
  const contentId = useId();

  return (
    <Panel>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((current) => !current)}
        className="-m-2 flex min-h-12 w-[calc(100%+1rem)] items-center gap-3 rounded-xl p-2 text-left transition hover:bg-journey-sand/70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-journey-orange/25"
      >
        <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-journey-sand text-journey-ink/75">
          <SlidersHorizontal size={18} strokeWidth={2.4} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black text-journey-ink">
            {open ? "Fechar configurações avançadas" : "Abrir configurações avançadas"}
          </span>
          <span className="mt-0.5 block text-xs font-semibold text-journey-ink/70">{summary}</span>
        </span>
        <ChevronDown
          size={20}
          strokeWidth={2.6}
          aria-hidden="true"
          className={`shrink-0 text-journey-ink/60 motion-safe:transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div id={contentId} hidden={!open}>
        {open && <div className="mt-6 border-t border-journey-wood/10 pt-5">{children}</div>}
      </div>
    </Panel>
  );
}

/** Até 3 nomes e "+N": dá para ver o filtro sem abrir as configurações avançadas. */
function describeGroupSelection(title: string, groups: readonly ContentGroupOption[], selectedGroupIds: readonly string[], mixed: boolean) {
  const selected = groups.filter((group) => selectedGroupIds.includes(group.id));
  if (selected.length === 0) return `${title}: todos`;

  const names = selected.slice(0, 3).map((group) => groupLabel(group, mixed));
  const rest = selected.length - names.length;
  return `${title}: ${names.join(", ")}${rest > 0 ? ` +${rest}` : ""}`;
}

interface KanaGroupsPanelProps {
  alphabet: KanaAlphabet;
  groups: readonly ContentGroupOption[];
  /** Vazio = "Todos" (o padrão). */
  selectedGroupIds: readonly string[];
  onSelectAll: () => void;
  onToggle: (groupId: string) => void;
  /** Kanji usam o mesmo painel, com outro título. */
  title?: string;
}

/**
 * Filtro de grupos de todas as atividades: fica nas configurações avançadas (fechadas), e por padrão
 * vale tudo. Quem quiser treinar só alguns grupos abre e escolhe.
 */
export function KanaGroupsPanel({ alphabet, groups, selectedGroupIds, onSelectAll, onToggle, title = "Grupos de kana" }: KanaGroupsPanelProps) {
  const mixed = alphabet === "mixed";

  return (
    <AdvancedSettings summary={describeGroupSelection(title, groups, selectedGroupIds, mixed)}>
      <SectionTitle eyebrow="Conteúdo" title={title} />
      <div className="flex flex-wrap gap-2">
        <OptionButton active={selectedGroupIds.length === 0} onClick={onSelectAll}>
          Todos
        </OptionButton>
        {groups.map((group) => (
          <OptionButton key={group.id} active={selectedGroupIds.includes(group.id)} onClick={() => onToggle(group.id)}>
            {groupLabel(group, mixed)}
          </OptionButton>
        ))}
      </div>
    </AdvancedSettings>
  );
}
