import { fireEvent, screen } from "@testing-library/react";

/** Os grupos de kana (e os temas de kanji) ficam nas configurações avançadas, fechadas por padrão. */
export function openAdvancedSettings() {
  fireEvent.click(screen.getByRole("button", { name: /Abrir configurações avançadas/ }));
}
