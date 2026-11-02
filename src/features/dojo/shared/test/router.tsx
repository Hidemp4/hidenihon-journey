import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";

/** Mesmas flags do BrowserRouter do App, para o teste rodar o roteamento como em produção. */
export function TestRouter({ path, children }: { path: string; children: ReactNode }) {
  return (
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {children}
      <LocationProbe />
    </MemoryRouter>
  );
}

/** Mostra a rota atual para os testes conferirem navegação. `<span>`, não `<output>` (que tem papel de status). */
function LocationProbe() {
  return <span data-testid="location">{useLocation().pathname}</span>;
}
