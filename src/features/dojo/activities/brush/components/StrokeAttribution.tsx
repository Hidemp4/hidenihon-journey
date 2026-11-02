/** Exigência da licença CC BY-SA 3.0 do KanjiVG: atribuição visível onde os traços aparecem. */
export function StrokeAttribution({ className = "" }: { className?: string }) {
  const link = "font-black text-journey-ink underline decoration-journey-orange/60 underline-offset-2 hover:text-journey-orange";
  return (
    <p className={`text-[11px] font-semibold leading-5 text-journey-ink/80 ${className}`}>
      Traços dos kana e kanji:{" "}
      <a href="https://kanjivg.tagaini.net" target="_blank" rel="noreferrer" className={link}>
        KanjiVG
      </a>
      , © Ulrich Apel, sob a licença{" "}
      <a href="https://creativecommons.org/licenses/by-sa/3.0/deed.pt_BR" target="_blank" rel="noreferrer" className={link}>
        CC BY-SA 3.0
      </a>
      .
    </p>
  );
}
