import type { SVGProps } from "react";

// Jeu d'icônes minimal (traits, 24px) — évite une dépendance externe.
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 20, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconArrowRight = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Base>
);
export const IconCheck = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 12l5 5L19 7" />
  </Base>
);
export const IconLock = (p: IconProps) => (
  <Base {...p}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Base>
);
export const IconUnlock = (p: IconProps) => (
  <Base {...p}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 7.5-2" />
  </Base>
);
export const IconClock = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Base>
);
export const IconLightbulb = (p: IconProps) => (
  <Base {...p}>
    <path d="M9 18h6M10 21h4M8 13a5 5 0 1 1 8 0c-.8.9-1.5 1.7-1.5 3h-5c0-1.3-.7-2.1-1.5-3z" />
  </Base>
);
export const IconTrophy = (p: IconProps) => (
  <Base {...p}>
    <path d="M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6" />
  </Base>
);
export const IconUsers = (p: IconProps) => (
  <Base {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-5-6.3" />
  </Base>
);
export const IconChart = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </Base>
);
export const IconSparkles = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16zM5 15l.6 1.4L7 17l-1.4.6L5 19l-.6-1.4L3 17l1.4-.6L5 15z" />
  </Base>
);
export const IconLayers = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5" />
  </Base>
);
export const IconShield = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
    <path d="M9 12l2 2 4-4" />
  </Base>
);
export const IconTarget = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" />
  </Base>
);
export const IconPlay = (p: IconProps) => (
  <Base {...p}>
    <path d="M7 5v14l11-7-11-7z" />
  </Base>
);
export const IconQr = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <path d="M14 14h3v3h-3zM20 14v2M17 20h4M14 20h1" />
  </Base>
);
export const IconFile = (p: IconProps) => (
  <Base {...p}>
    <path d="M7 3h7l5 5v13H7V3z" />
    <path d="M14 3v5h5M9 13h6M9 17h6" />
  </Base>
);
export const IconMenu = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Base>
);
export const IconClose = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Base>
);
export const IconGrid = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="3" width="8" height="8" rx="1.5" />
    <rect x="13" y="3" width="8" height="8" rx="1.5" />
    <rect x="3" y="13" width="8" height="8" rx="1.5" />
    <rect x="13" y="13" width="8" height="8" rx="1.5" />
  </Base>
);
export const IconBuilding = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M2 21h20M8 8h3M8 12h3M8 16h3" />
  </Base>
);
export const IconRefresh = (p: IconProps) => (
  <Base {...p}>
    <path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" />
  </Base>
);
