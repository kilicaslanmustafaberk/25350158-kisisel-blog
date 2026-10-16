import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;
const commonProps = {
  "aria-hidden": true,
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  strokeWidth: 1.75,
  viewBox: "0 0 24 24",
};

export function ArrowUpRightIcon(props: IconProps) {
  return <svg {...commonProps} {...props}><path d="M7 17 17 7M8 7h9v9" /></svg>;
}

export function CodeIcon(props: IconProps) {
  return <svg {...commonProps} {...props}><path d="m8 9-3 3 3 3M16 9l3 3-3 3M14 5l-4 14" /></svg>;
}

export function DocumentIcon(props: IconProps) {
  return <svg {...commonProps} {...props}><path d="M7 3h7l4 4v14H7zM14 3v5h5M10 13h5M10 17h5" /></svg>;
}

export function SearchIcon(props: IconProps) {
  return <svg {...commonProps} {...props}><circle cx="11" cy="11" r="6" /><path d="m20 20-4.5-4.5" /></svg>;
}

export function TerminalIcon(props: IconProps) {
  return <svg {...commonProps} {...props}><path d="M4 5h16v14H4zM8 10l2 2-2 2M12 14h4" /></svg>;
}

export function MenuIcon(props: IconProps) {
  return <svg {...commonProps} {...props}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
}

export function CloseIcon(props: IconProps) {
  return <svg {...commonProps} {...props}><path d="M6 6l12 12M18 6 6 18" /></svg>;
}

export function LockIcon(props: IconProps) {
  return <svg {...commonProps} {...props}><path d="M6 11h12v9H6zM9 11V8a3 3 0 0 1 6 0v3" /></svg>;
}

export function ChevronIcon(props: IconProps) {
  return <svg {...commonProps} {...props}><path d="m9 6 6 6-6 6" /></svg>;
}
