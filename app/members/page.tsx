'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getInitials, levelLabel, poleLabel } from '@/lib/display'
import { Search, MapPin } from 'lucide-react'
import UserSidebar from '@/components/UserSidebar'
import { Breadcrumbs } from '@/components/Breadcrumbs'

type MemberRow = {
  id: string
  firstName: string | null
  lastName: string | null
  country: string | null
  city: string | null
  status: string
  poles: { slug: string; level: string; isPrimary: boolean }[]
}

export default function MembersDirectory() {
  const router = useRouter()
  const [data, setData] = useState<{ members: MemberRow[]; pagination: { page: number; pages: number; total: number } } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState<string>('')
  const [searchInput, setSearchInput] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [poleFilter, setPoleFilter] = useState<string>('')
  const [levelFilter, setLevelFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const limit = 20

  // Debounce the free-text search before it hits the API.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    setPage(1)
  }, [statusFilter, poleFilter, levelFilter])

  useEffect(() => {
    fetchMembers()
  }, [page, search, statusFilter, poleFilter, levelFilter])

  const fetchMembers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      if (poleFilter) params.set('pole', poleFilter)
      if (levelFilter) params.set('level', levelFilter)

      const res = await fetch(`/api/members?${params}`)
      if (!res.ok) throw new Error('Erreur de chargement')
      setData(await res.json())
      setError(null)
    } catch {
      setError('Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const filteredMembers = data?.members || []

  return (
    <div className="page-with-sidebar">
      <UserSidebar />
      <main className="user-main">
        <div className="onboarding-wrap">
          <Breadcrumbs />
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <p className="eyebrow">Annuaire des membres</p>
            <h1>{data ? data.pagination.total : '…'} Membres actifs</h1>

            {error && <div className="error-banner">{error}</div>}

            {/* Search & Filters */}
            <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div className="search-box" style={{ flex: 1, minWidth: '200px' }}>
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Rechercher un nom, une ville, un pays..."
                />
              </div>
              <select
                style={{ padding: '12px 16px', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '14px', background: 'var(--card)', color: 'var(--foreground)' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Tous les statuts</option>
                <option value="active">Actifs</option>
                <option value="verified">Vérifiés</option>
                <option value="updated">Mis à jour</option>
              </select>
              <select
                style={{ padding: '12px 16px', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '14px', background: 'var(--card)', color: 'var(--foreground)' }}
                value={poleFilter}
                onChange={(e) => setPoleFilter(e.target.value)}
              >
                <option value="">Tous les pôles</option>
                <option value="security">Security</option>
                <option value="ai">AI</option>
                <option value="cloud">Cloud</option>
              </select>
              <select
                style={{ padding: '12px 16px', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '14px', background: 'var(--card)', color: 'var(--foreground)' }}
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
              >
                <option value="">Tous les niveaux</option>
                <option value="beginner">Débutant</option>
                <option value="intermediate">Intermédiaire</option>
                <option value="advanced">Avancé</option>
                <option value="expert">Expert</option>
              </select>
            </div>

            {/* Loading */}
            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[1,2,3,4,5].map(i => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '16px', background: 'var(--card)',
                    border: '1px solid var(--border)', borderRadius: '8px'
                  }}>
                    <div className="skeleton skeleton-avatar" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div className="skeleton skeleton-text" style={{ width: '60%' }} />
                      <div className="skeleton skeleton-text" style={{ width: '40%', height: '10px' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Members Table */}
            {!loading && (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Membre</th>
                      <th>Localisation</th>
                      <th>Pôles</th>
                      <th>Niveau</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((m) => {
                      const primaryPole = m.poles.find(p => p.isPrimary)?.slug || m.poles[0]?.slug || ''
                      return (
                        <tr
                          key={m.id}
                          style={{ cursor: 'pointer' }}
                          onClick={() => router.push(`/m/${m.id}`)}
                        >
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span className="avatar" style={{
                                background: primaryPole === 'security' ? '#dc2626' : primaryPole === 'ai' ? '#2563eb' : primaryPole === 'cloud' ? '#059669' : 'var(--primary)',
                                width: '40px',
                                height: '40px',
                                fontSize: '14px',
                              }}>{getInitials(m.firstName, m.lastName)}</span>
                              <div>
                                <b style={{ fontSize: '14px' }}>
                                  {m.firstName || m.lastName
                                    ? [m.firstName, m.lastName].filter(Boolean).join(' ')
                                    : 'Membre HASHCODE'}
                                </b>
                                {m.city && (
                                  <small style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                    <MapPin size={10} /> {[m.city, m.country].filter(Boolean).join(', ')}
                                  </small>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            {[m.city, m.country].filter(Boolean).join(', ') || '—'}
                          </td>
                          <td>
                            {m.poles.length > 0
                              ? m.poles.map((p, i) => (
                                  <span key={i} className="pole-tag" style={{
                                    background: p.slug === 'security' ? '#fef2f2' : p.slug === 'ai' ? '#eff6ff' : '#f0fdf4',
                                    color: p.slug === 'security' ? '#dc2626' : p.slug === 'ai' ? '#2563eb' : '#059669',
                                  }}>{poleLabel(p.slug)}</span>
                                ))
                              : '—'}
                          </td>
                          <td>{m.poles[0] ? levelLabel(m.poles[0].level) : '—'}</td>
                          <td>
                            <span className={`status ${m.status === 'active' ? 'active' : 'pending'}`}>
                              {m.status}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                    {filteredMembers.length === 0 && (
                      <tr>
                        <td colSpan={5}>
                          <div style={{
                            textAlign: 'center', padding: '48px 24px',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', gap: '12px'
                          }}>
                            <Search size={32} style={{ color: 'var(--muted-foreground)' }} />
                            <div>
                              <p style={{ fontWeight: 600, marginBottom: '4px' }}>Aucun membre trouvé</p>
                              <p style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>
                                {(search || statusFilter || poleFilter || levelFilter)
                                  ? 'Essaie d\'autres filtres ou réinitialise la recherche'
                                  : 'Aucun membre dans la communauté pour le moment'}
                              </p>
                            </div>
                            {(search || statusFilter || poleFilter || levelFilter) && (
                              <button className="secondary-button" onClick={() => {
                                setSearchInput(''); setSearch(''); setStatusFilter('');
                                setPoleFilter(''); setLevelFilter(''); setPage(1);
                              }}>
                                Réinitialiser les filtres
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {data && data.pagination.pages > 1 && (
              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <span style={{ color: 'var(--muted-foreground)', fontSize: '14px' }}>
                  Affichage de {(data.pagination.page - 1) * limit + 1} à {Math.min(data.pagination.page * limit, data.pagination.total)} sur {data.pagination.total} membres
                </span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    className="text-button"
                    disabled={data.pagination.page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    Précédent
                  </button>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>
                    {data.pagination.page} / {data.pagination.pages}
                  </span>
                  <button
                    className="text-button"
                    disabled={data.pagination.page === data.pagination.pages}
                    onClick={() => setPage(p => Math.min(data.pagination.pages, p + 1))}
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}

            {data && data.pagination.pages <= 1 && data.pagination.total > 0 && (
              <div style={{ marginTop: '24px', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '14px' }}>
                {data.pagination.total} membre{data.pagination.total > 1 ? 's' : ''} au total
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}