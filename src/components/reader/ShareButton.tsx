"use client";

import { useState } from "react";

interface ShareButtonProps {
  title: string;
  url: string;
}

export function ShareButton({ title, url }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }
    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available — silent fail
    }
  }

  return (
    <button
      onClick={handleShare}
      className="group inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 font-label text-label-md uppercase transition-colors hover:bg-accent"
    >
      {copied ? "Link kopiert!" : "Artikel teilen"}
      <span className="material-symbols-rounded text-sm transition-transform group-hover:translate-x-1" aria-hidden="true">arrow_right_alt</span>
    </button>
  );
}
