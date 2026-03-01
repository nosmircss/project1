import { AlertTriangle } from 'lucide-react'

interface ErrorCardProps {
  message: string
  onRetry: () => void
}

/**
 * Inline error display with retry button.
 * Per user decision: "neon-bordered card in the main content area with error message + retry button"
 */
export function ErrorCard({ message, onRetry }: ErrorCardProps): React.JSX.Element {
  return (
    <div className="border border-error/50 bg-error/5 rounded-lg p-6 neon-glow-error flex flex-col items-center gap-4 max-w-xs w-full">
      {/* Error icon with drop-shadow glow */}
      <AlertTriangle
        size={40}
        color="#ff4444"
        strokeWidth={1.5}
        style={{
          filter: 'drop-shadow(0 0 6px #ff4444) drop-shadow(0 0 16px #ff444480)'
        }}
      />

      {/* Error message */}
      <p className="text-error text-sm text-center leading-relaxed font-sans">{message}</p>

      {/* Retry button */}
      <button
        onClick={onRetry}
        className="border border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/10 px-4 py-2 rounded font-mono text-sm transition-colors cursor-pointer"
      >
        Retry
      </button>
    </div>
  )
}
