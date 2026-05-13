"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", icon: "auto_stories", label: "Archiv" },
  { href: "/suche", icon: "book_2", label: "Bibliothek" },
] as const;

export function LodenNavBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-glass-nav backdrop-blur-md shadow-[var(--shadow-nav)] h-16 flex items-center justify-center gap-16 px-2">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/" || pathname.startsWith("/artikel")
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 min-w-[56px] pt-1 border-t-2 ${
              isActive ? "border-accent" : "border-transparent"
            }`}
          >
            <span
              className={`material-symbols-rounded text-xl ${isActive ? "icon-filled text-ink" : "text-ink"}`}
              aria-hidden="true"
            >
              {item.icon}
            </span>
            <span
              className={`font-label text-[10px] ${
                isActive ? "text-ink font-semibold" : "text-slate"
              }`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
