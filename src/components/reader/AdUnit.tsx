"use client";

import { useEffect } from "react";

type AdZone = "hero" | "between-articles" | "article-detail";

interface AdUnitProps {
  zone: AdZone;
}

const slotMap: Record<AdZone, string | undefined> = {
  hero: process.env.NEXT_PUBLIC_ADSENSE_HERO_SLOT,
  "between-articles": process.env.NEXT_PUBLIC_ADSENSE_INLINE_SLOT,
  "article-detail": process.env.NEXT_PUBLIC_ADSENSE_ARTICLE_SLOT,
};

export function AdUnit({ zone }: AdUnitProps) {
  const pubId = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID;
  const slot = slotMap[zone];

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

  // Dev placeholder when env vars are not configured
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
