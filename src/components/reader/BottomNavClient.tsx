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
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-background shadow-[0_-2px_8px_rgba(0,0,0,0.06)] h-16 flex items-center justify-around px-2">
      {NAV_ITEMS.map((item) => {
        if (!item.enabled) {
          return (
            <div
              key={item.label}
              className="flex flex-col items-center gap-0.5 opacity-40 cursor-default"
            >
              <span
                className="material-symbols-outlined text-xl text-secondary"
                aria-hidden="true"
              >
                {item.icon}
              </span>
              <span className="font-label text-xs text-secondary">{item.label}</span>
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
              className={`flex items-center justify-center w-16 h-8 rounded-full ${isActive ? "bg-primary" : ""}`}
            >
              <span
                className={`material-symbols-outlined text-xl ${isActive ? "text-white" : "text-secondary"}`}
                aria-hidden="true"
              >
                {item.icon}
              </span>
            </span>
            <span
              className={`font-label text-xs ${isActive ? "text-primary font-medium" : "text-secondary"}`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
