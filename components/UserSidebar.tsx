'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  User,
  Users,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react'
import { getInitials } from '@/lib/display'

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  match: (path: string) => boolean
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/profile',
    label: 'Mon Profil',
    icon: User,
    match: (p) => p === '/profile',
  },
  {
    href: '/members',
    label: 'Annuaire',
    icon: Users,
    match: (p) => p === '/members' || p.startsWith('/m/'),
  },
  {
    href: '/onboarding',
    label: 'Onboarding',
    icon: ArrowLeft,
    match: (p) => p === '/onboarding',
  },
  {
    href: '/admin',
    label: 'Admin',
    icon: LayoutDashboard,
    match: (p) => p.startsWith('/admin'),
    adminOnly: true,
  },
]

export default function UserSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<{ email: string; isAdmin: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    let mounted = true
    fetch('/api/auth/session', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((session) => {
        if (!mounted) return
        if (session?.authenticated) {
          setUser({ email: session.email, isAdmin: !!session.isAdmin })
        }
        setLoading(false)
      })
      .catch(() => mounted && setLoading(false))
    return () => {
      mounted = false
    }
  }, [])

  // Close drawer on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    await fetch('/api/auth/session', { method: 'DELETE', credentials: 'include' })
    router.push('/auth/verify')
  }

  const handleNavigate = (href: string) => {
    router.push(href)
    setMobileOpen(false)
  }

  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || user?.isAdmin)
  const displayName = user?.email ? user.email.split('@')[0] : 'Membre'
  const initials = user?.email ? user.email[0].toUpperCase() : getInitials(null, null)

  return (
    <>
      {/* ── Mobile top bar ── */}
      <header className="user-mobile-bar">
        <button
          className="user-mobile-toggle"
          onClick={() => setMobileOpen(true)}
          aria-label="Ouvrir le menu"
        >
          <Menu size={22} />
        </button>
        <div className="user-mobile-brand">
          <span className="brand-mark">H</span>
          <span>HASHCODE</span>
        </div>
        <div className="user-mobile-avatar" aria-hidden>
          {initials}
        </div>
      </header>

      {/* ── Backdrop on mobile ── */}
      <div
        className={`user-sidebar-backdrop ${mobileOpen ? 'visible' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden
      />

      {/* ── Sidebar ── */}
      <aside className={`user-sidebar ${mobileOpen ? 'open' : ''}`} aria-label="Navigation principale">
        <div className="user-sidebar-header">
          <button
            className="user-sidebar-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Fermer le menu"
          >
            <X size={20} />
          </button>
          <a href="/profile" className="user-sidebar-brand" onClick={(e) => { e.preventDefault(); handleNavigate('/profile') }}>
            <span className="brand-mark">H</span>
            <span className="user-sidebar-brand-text">HASHCODE</span>
          </a>
          <p className="user-sidebar-eyebrow">Espace membre</p>
        </div>

        <nav className="user-sidebar-nav">
          {visibleItems.map((item) => {
            const Icon = item.icon
            const isActive = item.match(pathname || '')
            return (
              <button
                key={item.href}
                className={`user-sidebar-item ${isActive ? 'active' : ''}`}
                onClick={() => handleNavigate(item.href)}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={18} strokeWidth={1.75} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="user-sidebar-footer">
          {loading ? (
            <div className="user-sidebar-user">
              <div className="skeleton" style={{ width: 36, height: 36, borderRadius: '50%' }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton skeleton-text" style={{ width: 100 }} />
                <div className="skeleton skeleton-text" style={{ width: 140, marginTop: 6 }} />
              </div>
            </div>
          ) : (
            <div className="user-sidebar-user">
              <div className="user-sidebar-avatar" aria-hidden>
                {initials}
              </div>
              <div className="user-sidebar-user-meta">
                <span className="user-sidebar-user-name">{displayName}</span>
                <span className="user-sidebar-user-email">{user?.email || 'Non connecté'}</span>
              </div>
            </div>
          )}
          <button className="user-sidebar-logout" onClick={handleLogout}>
            <LogOut size={16} strokeWidth={1.75} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      <BottomNav pathname={pathname || ''} isAdmin={!!user?.isAdmin} />
    </>
  )
}

function BottomNav({ pathname, isAdmin }: { pathname: string; isAdmin: boolean }) {
  const items = [
    { href: '/profile', label: 'Profil', icon: User },
    { href: '/members', label: 'Membres', icon: Users },
    { href: '/onboarding', label: 'Onboarding', icon: Sparkles },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin', icon: Shield }] : []),
  ]

  return (
    <nav
      className="bottom-tab-nav"
      aria-label="Navigation principale"
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        display: 'none',
        background: 'var(--card)',
        borderTop: '1px solid var(--border)',
        zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <style>{`
        @media (max-width: 768px) {
          .bottom-tab-nav { display: flex !important; }
          .user-mobile-bar { display: none !important; }
        }
      `}</style>
      {items.map(item => {
        const Icon = item.icon
        const active = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <a
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            style={{
              flex: 1,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: '2px',
              padding: '8px 4px',
              minHeight: '52px',
              color: active ? 'var(--primary)' : 'var(--muted-foreground)',
              textDecoration: 'none',
              fontSize: '11px', fontWeight: active ? '700' : '500',
              transition: 'color .15s',
            }}
          >
            <Icon size={20} />
            <span>{item.label}</span>
          </a>
        )
      })}
    </nav>
  )
}