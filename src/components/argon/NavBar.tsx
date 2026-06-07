'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from './Logo'

interface NavItem {
  href: string
  label: string
  icon: string
  danger?: boolean
}

interface NavBarProps {
  items: NavItem[]
  userName: string
  role: string
  onSignOut: () => void
}

export function TopBar({ userName, role, onSignOut }: { userName: string; role: string; onSignOut: () => void }) {
  const roleLabel: Record<string, string> = {
    admin: 'Administrador',
    coordinador: 'Coordinador',
    agente: 'Agente',
    asegurado: 'Asegurado',
  }

  return (
    <header className="sticky top-0 z-40 border-b px-4 py-3 flex items-center justify-between"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <Logo size={36} showText={true} />
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{userName}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>{roleLabel[role] || role}</div>
        </div>
        <button
          onClick={onSignOut}
          className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--danger)', background: 'rgba(214,58,47,0.08)' }}
        >
          Salir
        </button>
      </div>
    </header>
  )
}

export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname()

  return (
    <nav className="bottom-nav">
      {items.map(item => {
        const active = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-1 px-4 py-1 transition-all"
            style={{ color: item.danger ? 'var(--danger)' : active ? 'var(--primary)' : 'var(--muted)' }}
          >
            <span className="text-xl leading-none">{item.icon}</span>
            <span className="text-[10px] font-medium">{item.label}</span>
            {active && (
              <div className="w-1 h-1 rounded-full" style={{ background: 'var(--primary)' }} />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
