/// <reference types="node" />
/**
 * Gera os traços do Pincel a partir do KanjiVG
 * (https://kanjivg.tagaini.net, © Ulrich Apel, CC BY-SA 3.0). O JSON gerado é obra derivada
 * e continua sob CC BY-SA 3.0: a atribuição fica no próprio arquivo e na tela do Pincel.
 *
 * Uso:
 *   npm run build:strokes                                  # kana e kanji, baixados do GitHub na tag fixa abaixo
 *   npm run build:strokes -- --only kanji                  # só um dos conjuntos (kana | kanji)
 *   npm run build:strokes -- --source caminho/kanjivg/kanji  # sem rede: pasta kanji/ de um clone ou do zip da release
 *
 * Saída: `src/features/dojo/activities/brush/data/{kana,kanji}Strokes.json` (um chunk cada,
 * para quem treina kana não baixar os kanji).
 *
 * Nunca grava dado parcial: se um kana faltar ou vier quebrado, o script para com erro.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { hiraganaGroups } from "@/data/hiragana";
import { kanjiN5Groups } from "@/data/kanjiN5";
import { katakanaGroups } from "@/data/katakana";
import { KANJIVG_VIEWBOX, kanjiVgFileName, parseKanjiVgSvg, type KanjiVgGlyph } from "@/features/dojo/activities/brush/kanjivg";

/** Tag fixa: o mesmo comando gera sempre o mesmo arquivo. Para atualizar, troque aqui e rode de novo. */
const DEFAULT_REF = "r20260714";
const OUT_DIR = "src/features/dojo/activities/brush/data";
const CONCURRENCY = 8;

type SetName = "kana" | "kanji";

/** O app é a fonte da lista e do número de traços esperado (o KanjiVG confere). */
const SETS: Readonly<Record<SetName, ReadonlyArray<{ char: string; strokeCount: number }>>> = {
  kana: [...hiraganaGroups, ...katakanaGroups].flatMap((group) => group.chars),
  kanji: kanjiN5Groups.flatMap((group) => group.chars),
};

interface Options {
  ref: string;
  source: string | null;
  only: SetName | null;
}

function parseArgs(argv: readonly string[]): Options {
  const options: Options = { ref: DEFAULT_REF, source: null, only: null };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index + 1];
    if (argv[index] === "--ref" && value) options.ref = value;
    else if (argv[index] === "--source" && value) options.source = value;
    else if (argv[index] === "--only" && (value === "kana" || value === "kanji")) options.only = value;
    else continue;
    index += 1;
  }
  return options;
}

async function readSvg(char: string, options: Options): Promise<string> {
  const file = kanjiVgFileName(char);
  if (options.source) return readFile(path.join(options.source, file), "utf8");

  const url = `https://raw.githubusercontent.com/KanjiVG/kanjivg/${options.ref}/kanji/${file}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} em ${url}`);
  return response.text();
}

/** Gera um conjunto. `false` se algum caractere faltou ou veio quebrado (nada é gravado). */
async function buildSet(name: SetName, options: Options): Promise<boolean> {
  const entries = SETS[name];
  const out = path.join(OUT_DIR, `${name}Strokes.json`);
  const glyphs = new Map<string, KanjiVgGlyph>();
  const errors: string[] = [];
  const warnings: string[] = [];

  for (let start = 0; start < entries.length; start += CONCURRENCY) {
    await Promise.all(
      entries.slice(start, start + CONCURRENCY).map(async ({ char, strokeCount }) => {
        try {
          const glyph = parseKanjiVgSvg(await readSvg(char, options));
          if (!glyph) {
            errors.push(`${char} (${kanjiVgFileName(char)}): SVG sem traços válidos`);
            return;
          }
          glyphs.set(char, glyph);
          if (glyph.strokes.length !== strokeCount) {
            warnings.push(`${char}: KanjiVG tem ${glyph.strokes.length} traços; src/data diz ${strokeCount}`);
          }
        } catch (error) {
          errors.push(`${char} (${kanjiVgFileName(char)}): ${error instanceof Error ? error.message : String(error)}`);
        }
      })
    );
  }

  if (errors.length > 0) {
    console.error(`${name}: nada foi gravado. ${errors.length} caractere(s) com problema:\n  ${errors.join("\n  ")}`);
    return false;
  }

  // Na ordem dos dados do app (e não na ordem em que os downloads terminaram): o arquivo sai igual toda vez.
  const chars = Object.fromEntries(
    entries.map(({ char }) => {
      const glyph = glyphs.get(char);
      return [char, { s: glyph?.strokes ?? [], n: glyph?.numbers ?? [] }];
    })
  );

  const output = {
    version: 1,
    source: "KanjiVG",
    url: "https://kanjivg.tagaini.net",
    copyright: "Ulrich Apel",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    ref: options.ref,
    viewBox: KANJIVG_VIEWBOX,
    chars,
  };

  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, `${JSON.stringify(output)}\n`, "utf8");

  const strokes = [...glyphs.values()].reduce((sum, glyph) => sum + glyph.strokes.length, 0);
  console.log(`${name}: ${glyphs.size} caracteres, ${strokes} traços → ${out} (KanjiVG ${options.source ? `local: ${options.source}` : options.ref})`);
  if (warnings.length > 0) console.warn(`${name}: contagem de traços diferente dos dados do app (o KanjiVG vale):\n  ${warnings.join("\n  ")}`);
  return true;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const names: SetName[] = options.only ? [options.only] : ["kana", "kanji"];
  let ok = true;
  for (const name of names) ok = (await buildSet(name, options)) && ok;
  if (!ok) process.exitCode = 1;
}

await main();
