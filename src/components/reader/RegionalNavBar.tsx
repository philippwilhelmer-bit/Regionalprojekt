"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", icon: "newspaper", label: "Nachrichten", enabled: true },
  { href: "/suche", icon: "search", label: "Suche", enabled: true },
  { href: "#", icon: "bookmark", label: "Gemerkt", enabled: false },
  { href: "#", icon: "person", label: "Profil", enabled: false },
] as const;

export function RegionalNavBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-background shadow-[0_-2px_8px_rgba(0,0,0,0.06)] h-16 flex items-center justify-around px-2">
      {NAV_ITEMS.map((item) => {
        if (!item.enabled) {
          return (
            <div
              key={item.label}
              className="flex flex-col items-center gap-0.5 opacity-30 cursor-default"
            >
              <span
                className="material-symbols-outlined text-xl text-secondary"
                aria-hidden="true"
              >
                {item.icon}
              </span>
              <span className="font-label text-[10px] text-secondary">{item.label}</span>
            </div>
          );
        }

        const isActive =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.label}
            href={item.href}
            className="flex flex-col items-center gap-0.5 min-w-[56px]"
          >
            {/* Active pill indicator */}
            <span
              className={`flex items-center justify-center w-16 h-8 rounded-full transition-colors ${
                isActive ? "bg-primary" : ""
              }`}
            >
              <span
                className={`material-symbols-outlined text-xl transition-colors ${
                  isActive ? "text-background" : "text-primary"
                }`}
                aria-hidden="true"
              >
                {item.icon}
              </span>
            </span>
            <span
              className={`font-label text-[10px] transition-colors ${
                isActive ? "text-primary font-semibold" : "text-secondary"
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
