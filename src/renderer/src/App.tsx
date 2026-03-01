function App(): React.JSX.Element {
  return (
    <div className="flex h-screen bg-bg-dark cyber-grid overflow-hidden">
      {/* Sidebar */}
      <aside className="flex flex-col w-52 bg-bg-sidebar border-r border-border-neon shrink-0">
        {/* Sidebar header */}
        <div className="px-4 py-5 border-b border-border-neon">
          <h1 className="font-mono text-sm font-bold tracking-widest text-neon-cyan neon-text-glow-cyan uppercase">
            WeatherDeck
          </h1>
          <p className="font-mono text-xs text-text-dim mt-0.5 tracking-wider">
            v1.0.0
          </p>
        </div>

        {/* Location list placeholder */}
        <div className="flex-1 px-3 py-4">
          <p className="font-mono text-xs text-text-dim uppercase tracking-widest mb-3 px-1">
            Locations
          </p>
          {/* Placeholder location items */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-2 py-2 rounded border border-border-neon bg-bg-card">
              <div className="w-1.5 h-1.5 rounded-full bg-neon-cyan neon-glow-cyan shrink-0" />
              <span className="font-mono text-xs text-text-primary truncate">
                Add a location...
              </span>
            </div>
          </div>
        </div>

        {/* Sidebar footer */}
        <div className="px-4 py-3 border-t border-border-neon">
          <p className="font-mono text-xs text-text-dim text-center">
            &mdash; WEATHERDECK &mdash;
          </p>
        </div>
      </aside>

      {/* Main panel */}
      <main className="flex-1 flex flex-col items-center justify-center bg-bg-dark overflow-hidden">
        <div className="flex flex-col items-center gap-4 text-center px-8">
          {/* Icon placeholder with neon glow */}
          <div className="w-20 h-20 rounded-full border-2 border-border-neon-bright bg-bg-card flex items-center justify-center neon-glow-cyan">
            <span className="font-mono text-3xl text-neon-cyan">&#9788;</span>
          </div>

          {/* Title */}
          <h2 className="font-mono text-lg font-bold text-neon-cyan neon-text-glow-cyan tracking-wide uppercase">
            Welcome to WeatherDeck
          </h2>

          {/* Placeholder text */}
          <p className="text-text-secondary text-sm max-w-xs leading-relaxed">
            Weather data will appear here.
          </p>
          <p className="font-mono text-xs text-text-dim">
            Add a location in the sidebar to get started.
          </p>

          {/* Decorative neon line */}
          <div className="w-32 h-px bg-gradient-to-r from-transparent via-neon-cyan to-transparent opacity-40 mt-2" />
        </div>
      </main>
    </div>
  )
}

export default App
