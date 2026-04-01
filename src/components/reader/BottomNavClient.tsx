"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", icon: "newspaper", label: "Nachrichten", enabled: true },
  { href: "/suche", icon: "search", label: "Suche", enabled: true },
  { href: "#", icon: "bookmark", label: "Gemerkt", enabled: false },
  { href: "#", icon: "person", label: "Profil", enabled: false },
] as const;

export function BottomNavClient() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-parchment shadow-[var(--shadow-nav)] h-16 flex items-center justify-around px-2">
      {NAV_ITEMS.map((item) => {
        if (!item.enabled) {
          return (
            <div
              key={item.label}
              className="flex flex-col items-center gap-0.5 opacity-40 cursor-default"
            >
              <span
                className="material-symbols-rounded text-xl text-slate"
                aria-hidden="true"
              >
                {item.icon}
              </span>
              <span className="font-label text-xs text-slate">{item.label}</span>
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
            <span
              className={`flex items-center justify-center w-16 h-8 rounded-xs ${isActive ? "bg-ink" : ""}`}
            >
              <span
                className={`material-symbols-rounded text-xl ${isActive ? "text-parchment" : "text-slate"}`}
                aria-hidden="true"
              >
                {item.icon}
              </span>
            </span>
            <span
              className={`font-label text-xs ${isActive ? "text-ink font-medium" : "text-slate"}`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
