/**
 * Navegação por setas no padrão de grade do ARIA (sem dar a volta nas bordas): setas andam uma
 * casa, Home/End vão ao começo/fim da linha e, com Ctrl, à primeira/última carta da mesa.
 * Devolve `null` para teclas que não são de navegação (o evento segue normal).
 */
export function moveGridIndex(index: number, key: string, columns: number, total: number, ctrlKey = false): number | null {
  if (total <= 0 || columns <= 0) return null;
  const row = Math.floor(index / columns);
  const rowStart = row * columns;
  const rowEnd = Math.min(rowStart + columns, total) - 1;

  switch (key) {
    case "ArrowRight":
      return Math.min(index + 1, rowEnd);
    case "ArrowLeft":
      return Math.max(index - 1, rowStart);
    case "ArrowDown":
      return index + columns < total ? index + columns : index;
    case "ArrowUp":
      return index - columns >= 0 ? index - columns : index;
    case "Home":
      return ctrlKey ? 0 : rowStart;
    case "End":
      return ctrlKey ? total - 1 : rowEnd;
    default:
      return null;
  }
}
