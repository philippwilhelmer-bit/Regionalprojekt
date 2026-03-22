import Link from "next/link";

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-zinc-200 h-16 flex items-center justify-center">
      <Link
        href="/"
        className="flex flex-col items-center gap-0.5 text-zinc-600 hover:text-zinc-900 transition-colors"
      >
        <span className="text-xl leading-none" aria-hidden="true">
          ◎
        </span>
        <span className="text-xs font-medium">Nachrichten</span>
      </Link>
    </nav>
  );
}
