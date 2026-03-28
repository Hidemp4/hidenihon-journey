import { palette } from "./styles";

export function HeaderPattern() {
  return (
    <svg
      aria-hidden
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.045, pointerEvents: "none" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="wave" x="0" y="0" width="28" height="22" patternUnits="userSpaceOnUse">
          <path
            d="M14 1 C6 1 1 6 1 11 C1 16 6 21 14 21 C22 21 27 16 27 11 C27 6 22 1 14 1Z"
            fill="none"
            stroke={palette.beni}
            strokeWidth="0.7"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#wave)" />
    </svg>
  );
}
