import { useState } from 'react'
import { useInterval } from '../hooks/useInterval'

interface RefreshIndicatorProps {
  lastUpdatedAt: Date | null
  nextRefreshAt: number | null  // Date.now() ms target
  isRefreshing: boolean
}

/**
 * Shows "Updated Xm ago" relative time and "Next: m:ss" live countdown.
 * Uses a 1-second internal tick for live countdown display.
 * Pulses with animate-pulse when isRefreshing is true.
 */

function formatRelative(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000)
  if (secs < 60) return 'Updated just now'
  const mins = Math.floor(secs / 60)
  return `Updated ${mins}m ago`
}

function formatCountdown(remainingMs: number): string {
  const secs = Math.max(0, Math.floor(remainingMs / 1000))
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function RefreshIndicator({ lastUpdatedAt, nextRefreshAt, isRefreshing }: RefreshIndicatorProps): React.JSX.Element {
  // 1-second tick to keep countdown and relative time live
  const [, tick] = useState(0)
  useInterval(() => tick(n => n + 1), 1000)

  return (
    <div className={`flex items-center gap-2 text-xs font-mono text-text-dim ${isRefreshing ? 'animate-pulse' : ''}`}>
      {lastUpdatedAt && <span>{formatRelative(lastUpdatedAt)}</span>}
      {lastUpdatedAt && nextRefreshAt && <span className="text-neon-cyan/30">|</span>}
      {nextRefreshAt && <span>Next: {formatCountdown(nextRefreshAt - Date.now())}</span>}
    </div>
  )
}
