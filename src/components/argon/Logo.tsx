export function Logo({ size = 48, showText = true }: { size?: number; showText?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="rounded-full flex items-center justify-center flex-shrink-0"
        style={{ width: size, height: size, background: 'var(--primary)' }}
      >
        <span
          className="font-black leading-none"
          style={{ fontSize: size * 0.28, color: 'white' }}
        >
          AR<span style={{ color: 'var(--accent)' }}>Gon</span>
        </span>
      </div>
      {showText && (
        <div>
          <div className="font-bold text-base leading-tight" style={{ color: 'var(--primary)' }}>
            ARGon Broker
          </div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>
            de Seguros
          </div>
        </div>
      )}
    </div>
  )
}
