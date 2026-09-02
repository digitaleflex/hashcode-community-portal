'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export default function MembersDirectory() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [poleFilter, setPoleFilter] = useState<string>('')
  const [levelFilter, setLevelFilter] = useState<string>('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [page, setPage] = useState(1)
  const limit = 20

  useEffect(() => {
    checkAdminAndFetch()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, poleFilter, levelFilter])

  useEffect(() => {
    fetchMembers()
  }, [page, search, statusFilter, poleFilter, levelFilter])

  const checkAdminAndFetch = async () => {
    try {
      const meRes = await fetch('/api/members/me')
      if (meRes.ok) {
        const meData = await meRes.json()
        setIsAdmin(meData.isAdmin || false)
      }
    } catch {}
  }

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

      const res = await fetch(`/api/admin/members?${params}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Erreur de chargement')
      const result = await res.json()
      setData(result)
    } catch (err) {
      setError('Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const filteredMembers = data?.members || []

  return (
    <main className="min-h-screen bg-background">
      <header className="site-header">
        <div className="brand">
          <span className="brand-mark">H</span>
          <span>HASHCODE</span>
        </div>
        <div className="header-actions">
          {isAdmin && (
            <button className="text-button" onClick={() => router.push('/admin')}>Admin</button>
          )}
          <button className="text-button" onClick={() => router.push('/profile')}>Profil</button>
        </div>
      </header>

      <div className="onboarding-wrap">
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <p className="eyebrow">Annuaire des membres</p>
          <h1>Nos {data?.stats?.total || '…'} Membres HASHCODE</h1>

          {error && <div className="error-banner">{error}</div>}

          <div className="metric-grid" style={{ marginBottom: '32px' }}>
            <div>
              <span>Total membres</span>
              <b>{data?.stats?.total || 0}</b>
            </div>
            <div>
              <span>Actifs</span>
              <b>{data?.stats?.active || 0}</b>
            </div>
            <div>
              <span>Pôles couverts</span>
              <b>{data?.stats?.polesCovered || 0}</b>
            </div>
          </div>

          {/* Search & Filters */}
          <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher email, nom, pays..."
              style={{ flex: 1, minWidth: '200px', padding: '12px 16px', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '14px' }}
            />
            <select
              style={{ padding: '12px 16px', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '14px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="pending">En attente</option>
              <option value="imported">Importés</option>
              <option value="verified">Vérifiés</option>
            </select>
            <select
              style={{ padding: '12px 16px', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '14px' }}
              value={poleFilter}
              onChange={(e) => setPoleFilter(e.target.value)}
            >
              <option value="">Tous les pôles</option>
              <option value="security">Security</option>
              <option value="ai">AI</option>
              <option value="cloud">Cloud</option>
            </select>
            <select
              style={{ padding: '12px 16px', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '14px' }}
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
            >
              <option value="">Tous les niveaux</option>
              <option value="beginner">Débutant</option>
              <option value="intermediate">Intermédiaire</option>
              <option value="advanced">Avancé</option>
            </select>
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted-foreground)' }}>
              Chargement...
            </div>
          )}

          {/* Members Table */}
          {!loading && (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Avatar</th>
                    <th>Membre</th>
                    <th>Pays</th>
                    <th>Pôles</th>
                    <th>Niveau</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((m: any) => (
                    <tr
                      key={m.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => router.push(`/m/${m.id}`)}
                    >
                      <td>
                        <span className="avatar">
                          {(m.firstName?.[0] || m.email[0]).toUpperCase()}{(m.lastName?.[0] || '').toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <b>{m.firstName || m.lastName ? `${m.firstName || ''} ${m.lastName || ''}`.trim() : '—'}</b>
                        <small>{m.email}</small>
                      </td>
                      <td>{m.country || '—'}</td>
                      <td>
                        {m.poles?.map((p: any, i: number) => (
                          <span key={i} className="pole-tag">{p.slug}</span>
                        )) || '—'}
                      </td>
                      <td>
                        {m.poles?.[0]?.level || '—'}
                      </td>
                      <td>
                        <span className={`status ${m.status === 'active' ? 'active' : 'pending'}`}>
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredMembers.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>
                        Aucun membre trouvé
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {data?.pagination && data.pagination.pages > 1 && (
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--muted-foreground)', fontSize: '14px' }}>
                Page {data.pagination.page} / {data.pagination.pages} ({data.pagination.total} membres)
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="text-button"
                  disabled={data.pagination.page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  Précédent
                </button>
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
        </div>
      </div>
    </main>
  )
}
