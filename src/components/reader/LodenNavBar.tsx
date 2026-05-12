"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", icon: "auto_stories", label: "Archiv", enabled: true },
  { href: "#", icon: "forest", label: "Wald", enabled: false },
  { href: "#", icon: "face_5", label: "Ratgeber", enabled: false },
  { href: "/suche", icon: "book_2", label: "Bibliothek", enabled: true },
] as const;

export function LodenNavBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-glass-nav backdrop-blur-md shadow-[var(--shadow-nav)] h-16 flex items-center justify-around px-2">
      {NAV_ITEMS.map((item) => {
        if (!item.enabled) {
          return (
            <div
              key={item.label}
              className="flex flex-col items-center gap-0.5 opacity-30 cursor-default border-t-2 border-transparent pt-1"
            >
              <span
                className="material-symbols-rounded text-xl text-ink"
                aria-hidden="true"
              >
                {item.icon}
              </span>
              <span className="font-label text-[10px] text-slate">{item.label}</span>
            </div>
          );
        }

        const isActive =
          item.href === "/"
            ? pathname === "/" || pathname.startsWith("/artikel")
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 min-w-[56px] pt-1 border-t-2 ${
              isActive ? "border-ink" : "border-transparent"
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
