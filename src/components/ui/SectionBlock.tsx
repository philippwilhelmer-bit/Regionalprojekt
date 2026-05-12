import type { ReactNode } from "react";

type Bg =
  | "surface"
  | "surface-elevated"
  | "surface-overlay"
  | "surface-deep"
  | "parchment"
  | "parchment-dim"
  | "parchment-bright"
  | "aged-wood";

type VoidSize = "md" | "lg" | "none";

type Props = {
  bg?: Bg;
  voidSize?: VoidSize;
  gutter?: boolean;
  className?: string;
  children: ReactNode;
};

const bgClass: Record<Bg, string> = {
  surface: "bg-surface",
  "surface-elevated": "bg-surface-elevated",
  "surface-overlay": "bg-surface-overlay",
  "surface-deep": "bg-surface-deep",
  parchment: "bg-parchment",
  "parchment-dim": "bg-parchment-dim",
  "parchment-bright": "bg-parchment-bright",
  "aged-wood": "bg-aged-wood",
};

const voidPaddingClass: Record<VoidSize, string> = {
  md: "py-[var(--spacing-void-md)]",
  lg: "py-[var(--spacing-void-lg)]",
  none: "",
};

export function SectionBlock({
  bg,
  voidSize = "md",
  gutter = true,
  className = "",
  children,
}: Props) {
  const parts = [
    bg ? bgClass[bg] : "",
    voidPaddingClass[voidSize],
    gutter ? "px-[var(--spacing-gutter)]" : "",
    className,
  ].filter(Boolean);
  return <section className={parts.join(" ")}>{children}</section>;
}
