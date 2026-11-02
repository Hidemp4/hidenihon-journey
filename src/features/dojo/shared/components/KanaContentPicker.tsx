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

interface KanaGroupsPanelProps {
  alphabet: KanaAlphabet;
  groups: readonly ContentGroupOption[];
  /** Vazio = "Todos". */
  selectedGroupIds: readonly string[];
  onSelectAll: () => void;
  onToggle: (groupId: string) => void;
  /** Kanji usam o mesmo painel, com outro título. */
  title?: string;
}

export function KanaGroupsPanel({ alphabet, groups, selectedGroupIds, onSelectAll, onToggle, title = "Grupos de kana" }: KanaGroupsPanelProps) {
  return (
    <Panel>
      <SectionTitle eyebrow="Conteúdo" title={title} />
      <div className="flex flex-wrap gap-2">
        <OptionButton active={selectedGroupIds.length === 0} onClick={onSelectAll}>
          Todos
        </OptionButton>
        {groups.map((group) => (
          <OptionButton key={group.id} active={selectedGroupIds.includes(group.id)} onClick={() => onToggle(group.id)}>
            {groupLabel(group, alphabet === "mixed")}
          </OptionButton>
        ))}
      </div>
    </Panel>
  );
}
