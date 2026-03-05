/**
 * Neon-outlined pulsing skeleton placeholders for the weather loading state.
 * Per user decision: "neon-outlined placeholder shapes that pulse/glow while data is fetching,
 * showing where content will appear"
 */
export function WeatherSkeleton(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center gap-6 animate-pulse">
      {/* Circle placeholder for weather icon (64x64) */}
      <div className="w-16 h-16 rounded-full border border-neon-cyan/30 bg-neon-cyan/5" />

      {/* Large rectangle for temperature hero (w-48 h-20) */}
      <div className="w-48 h-20 rounded border border-neon-cyan/30 bg-neon-cyan/5" />

      {/* Smaller rectangle for feels-like text */}
      <div className="w-32 h-6 rounded border border-neon-cyan/30 bg-neon-cyan/5" />

      {/* Thin rectangle for condition label */}
      <div className="w-24 h-4 rounded border border-neon-cyan/20 bg-neon-cyan/5" />
    </div>
  )
}

/**
 * 6-card skeleton for condition cards loading state.
 * 2-column grid matching ConditionsGrid layout.
 */
export function ConditionCardSkeleton(): React.JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-3 w-full px-4 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-bg-card border border-neon-cyan/15 rounded-lg p-4 flex flex-col items-center gap-2"
        >
          <div className="w-6 h-6 rounded-full border border-neon-cyan/20 bg-neon-cyan/5" />
          <div className="w-16 h-3 rounded border border-neon-cyan/15 bg-neon-cyan/5" />
          <div className="w-20 h-4 rounded border border-neon-cyan/15 bg-neon-cyan/5" />
        </div>
      ))}
    </div>
  )
}

/**
 * 6-column skeleton for hourly forecast strip loading state.
 * Matches HourlyStrip layout: compact vertical columns in horizontal scroll.
 */
export function HourlyStripSkeleton(): React.JSX.Element {
  return (
    <div className="flex flex-nowrap gap-1.5 px-4 pb-3 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2 shrink-0 w-14 py-2">
          <div className="w-8 h-3 rounded border border-neon-cyan/20 bg-neon-cyan/5" />
          <div className="w-6 h-6 rounded-full border border-neon-cyan/20 bg-neon-cyan/5" />
          <div className="w-8 h-3 rounded border border-neon-cyan/20 bg-neon-cyan/5" />
          <div className="w-6 h-3 rounded border border-neon-cyan/15 bg-neon-cyan/5" />
        </div>
      ))}
    </div>
  )
}
