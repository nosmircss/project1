// WMO weather code reference: https://gist.github.com/stellasphere/9490c195ed2b53c707087c8c2db4ec0c
// Uses range-based mapping (not strict equality) to handle WMO code gaps safely.
// Per RESEARCH.md Pitfall 4: codes 4-44, 58-60, 68-70, 78-79, 83-84, 87-94 are gaps in WMO spec.
import {
  Sun,
  Moon,
  Cloud,
  CloudSun,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudDrizzle,
  CloudLightning,
  CloudFog
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { WeatherDisplay } from './types'

/**
 * Maps a WMO weather code and day/night flag to a Lucide icon and human-readable label.
 * Uses range comparisons to safely handle gap codes that may appear in future API versions.
 */
export function getWeatherDisplay(code: number, isDay: boolean): WeatherDisplay {
  // 0: Clear sky
  if (code === 0) return { Icon: isDay ? Sun : (Moon as LucideIcon), label: 'Clear' }

  // 1-2: Mainly clear / partly cloudy
  if (code <= 2)
    return { Icon: isDay ? CloudSun : (CloudMoon as LucideIcon), label: 'Partly Cloudy' }

  // 3: Overcast
  if (code === 3) return { Icon: Cloud as LucideIcon, label: 'Overcast' }

  // 4-48: Foggy (handles WMO gap codes 4-44 safely; 45 and 48 are actual fog codes)
  if (code <= 48) return { Icon: CloudFog as LucideIcon, label: 'Foggy' }

  // 51-57: Drizzle
  if (code <= 57) return { Icon: CloudDrizzle as LucideIcon, label: 'Drizzle' }

  // 58-67: Rain (handles gap codes 58-60; 61-67 are actual rain codes)
  if (code <= 67) return { Icon: CloudRain as LucideIcon, label: 'Rain' }

  // 68-77: Snow (handles gap codes 68-70; 71-77 are actual snow codes)
  if (code <= 77) return { Icon: CloudSnow as LucideIcon, label: 'Snow' }

  // 78-82: Showers (handles gap codes 78-79; 80-82 are actual shower codes)
  if (code <= 82) return { Icon: CloudRain as LucideIcon, label: 'Showers' }

  // 83-86: Snow showers (handles gap code 83-84; 85-86 are actual snow shower codes)
  if (code <= 86) return { Icon: CloudSnow as LucideIcon, label: 'Snow Showers' }

  // 87+: Thunderstorm (catches 95-99 and any unexpected high codes)
  // Per plan: "87+ catches 95-99 and any unexpected codes"
  return { Icon: CloudLightning as LucideIcon, label: 'Thunderstorm' }
}
