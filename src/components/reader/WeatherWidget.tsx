"use client";

import { useEffect, useState } from "react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import type { BezirkItem } from "@/types/bundesland";

function openBezirkModal() {
  window.dispatchEvent(new Event("openBezirkModal"));
}

const WMO_LABELS: Record<number, string> = {
  0: "Klarer Himmel",
  1: "Überwiegend klar",
  2: "Teilweise bewölkt",
  3: "Bedeckt",
  45: "Nebel",
  48: "Reifnebel",
  51: "Leichter Nieselregen",
  53: "Nieselregen",
  55: "Starker Nieselregen",
  61: "Leichter Regen",
  63: "Regen",
  65: "Starker Regen",
  71: "Leichter Schneefall",
  73: "Schneefall",
  75: "Starker Schneefall",
  80: "Regenschauer",
  81: "Starke Regenschauer",
  82: "Heftige Regenschauer",
  95: "Gewitter",
  96: "Gewitter mit Hagel",
  99: "Gewitter mit starkem Hagel",
};

interface WeatherData {
  temperature_2m: number;
  weather_code: number;
}

interface WeatherWidgetProps {
  bezirke: BezirkItem[];
}

export function WeatherWidget({ bezirke }: WeatherWidgetProps) {
  const [mounted, setMounted] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [bezirkName, setBezirkName] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const raw = localStorage.getItem("bezirk_selection");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) return;
      const slug = parsed[0] as string;
      fetch(`/api/reader/weather?bezirk=${encodeURIComponent(slug)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setWeather(data as WeatherData);
        })
        .catch(() => {
          // Silently fail — weather is non-critical
        });
      const match = bezirke.find((b) => b.slug === slug);
      setBezirkName(match?.name ?? slug);
    } catch {
      // Invalid JSON
    }
  }, [bezirke]);

  if (!mounted) return null;

  // No bezirk selected → CTA fallback, keep slot prominently filled
  if (!weather) {
    return (
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1">
          <Eyebrow className="mb-1">Wetter</Eyebrow>
          <p className="font-headline tracking-tight text-headline-md text-ink leading-snug">
            Lokales Wetter für deinen Bezirk
          </p>
          <button
            type="button"
            onClick={openBezirkModal}
            className="mt-2 inline-flex items-center font-label text-label-md uppercase text-ink underline decoration-2 underline-offset-4 transition-colors hover:text-accent"
          >
            Bezirk wählen
          </button>
        </div>
      </div>
    );
  }

  const label = WMO_LABELS[weather.weather_code] ?? "Unbekannt";

  return (
    <div className="flex items-start justify-between gap-6">
      <div className="flex-1">
        <Eyebrow className="mb-1">Wetter heute</Eyebrow>
        <p className="font-headline tracking-tight text-headline-md text-ink leading-snug">
          {label}
          {bezirkName ? ` in ${bezirkName}` : ""}
        </p>
      </div>
      <span className="font-headline tracking-tight text-display-sm text-ink shrink-0">
        {Math.round(weather.temperature_2m)}°C
      </span>
    </div>
  );
}
