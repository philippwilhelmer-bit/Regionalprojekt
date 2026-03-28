"use client";

import { useEffect, useState } from "react";

type ConsentValue = "accepted" | "rejected";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem("cookie_consent");
      if (!consent) {
        setVisible(true);
      }
    } catch {
      // Ignore localStorage errors (e.g. private browsing restrictions)
    }
  }, []);

  function handleAccept() {
    saveConsent("accepted");
  }

  function handleReject() {
    saveConsent("rejected");
    try {
      (window as typeof window & { __adsenseNpa?: boolean }).__adsenseNpa =
        true;
    } catch {
      // Ignore
    }
  }

  function saveConsent(value: ConsentValue) {
    try {
      localStorage.setItem("cookie_consent", value);
    } catch {
      // Ignore
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-16 inset-x-0 z-50 bg-surface-elevated shadow-lg px-4 py-3 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      <p className="flex-1 text-sm text-zinc-700">
        Wir verwenden Cookies für personalisierte Werbung.{" "}
        <a
          href="/impressum#datenschutz"
          className="underline underline-offset-2 hover:text-zinc-900 transition-colors"
        >
          Datenschutz
        </a>
      </p>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={handleAccept}
          className="px-4 py-1.5 rounded-full bg-gradient-to-br from-primary to-primary-container text-white text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
        >
          Akzeptieren
        </button>
        <button
          onClick={handleReject}
          className="px-4 py-1.5 rounded-sm bg-surface text-zinc-700 text-sm font-medium shadow-sm hover:bg-surface-elevated transition-colors"
        >
          Nur notwendige Cookies
        </button>
      </div>
    </div>
  );
}
