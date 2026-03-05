import { useEffect, useRef } from 'react'
import { Droplets } from 'lucide-react'
import type { HourlySlice } from '../lib/types'
import { getWeatherDisplay } from '../lib/weatherCodeMap'
import { WeatherIcon } from './WeatherIcon'

interface HourlyStripProps {
  hours: HourlySlice[]    // 12 entries from useWeather
  locationZip: string     // triggers scroll reset on change
  temperatureUnit: string // "°F" or "°C" for display
}

/**
 * Extracts the hour as a number from an ISO 8601 local time string.
 * Manual extraction avoids Date parsing ambiguity when there is no timezone suffix.
 * "2026-03-04T15:00" -> 15
 */
function getHour(isoTime: string): number {
  return parseInt(isoTime.slice(11, 13), 10)
}

function formatHour(isoTime: string, isNow: boolean): string {
  if (isNow) return 'Now'
  const h = getHour(isoTime)
  if (h === 0) return '12 AM'
  if (h === 12) return '12 PM'
  return h > 12 ? `${h - 12} PM` : `${h} AM`
}

/**
 * Horizontally scrollable 12-hour forecast strip with compact vertical columns.
 * iOS Weather style per locked decision. First column labeled "Now" with cyan distinction.
 * Scroll resets to left on locationZip change.
 */
export function HourlyStrip({ hours, locationZip, temperatureUnit: _temperatureUnit }: HourlyStripProps): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Reset scroll position to "Now" on every location switch
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = 0
  }, [locationZip])

  return (
    <div>
      {/* Section title */}
      <div className="px-4 pt-4 pb-1">
        <span className="text-text-secondary font-sans text-xs tracking-wide uppercase">
          Hourly Forecast
        </span>
      </div>

      {/* Scrollable strip */}
      <div
        ref={scrollRef}
        className="flex flex-nowrap gap-1.5 overflow-x-auto px-4 pb-3"
        style={{ scrollbarWidth: 'none' }}
      >
        {hours.map((hour, i) => {
          const isNow = i === 0
          const { Icon } = getWeatherDisplay(hour.weatherCode, true)

          return (
            <div
              key={hour.time}
              className={`
                shrink-0 w-14 flex flex-col items-center gap-1.5 py-2 rounded-lg
                ${isNow
                  ? 'border border-neon-cyan/40 bg-neon-cyan/5'
                  : 'border border-transparent'
                }
              `}
            >
              {/* Hour label */}
              <span
                className={`font-sans text-xs ${isNow ? 'text-neon-cyan neon-text-glow-cyan' : 'text-text-secondary'}`}
              >
                {formatHour(hour.time, isNow)}
              </span>

              {/* Weather icon at 24px (smaller than hero 64px) */}
              <WeatherIcon Icon={Icon} size={24} />

              {/* Temperature */}
              <span className="font-mono text-sm text-text-primary">
                {Math.round(hour.temperature)}°
              </span>

              {/* Precipitation probability */}
              <span className="flex items-center gap-0.5 font-mono text-xs text-text-dim">
                <Droplets size={10} />
                {hour.precipProbability}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
