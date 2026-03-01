import type { LucideIcon } from 'lucide-react'

interface WeatherIconProps {
  Icon: LucideIcon
  size?: number
  color?: string
  glowColor?: string
}

/**
 * Renders a Lucide icon with a neon drop-shadow glow effect.
 * Uses filter: drop-shadow() (NOT box-shadow) so the glow follows icon paths, not the bounding box.
 * Per RESEARCH.md Pitfall 3: box-shadow glows the bounding rectangle, not the icon paths.
 */
export function WeatherIcon({
  Icon,
  size = 64,
  color = '#00f0ff',
  glowColor = '#00f0ff'
}: WeatherIconProps): React.JSX.Element {
  return (
    <Icon
      size={size}
      color={color}
      strokeWidth={1.5}
      style={{
        filter: `drop-shadow(0 0 6px ${glowColor}) drop-shadow(0 0 16px ${glowColor}80)`
      }}
    />
  )
}
