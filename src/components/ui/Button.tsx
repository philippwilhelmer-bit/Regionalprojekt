import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "primary" | "tertiary";

type Props = {
  variant?: Variant;
  href?: string;
  type?: "button" | "submit" | "reset";
  children: ReactNode;
  className?: string;
};

const baseClass = "inline-flex items-center justify-center font-label text-label-md uppercase transition-colors";

const variantClass: Record<Variant, string> = {
  primary: "px-6 py-3 rounded text-on-primary bg-gradient-to-br from-ink to-ink-deep hover:from-accent hover:to-accent",
  tertiary: "text-ink underline decoration-2 underline-offset-4 hover:text-accent",
};

export function Button({
  variant = "primary",
  href,
  type = "button",
  children,
  className = "",
}: Props) {
  const cls = `${baseClass} ${variantClass[variant]} ${className}`.trim();
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={cls}>
      {children}
    </button>
  );
}
