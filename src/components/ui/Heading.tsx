import type { ElementType, ReactNode } from "react";

type Variant = "display-lg" | "display-sm" | "headline-md";

type Props = {
  variant: Variant;
  as?: ElementType;
  tone?: "default" | "on-dark";
  children: ReactNode;
  className?: string;
};

const variantClass: Record<Variant, string> = {
  "display-lg": "text-display-lg",
  "display-sm": "text-display-sm",
  "headline-md": "text-headline-md",
};

export function Heading({
  variant,
  as: As = "h2",
  tone = "default",
  children,
  className = "",
}: Props) {
  const toneClass = tone === "on-dark" ? "text-on-primary" : "text-ink";
  return (
    <As className={`font-headline tracking-tight ${variantClass[variant]} ${toneClass} ${className}`.trim()}>
      {children}
    </As>
  );
}
