import { Minus, Square, X } from 'lucide-react'

export function TitleBar(): React.JSX.Element {
  return (
    <header className="window-drag flex h-[30px] shrink-0 items-center justify-between border-b border-border-neon bg-[#070711]">
      <div className="pl-3 font-mono text-[11px] font-bold uppercase tracking-widest text-text-secondary">
        WeatherDeck
      </div>
      <div className="window-no-drag flex h-full">
        <button
          type="button"
          aria-label="Minimize window"
          onClick={() => window.electronAPI.minimizeWindow()}
          className="flex h-full w-11 items-center justify-center text-text-secondary transition-colors hover:bg-neon-cyan/10 hover:text-neon-cyan"
        >
          <Minus size={14} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          aria-label="Maximize window"
          onClick={() => window.electronAPI.toggleMaximizeWindow()}
          className="flex h-full w-11 items-center justify-center text-text-secondary transition-colors hover:bg-neon-cyan/10 hover:text-neon-cyan"
        >
          <Square size={12} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          aria-label="Close window"
          onClick={() => window.electronAPI.closeWindow()}
          className="flex h-full w-11 items-center justify-center text-text-secondary transition-colors hover:bg-error/20 hover:text-error"
        >
          <X size={15} strokeWidth={1.8} />
        </button>
      </div>
    </header>
  )
}
