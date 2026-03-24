"use client";

import { useEffect } from "react";

type AdZone = "hero" | "between-articles" | "article-detail";

interface AdUnitClientProps {
  pubId: string | undefined;
  slot: string | undefined;
  zone: AdZone;
}

export function AdUnitClient({ pubId, slot, zone }: AdUnitClientProps) {
  useEffect(() => {
    if (!pubId || !slot) return;
    try {
      const w = window as typeof window & {
        adsbygoogle?: unknown[];
        __adsenseNpa?: boolean;
      };
      w.adsbygoogle = w.adsbygoogle ?? [];
      if (w.__adsenseNpa) {
        w.adsbygoogle.push({ google_npa: true });
      } else {
        w.adsbygoogle.push({});
      }
    } catch {
      // Ignore AdSense push errors
    }
  }, [pubId, slot]);

  // Dev placeholder when pub ID is not configured
  if (!pubId) {
    return (
      <div className="bg-zinc-100 rounded h-20 flex items-center justify-center text-xs text-zinc-400">
        Ad [{zone}]
      </div>
    );
  }

  return (
    <ins
      className="adsbygoogle"
      data-ad-client={pubId}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
