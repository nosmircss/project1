interface TemperatureHeroProps {
  temperature: number
  feelsLike: number
  units: string
}

/**
 * Giant glowing temperature display — the hero element of the weather UI.
 * Temperature is rendered as the largest, most visually dominant element.
 * Per user decision: "the temperature number should clearly dominate — most prominent visual element in the entire app"
 */
export function TemperatureHero({
  temperature,
  feelsLike,
  units
}: TemperatureHeroProps): React.JSX.Element {
  const displayTemp = Math.round(temperature)
  const displayFeelsLike = Math.round(feelsLike)

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Hero temperature — the dominant visual element */}
      <div className="flex items-start leading-none">
        <span className="font-mono text-8xl font-bold text-neon-cyan neon-text-glow-cyan tabular-nums">
          {displayTemp}
        </span>
        <span className="font-mono text-3xl font-bold text-neon-cyan neon-text-glow-cyan mt-3 ml-1">
          {units}
        </span>
      </div>

      {/* Feels-like temperature — secondary, smaller */}
      <p className="font-mono text-sm text-text-secondary">
        Feels like {displayFeelsLike}{units}
      </p>
    </div>
  )
}
