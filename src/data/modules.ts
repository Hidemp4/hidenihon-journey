/**
 * Module metadata for all learning modules in HideNihon.
 * The "kana" module aggregates hiragana + katakana + kanji sub-sections.
 */
import type { ModuleType } from "@/hooks/useProgress";

export interface ModuleMeta {
  id: ModuleType;
  label: string;
  sublabel: string;
  emoji: string;
  colorVar: string;     // CSS var name (without var())
  bgVar: string;
  gradient: string;
  description: string;
  topics: string[];
  locked?: boolean;
}

export const MODULE_LIST: ModuleMeta[] = [
  {
    id: "kana",
    label: "Kana",
    sublabel: "かな・カナ・漢",
    emoji: "あ",
    colorVar: "--hiragana",
    bgVar: "--hiragana-bg",
    gradient: "linear-gradient(135deg, hsl(200 85% 32%), hsl(200 70% 44%))",
    description: "Hiragana, Katakana e Kanji básico",
    topics: ["Hiragana", "Katakana", "Kanji"],
  },
  {
    id: "japones-pratica",
    label: "Japonês na Prática",
    sublabel: "実践日本語",
    emoji: "話",
    colorVar: "--katakana",
    bgVar: "--katakana-bg",
    gradient: "linear-gradient(135deg, hsl(280 62% 34%), hsl(280 52% 46%))",
    description: "Kana, frases úteis e partículas",
    topics: ["Kana", "Frases úteis", "Partícula を", "Partícula で"],
  },
  {
    id: "numeros-familia",
    label: "Números e Família",
    sublabel: "数字と家族",
    emoji: "家",
    colorVar: "--kanji",
    bgVar: "--kanji-bg",
    gradient: "linear-gradient(135deg, hsl(12 78% 36%), hsl(15 70% 46%))",
    description: "Números, família e autoapresentação",
    topics: ["Números", "Kanji", "Membros da família", "Autoapresentação", "Pronomes demonstrativos"],
    locked: true,
  },
  {
    id: "numeros-particulas",
    label: "Mais Números e Partículas",
    sublabel: "数と助詞",
    emoji: "数",
    colorVar: "--hiragana",
    bgVar: "--hiragana-bg",
    gradient: "linear-gradient(135deg, hsl(160 60% 38%), hsl(160 50% 54%))",
    description: "Contagem avançada, datas e partículas",
    topics: ["Kanji", "Contagem de 10.000", "Partícula と", "Sufixos numerais", "Partícula で", "Verbos compostos", "Ano, mês e dias da semana", "Partículas から e まで"],
    locked: true,
  },
  {
    id: "verbos-particulas",
    label: "Verbos e Partículas",
    sublabel: "動詞と助詞",
    emoji: "動",
    colorVar: "--katakana",
    bgVar: "--katakana-bg",
    gradient: "linear-gradient(135deg, hsl(340 70% 45%), hsl(340 60% 60%))",
    description: "Verbos, flexões e partículas avançadas",
    topics: ["Kanji", "Classificação dos verbos", "Horários", "Verbos estáticos", "Dias do mês", "Partículas に e へ", "Verbo ある", "Partícula が"],
    locked: true,
  },
];
