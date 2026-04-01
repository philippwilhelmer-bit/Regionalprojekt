import { unstable_cache } from 'next/cache'
import { NextRequest } from 'next/server'
import { BEZIRK_COORDS } from '@/../bundesland.config'

interface OpenMeteoResponse {
  current: { temperature_2m: number; weather_code: number }
}

const fetchWeatherForBezirk = (slug: string, lat: number, lon: number) =>
  unstable_cache(
    async () => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=Europe%2FVienna`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Open-Meteo fetch failed')
      const data = (await res.json()) as OpenMeteoResponse
      return data.current
    },
    ['weather', slug],
    { revalidate: 1800 }
  )()

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('bezirk')
  if (!slug) return Response.json({ error: 'missing bezirk param' }, { status: 400 })
  const coords = BEZIRK_COORDS[slug]
  if (!coords) return Response.json({ error: 'unknown bezirk' }, { status: 404 })
  try {
    const current = await fetchWeatherForBezirk(slug, coords.lat, coords.lon)
    return Response.json(current)
  } catch {
    return Response.json({ error: 'weather fetch failed' }, { status: 502 })
  }
}
