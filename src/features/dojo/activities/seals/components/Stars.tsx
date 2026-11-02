import { Star } from "lucide-react";
import { MAX_STARS } from "../constants";

/** Estrelas como uma imagem só para o leitor de tela ("2 de 3 estrelas"), não três ícones soltos. */
export function Stars({ count, size = 18 }: { count: number; size?: number }) {
  return (
    <span role="img" aria-label={`${count} de ${MAX_STARS} estrelas`} className="inline-flex items-center gap-0.5 align-middle">
      {Array.from({ length: MAX_STARS }, (_, index) => (
        <Star
          key={index}
          size={size}
          aria-hidden="true"
          strokeWidth={2.4}
          className={index < count ? "text-journey-orange" : "text-journey-wood/45"}
          fill={index < count ? "currentColor" : "none"}
        />
      ))}
    </span>
  );
}
