import type { ElementType, ReactNode } from "react";

type Props = {
  children: ReactNode;
  tone?: "default" | "on-dark";
  as?: ElementType;
  className?: string;
};

export function Eyebrow({ children, tone = "default", as: As = "p", className = "" }: Props) {
  const toneClass = tone === "on-dark" ? "text-on-primary/80" : "text-ink-muted";
  return (
    <As className={`font-label text-label-md uppercase ${toneClass} ${className}`.trim()}>
      {children}
    </As>
  );
}
