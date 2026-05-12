import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  tone?: "default" | "on-dark";
  className?: string;
};

export function Eyebrow({ children, tone = "default", className = "" }: Props) {
  const toneClass = tone === "on-dark" ? "text-on-primary/80" : "text-ink-muted";
  return (
    <p className={`font-label text-label-md uppercase ${toneClass} ${className}`.trim()}>
      {children}
    </p>
  );
}
