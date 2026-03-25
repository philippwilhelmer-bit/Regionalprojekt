"use client";

import { useEffect, useState } from "react";

const SESSION_KEY = "eilmeldung_dismissed";

export function EilmeldungBanner() {
  // Start as false to avoid hydration mismatch — server renders nothing,
  // client corrects in useEffect once sessionStorage is readable.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem(SESSION_KEY)) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="sticky top-[60px] z-30 bg-alpine-red flex items-center justify-between px-4 py-2">
      <span className="font-label font-bold text-white uppercase tracking-widest text-sm">
        EILMELDUNG
      </span>
      <button onClick={dismiss} aria-label="Schließen" className="text-white">
        <span className="material-symbols-outlined text-[18px]">close</span>
      </button>
    </div>
  );
}
