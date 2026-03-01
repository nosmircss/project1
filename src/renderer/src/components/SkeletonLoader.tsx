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
