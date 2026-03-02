import { useState, type FormEvent } from 'react'
import { resolveZip } from '../lib/zipLookup'
import type { LocationInfo } from '../lib/types'

interface SidebarProps {
  locations: LocationInfo[]
  activeIndex: number
  onSelect: (index: number) => void
  onAdd: (location: LocationInfo) => void
  onDelete: (zip: string) => void
}

/**
 * Location list sidebar with +Add inline zip input and hover delete button.
 * Per user decision: "+Add button opens an inline input field in the sidebar"
 * Per user decision: "Valid zip auto-navigates to the new location"
 * Per user decision: "Delete X appears on hover for ALL locations (including active)"
 * Per user decision: "No confirmation dialog — instant delete on click"
 */
export function Sidebar({
  locations,
  activeIndex,
  onSelect,
  onAdd,
  onDelete
}: SidebarProps): React.JSX.Element {
  const [showAddInput, setShowAddInput] = useState(false)
  const [addZip, setAddZip] = useState('')
  const [addError, setAddError] = useState<string | null>(null)

  const handleAddSubmit = (e: FormEvent) => {
    e.preventDefault()
    const location = resolveZip(addZip)
    if (!location) {
      setAddError('Invalid zip code')
      return
    }
    // Check for duplicate before calling onAdd
    if (locations.some((l) => l.zip === location.zip)) {
      setAddError('Already saved')
      return
    }
    setAddError(null)
    setAddZip('')
    setShowAddInput(false)
    onAdd(location)
  }

  const handleAddZipChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 5)
    setAddZip(digits)
    if (addError && digits.length === 0) {
      setAddError(null)
    }
  }

  const handleAddButtonClick = () => {
    setShowAddInput(true)
    setAddZip('')
    setAddError(null)
  }

  const handleCancelAdd = () => {
    setShowAddInput(false)
    setAddZip('')
    setAddError(null)
  }

  return (
    <aside className="flex flex-col w-52 bg-bg-sidebar border-r border-border-neon shrink-0">
      {/* Sidebar header */}
      <div className="px-4 py-5 border-b border-border-neon">
        <h1 className="font-mono text-sm font-bold tracking-widest text-neon-cyan neon-text-glow-cyan uppercase">
          WeatherDeck
        </h1>
      </div>

      {/* Location list */}
      <div className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-1">
          {locations.map((loc, idx) => (
            <div key={loc.zip} className="group relative">
              <button
                onClick={() => onSelect(idx)}
                className={[
                  'w-full text-left flex items-center gap-2 px-2 py-2 rounded transition-colors cursor-pointer pr-7',
                  idx === activeIndex
                    ? 'bg-neon-cyan/10 border-l-2 border-neon-cyan pl-[6px]'
                    : 'border-l-2 border-transparent hover:bg-neon-cyan/5'
                ].join(' ')}
              >
                {idx === activeIndex && (
                  <div className="w-1.5 h-1.5 rounded-full bg-neon-cyan neon-glow-cyan shrink-0" />
                )}
                <span
                  className={[
                    'font-mono text-xs truncate',
                    idx === activeIndex ? 'text-neon-cyan' : 'text-text-primary'
                  ].join(' ')}
                >
                  {loc.displayName}
                </span>
              </button>

              {/* Delete button — hover reveal, neon-red glow on hover */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(loc.zip)
                }}
                aria-label={`Delete ${loc.displayName}`}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded font-mono text-sm opacity-0 group-hover:opacity-100 transition-opacity text-text-dim hover:text-error hover:neon-glow-error cursor-pointer"
              >
                {'\u00d7'}
              </button>
            </div>
          ))}
        </div>

        {/* Inline add input */}
        {showAddInput && (
          <form onSubmit={handleAddSubmit} className="mt-2 px-1">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={5}
              placeholder="Zip code"
              value={addZip}
              onChange={(e) => handleAddZipChange(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') handleCancelAdd()
              }}
              className={[
                'w-full px-2 py-1.5 rounded text-xs font-mono text-neon-cyan bg-bg-card outline-none',
                'transition-all',
                addError
                  ? 'border border-error neon-glow-error'
                  : 'border border-border-neon focus:border-neon-cyan'
              ].join(' ')}
            />
            {addError && (
              <p className="font-mono text-xs text-error mt-1 px-1">{addError}</p>
            )}
            <div className="flex gap-1 mt-1">
              <button
                type="submit"
                className="flex-1 py-1 rounded border border-neon-cyan/50 text-neon-cyan font-mono text-xs hover:bg-neon-cyan/10 transition-colors cursor-pointer"
              >
                Add
              </button>
              <button
                type="button"
                onClick={handleCancelAdd}
                className="flex-1 py-1 rounded border border-border-neon text-text-dim font-mono text-xs hover:bg-bg-card transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Add location button */}
      {!showAddInput && (
        <div className="px-3 py-3 border-t border-border-neon">
          <button
            onClick={handleAddButtonClick}
            className="w-full py-2 rounded border border-border-neon text-text-secondary font-mono text-xs hover:border-neon-cyan/50 hover:text-neon-cyan transition-colors cursor-pointer"
          >
            + Add
          </button>
        </div>
      )}
    </aside>
  )
}
