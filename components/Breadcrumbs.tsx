'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

const LABELS: Record<string, string> = {
  profile: 'Profil',
  members: 'Membres',
  admin: 'Administration',
  onboarding: 'Onboarding',
  m: 'Membre',
  auth: 'Connexion',
  verify: 'Vérification',
  'verify-otp': 'Code de vérification',
  magic: 'Lien magique',
}

export function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return null

  return (
    <nav
      aria-label="Fil d'Ariane"
      style={{
        display: 'flex', alignItems: 'center', gap: '4px',
        fontSize: '12px', color: 'var(--muted-foreground)',
        padding: '8px 0', marginBottom: '16px',
      }}
    >
      <Link href="/" style={{ display: 'flex', alignItems: 'center', color: 'inherit' }}>
        <Home size={14} />
      </Link>
      {segments.map((seg, i) => {
        const path = '/' + segments.slice(0, i + 1).join('/')
        const label = LABELS[seg] || seg
        const isLast = i === segments.length - 1
        return (
          <span key={path} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ChevronRight size={12} />
            {isLast ? (
              <span style={{ color: 'var(--foreground)', fontWeight: 600 }}>{label}</span>
            ) : (
              <Link href={path} style={{ color: 'inherit' }}>{label}</Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
