import { describe, expect, it } from "vitest";
import { kanjiVgFileName, parseKanjiVgSvg } from "./kanjivg";

/** SVG sintético no formato do KanjiVG (traços fora de ordem no arquivo, de propósito). */
const SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="109" height="109" viewBox="0 0 109 109">
<g id="kvg:StrokePaths_0304b" style="fill:none;stroke:#000000;stroke-width:3;">
<g id="kvg:0304b" kvg:element="か">
	<path id="kvg:0304b-s2" kvg:type="㇒" d="M50,20c-1,10-5,40-12,60"/>
	<path id="kvg:0304b-s1" kvg:type="㇆" d="M20.04,40C40,38,60,35,70,40c5,3,0,30-8,38"/>
	<path id="kvg:0304b-s3" d="M80,30l10,15"/>
</g>
</g>
<g id="kvg:StrokeNumbers_0304b" style="font-size:8;fill:#808080">
	<text transform="matrix(1 0 0 1 14.5 41)">1</text>
	<text transform="matrix(1 0 0 1 43.25 18)">2</text>
</g>
</svg>`;

describe("leitura do KanjiVG", () => {
  it("nome do arquivo é o código Unicode com 5 dígitos hex", () => {
    expect(kanjiVgFileName("あ")).toBe("03042.svg");
    expect(kanjiVgFileName("ア")).toBe("030a2.svg");
    expect(kanjiVgFileName("日")).toBe("065e5.svg");
  });

  it("ordena pelos ids -sN, normaliza os caminhos e lê os números", () => {
    const glyph = parseKanjiVgSvg(SVG);
    expect(glyph?.strokes).toEqual(["M20,40C40,38,60,35,70,40C75,43,70,70,62,78", "M50,20C49,30,45,60,38,80", "M80,30L90,45"]);
    // O 3º não tem número no arquivo: fica perto do começo do traço.
    expect(glyph?.numbers).toEqual([
      [14.5, 41],
      [43.3, 18],
      [76, 28],
    ]);
  });

  it("variantes (ex.: -Kaisho) usam o mesmo padrão de id", () => {
    expect(parseKanjiVgSvg('<path id="kvg:03042-Kaisho-s1" d="M1,1L5,5"/>')?.strokes).toEqual(["M1,1L5,5"]);
  });

  it("buraco na numeração, caminho inválido ou nenhum traço: null (o script não grava nada)", () => {
    expect(parseKanjiVgSvg(SVG.replace("kvg:0304b-s2", "kvg:0304b-s4"))).toBeNull();
    expect(parseKanjiVgSvg(SVG.replace('d="M80,30l10,15"', 'd="M80,30a5,5,0,0,1,10,10"'))).toBeNull();
    expect(parseKanjiVgSvg("<svg></svg>")).toBeNull();
  });
});
