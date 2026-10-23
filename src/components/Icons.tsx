interface IconProps {
  size?: number;
}

const svgProps = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
});

export const MagnifierIcon = ({ size = 20 }: IconProps) => (
  <svg {...svgProps(size)}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m15.5 15.5 5 5" />
  </svg>
);

export const HelpIcon = ({ size = 24 }: IconProps) => (
  <svg {...svgProps(size)}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M9.3 9.2a2.8 2.8 0 0 1 5.4 1c0 1.9-2.7 2.4-2.7 4" />
    <path d="M12 17.6h.01" />
  </svg>
);

export const StatsIcon = ({ size = 24 }: IconProps) => (
  <svg {...svgProps(size)}>
    <path d="M5 20v-6M12 20V5M19 20v-9" />
  </svg>
);

export const CloseIcon = ({ size = 24 }: IconProps) => (
  <svg {...svgProps(size)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const BackspaceIcon = ({ size = 22 }: IconProps) => (
  <svg {...svgProps(size)}>
    <path d="M8.5 5H20a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 20 19H8.5L2.5 12z" />
    <path d="m11.5 9.5 5 5M16.5 9.5l-5 5" />
  </svg>
);

export const LockIcon = ({ size = 18 }: IconProps) => (
  <svg {...svgProps(size)}>
    <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
  </svg>
);
