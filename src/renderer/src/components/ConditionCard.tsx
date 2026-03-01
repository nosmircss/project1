import { WeatherIcon } from './WeatherIcon'
import type { LucideIcon } from 'lucide-react'

interface ConditionCardProps {
  Icon: LucideIcon
  label: string      // "Wind", "Humidity", etc.
  value: string      // fully formatted: "12 mph NW", "65%", "2.3 Low", etc.
  iconColor?: string
  glowColor?: string
}

export function ConditionCard({
  Icon,
  label,
  value,
  iconColor = '#00f0ff',
  glowColor = '#00f0ff'
}: ConditionCardProps): React.JSX.Element {
  return (
    <div className="
      bg-bg-card border border-neon-cyan/15 rounded-lg p-4
      flex flex-col items-center gap-2 text-center
      hover:border-neon-cyan/40 hover:shadow-[0_0_12px_rgba(0,240,255,0.15)]
      transition-all duration-200
    ">
      <WeatherIcon Icon={Icon} size={24} color={iconColor} glowColor={glowColor} />
      <p className="text-text-secondary font-mono text-xs uppercase tracking-wide">{label}</p>
      <p className="text-text-primary font-mono text-sm font-medium">{value}</p>
    </div>
  )
}
