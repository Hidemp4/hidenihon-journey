/**
 * Kanji do JLPT N5: a lista clássica do antigo JLPT nível 4 (103 kanji), como marcada no KANJIDIC2.
 *
 * - Leituras: só as usuais para quem está no N5 (não todas). Cada uma foi conferida contra o
 *   KANJIDIC2 (EDRDG, https://www.edrdg.org/kanjidic/kanjidic2.html) e o número de traços contra
 *   o KANJIDIC2 e o KanjiVG (o `npm run build:strokes` avisa se divergir).
 * - Hífen marca forma presa, como no KANJIDIC2: "ひと-" é prefixo (一人 ひとり), "-か" é sufixo (二日 ふつか).
 * - Significados em pt-BR escritos à mão a partir do uso comum; o que pede conferência leva `// REVISAR`.
 * - O 1º significado é curto e único na lista: é ele que aparece no quiz e nos Selos.
 */

export interface KanjiEntry {
  char: string;
  /** On'yomi, em katakana. */
  onyomi: string[];
  /** Kun'yomi, em hiragana; o ponto separa o okurigana (た.べる = 食べる), como no KANJIDIC2. */
  kunyomi: string[];
  /** Do mais comum para o menos comum. */
  meanings: string[];
  strokeCount: number;
}

export interface KanjiGroup {
  id: string;
  title: string;
  chars: KanjiEntry[];
}

const k = (char: string, onyomi: string[], kunyomi: string[], meanings: string[], strokeCount: number): KanjiEntry => ({
  char,
  onyomi,
  kunyomi,
  meanings,
  strokeCount,
});

export const kanjiN5Groups: KanjiGroup[] = [
  {
    id: "numbers",
    title: "Números e dinheiro",
    chars: [
      k("一", ["イチ", "イツ"], ["ひと-", "ひと.つ"], ["um"], 1),
      k("二", ["ニ"], ["ふた", "ふた.つ"], ["dois"], 2),
      k("三", ["サン"], ["み", "みっ.つ"], ["três"], 3),
      k("四", ["シ"], ["よ", "よん", "よっ.つ"], ["quatro"], 5),
      k("五", ["ゴ"], ["いつ", "いつ.つ"], ["cinco"], 4),
      k("六", ["ロク"], ["む", "むっ.つ"], ["seis"], 4),
      k("七", ["シチ"], ["なな", "なな.つ"], ["sete"], 2),
      k("八", ["ハチ"], ["や", "やっ.つ"], ["oito"], 2),
      k("九", ["キュウ", "ク"], ["ここの", "ここの.つ"], ["nove"], 2),
      k("十", ["ジュウ"], ["とお", "と"], ["dez"], 2),
      k("百", ["ヒャク"], [], ["cem"], 6),
      k("千", ["セン"], ["ち"], ["mil"], 3),
      k("万", ["マン", "バン"], [], ["dez mil"], 3),
      k("円", ["エン"], ["まる.い"], ["iene", "círculo"], 4),
      k("半", ["ハン"], ["なか.ば"], ["metade"], 5),
    ],
  },
  {
    id: "days",
    title: "Dias e elementos",
    chars: [
      k("日", ["ニチ", "ジツ"], ["ひ", "-か"], ["dia", "sol"], 4),
      k("月", ["ゲツ", "ガツ"], ["つき"], ["lua", "mês"], 4),
      k("火", ["カ"], ["ひ"], ["fogo"], 4),
      k("水", ["スイ"], ["みず"], ["água"], 4),
      k("木", ["モク", "ボク"], ["き"], ["árvore", "madeira"], 4),
      k("金", ["キン", "コン"], ["かね"], ["ouro", "dinheiro"], 8),
      k("土", ["ド", "ト"], ["つち"], ["terra", "solo"], 3),
    ],
  },
  {
    id: "time",
    title: "Tempo",
    chars: [
      k("年", ["ネン"], ["とし"], ["ano"], 6),
      k("時", ["ジ"], ["とき"], ["hora", "tempo"], 10),
      k("分", ["ブン", "フン", "ブ"], ["わ.ける", "わ.かる"], ["minuto", "parte", "entender"], 4),
      k("午", ["ゴ"], [], ["meio-dia"], 4),
      k("前", ["ゼン"], ["まえ"], ["antes", "frente"], 9),
      k("後", ["ゴ", "コウ"], ["うし.ろ", "あと", "のち"], ["depois", "atrás"], 9),
      k("今", ["コン", "キン"], ["いま"], ["agora"], 4),
      k("毎", ["マイ"], [], ["cada", "todo"], 6),
      k("週", ["シュウ"], [], ["semana"], 11),
      k("間", ["カン", "ケン"], ["あいだ", "ま"], ["intervalo", "entre"], 12),
      k("先", ["セン"], ["さき"], ["anterior", "à frente", "ponta"], 6),
    ],
  },
  {
    id: "people",
    title: "Pessoas",
    chars: [
      k("人", ["ジン", "ニン"], ["ひと"], ["pessoa"], 2),
      k("子", ["シ", "ス"], ["こ"], ["criança", "filho"], 3),
      k("女", ["ジョ", "ニョ"], ["おんな", "め"], ["mulher"], 3),
      k("男", ["ダン", "ナン"], ["おとこ"], ["homem"], 7),
      k("父", ["フ"], ["ちち"], ["pai"], 4),
      k("母", ["ボ"], ["はは"], ["mãe"], 5),
      k("友", ["ユウ"], ["とも"], ["amigo"], 4),
      k("名", ["メイ", "ミョウ"], ["な"], ["nome"], 6),
      k("生", ["セイ", "ショウ"], ["い.きる", "う.まれる", "なま"], ["vida", "nascer", "cru"], 5),
    ],
  },
  {
    id: "body",
    title: "Corpo",
    chars: [
      k("口", ["コウ", "ク"], ["くち"], ["boca"], 3),
      k("目", ["モク"], ["め"], ["olho"], 5),
      k("耳", ["ジ"], ["みみ"], ["orelha"], 6),
      k("手", ["シュ"], ["て"], ["mão"], 4),
      k("足", ["ソク"], ["あし", "た.りる"], ["pé", "perna", "bastar"], 7),
    ],
  },
  {
    id: "nature",
    title: "Natureza",
    chars: [
      k("山", ["サン"], ["やま"], ["montanha"], 3),
      k("川", ["セン"], ["かわ"], ["rio"], 3),
      k("天", ["テン"], ["あま-"], ["céus", "paraíso"], 4), // REVISAR: "céus" para separar de 空 ("céu"); 天気 = tempo (clima)
      k("気", ["キ", "ケ"], [], ["espírito", "ar", "ânimo"], 6),
      k("雨", ["ウ"], ["あめ"], ["chuva"], 8),
      k("空", ["クウ"], ["そら", "から", "あ.く"], ["céu", "vazio"], 8),
      k("花", ["カ"], ["はな"], ["flor"], 7),
      k("魚", ["ギョ"], ["さかな", "うお"], ["peixe"], 11),
    ],
  },
  {
    id: "places",
    title: "Lugares e direções",
    chars: [
      k("上", ["ジョウ"], ["うえ", "あ.がる", "のぼ.る"], ["em cima", "subir"], 3),
      k("下", ["カ", "ゲ"], ["した", "さ.がる", "くだ.さる", "お.りる"], ["embaixo", "descer"], 3),
      k("中", ["チュウ"], ["なか"], ["dentro", "meio"], 4),
      k("外", ["ガイ", "ゲ"], ["そと", "ほか"], ["fora"], 5),
      k("右", ["ウ", "ユウ"], ["みぎ"], ["direita"], 5),
      k("左", ["サ"], ["ひだり"], ["esquerda"], 5),
      k("東", ["トウ"], ["ひがし"], ["leste"], 8),
      k("西", ["セイ", "サイ"], ["にし"], ["oeste"], 6),
      k("南", ["ナン"], ["みなみ"], ["sul"], 9),
      k("北", ["ホク"], ["きた"], ["norte"], 5),
      k("国", ["コク"], ["くに"], ["país"], 8),
      k("駅", ["エキ"], [], ["estação"], 14),
      k("道", ["ドウ"], ["みち"], ["caminho", "rua"], 12),
      k("店", ["テン"], ["みせ"], ["loja"], 8),
      k("社", ["シャ"], ["やしろ"], ["empresa", "santuário"], 7),
      k("校", ["コウ"], [], ["escola"], 10),
    ],
  },
  {
    id: "actions",
    title: "Ações",
    chars: [
      k("見", ["ケン"], ["み.る"], ["ver"], 7),
      k("聞", ["ブン", "モン"], ["き.く"], ["ouvir", "perguntar"], 14),
      k("読", ["ドク", "トク"], ["よ.む"], ["ler"], 14),
      k("書", ["ショ"], ["か.く"], ["escrever"], 10),
      k("話", ["ワ"], ["はな.す", "はなし"], ["falar", "conversa"], 13),
      k("言", ["ゲン", "ゴン"], ["い.う", "こと"], ["dizer", "palavra"], 7),
      k("食", ["ショク"], ["た.べる", "く.う"], ["comer", "comida"], 9),
      k("飲", ["イン"], ["の.む"], ["beber"], 12),
      k("行", ["コウ", "ギョウ"], ["い.く", "ゆ.く", "おこな.う"], ["ir", "realizar"], 6),
      k("来", ["ライ"], ["く.る"], ["vir"], 7),
      k("出", ["シュツ"], ["で.る", "だ.す"], ["sair", "tirar"], 5),
      k("入", ["ニュウ"], ["い.る", "はい.る"], ["entrar", "pôr"], 2),
      k("休", ["キュウ"], ["やす.む"], ["descansar", "folga"], 6),
      k("買", ["バイ"], ["か.う"], ["comprar"], 12),
      k("立", ["リツ"], ["た.つ"], ["ficar de pé", "erguer"], 5),
      k("会", ["カイ"], ["あ.う"], ["encontrar", "reunião"], 6),
    ],
  },
  {
    id: "qualities",
    title: "Qualidades",
    chars: [
      k("大", ["ダイ", "タイ"], ["おお.きい"], ["grande"], 3),
      k("小", ["ショウ"], ["ちい.さい", "こ-"], ["pequeno"], 3),
      k("長", ["チョウ"], ["なが.い"], ["longo", "chefe"], 8),
      k("高", ["コウ"], ["たか.い"], ["alto", "caro"], 10),
      k("安", ["アン"], ["やす.い"], ["barato", "tranquilo"], 6),
      k("新", ["シン"], ["あたら.しい"], ["novo"], 13),
      k("古", ["コ"], ["ふる.い"], ["velho", "antigo"], 5),
      k("白", ["ハク"], ["しろ", "しろ.い"], ["branco"], 5),
      k("多", ["タ"], ["おお.い"], ["muitos"], 6),
      k("少", ["ショウ"], ["すく.ない", "すこ.し"], ["pouco"], 4),
    ],
  },
  {
    id: "things",
    title: "Coisas e estudo",
    chars: [
      k("本", ["ホン"], ["もと"], ["livro", "origem"], 5),
      k("車", ["シャ"], ["くるま"], ["carro"], 7),
      k("電", ["デン"], [], ["eletricidade"], 13),
      k("学", ["ガク"], ["まな.ぶ"], ["estudo", "aprender"], 8),
      k("語", ["ゴ"], ["かた.る"], ["idioma", "palavra"], 14),
      k("何", ["カ"], ["なに", "なん"], ["o quê"], 7),
    ],
  },
];
