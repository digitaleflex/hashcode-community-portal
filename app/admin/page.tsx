'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Users, ShieldCheck, Zap, Activity, CheckCircle, X, RotateCw } from 'lucide-react'

export default function AdminDashboard() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [poleFilter, setPoleFilter] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [page, setPage] = useState(1)
  const [selectedMember, setSelectedMember] = useState<string | null>(null)

  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('')
    setPoleFilter('')
    setLevelFilter('')
    setPage(1)
  }

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (searchTimeout) clearTimeout(searchTimeout)

    const timeout = setTimeout(() => {
      setPage(1)
      fetchData()
    }, 500)

    setSearchTimeout(timeout)

    return () => {
      if (searchTimeout) clearTimeout(searchTimeout)
    }
  }, [search])

  useEffect(() => {
    if (statusFilter || poleFilter || levelFilter || page > 1) {
      fetchData()
    }
  }, [statusFilter, poleFilter, levelFilter, page])

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/session', { credentials: 'include' })
      if (!res.ok) {
        router.push('/auth/verify')
        return
      }
      fetchData()
    } catch {
      router.push('/auth/verify')
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        search,
        status: statusFilter,
        pole: poleFilter,
        level: levelFilter,
        page: page.toString(),
        limit: '20',
      })
      const res = await fetch(`/api/admin/members?${params}`, {
        credentials: 'include',
      })
      if (res.status === 401) {
        router.push('/auth/verify')
        return
      }
      const result = await res.json()
      setData(result)
      setError(null)
    } catch (err) {
      setError('Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/session', { method: 'DELETE', credentials: 'include' })
    router.push('/auth/verify')
  }

  if (loading && !data) {
    return (
      <main className="admin">
        <div style={{ textAlign: 'center', padding: '120px 32px' }}>Chargement...</div>
      </main>
    )
  }

  const memberDetail = data?.members?.find((m: any) => m.id === selectedMember)

  return (
    <main className="admin">
      <header className="site-header">
        <div className="brand">
          <span className="brand-mark">H</span>
          <span>HASHCODE <small>ADMIN</small></span>
        </div>
        <div className="header-actions">
          <button className="text-button" onClick={handleLogout}>Déconnexion</button>
        </div>
      </header>

      <div className="admin-wrap">
        <div className="admin-heading">
          <div>
            <p className="eyebrow"><span className="eyebrow-dot" /> Vue d'ensemble</p>
            <h1>Tableau de bord Admin</h1>
            <p>Gérez l'importation et l'activation des membres HASHCODE</p>
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {/* Stats */}
        {data?.stats && (
          <div className="metric-grid">
            <div>
              <span>Total membres</span>
              <b>{data.stats.total}</b>
              <small className="up">Tous statuts confondus</small>
            </div>
            <div>
              <span>Importés</span>
              <b>{data.stats.imported}</b>
              <small>Depuis Excel</small>
            </div>
            <div>
              <span>Mis à jour</span>
              <b>{data.stats.updated}</b>
              <small>Profil complété</small>
            </div>
            <div>
              <span>Actifs</span>
              <b>{data.stats.active}</b>
              <small className="up">Membres engagés</small>
            </div>
          </div>
        )}

        {/* Pole Distribution */}
        {data?.poleStats && (
          <div className="distribution-section">
            <h2>Distribution par pôles</h2>
            <div className="pole-stats">
              {data.poleStats.map((p: any) => (
                <div key={p.slug} className="pole-stat-card">
                  <b>{p.count}</b>
                  <span>{p.name}</span>
                  <small>{data.stats.total > 0 ? Math.round((p.count / data.stats.total) * 100) : 0}%</small>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="table-panel" style={{ marginTop: '40px' }}>
          <div className="table-head">
            <div>
              <h2>Annuaire des membres</h2>
              <span>{data?.members?.length || 0} membres affichés sur {data?.pagination?.total || 0}</span>
            </div>
            <div className="search-box">
              <Search size={16} />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value) }}
                placeholder="Rechercher email, nom, pays..."
              />
              {(search || statusFilter || poleFilter || levelFilter) && (
                <button className="reset-filters" onClick={clearFilters} title="Effacer tous les filtres">
                  <RotateCw size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="filters-row">
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}>
              <option value="">Tous les statuts</option>
              <option value="imported">Importé</option>
              <option value="claimed">Réclamé</option>
              <option value="verified">Vérifié</option>
              <option value="updated">À jour</option>
              <option value="active">Actif</option>
              <option value="inactive">Inactif</option>
            </select>
            <select value={poleFilter} onChange={(e) => { setPoleFilter(e.target.value); setPage(1) }}>
              <option value="">Tous les pôles</option>
              <option value="security">HASHCODE Sécurité</option>
              <option value="ai">HASHCODE IA</option>
              <option value="cloud">HASHCODE Cloud</option>
            </select>
            <select value={levelFilter} onChange={(e) => { setLevelFilter(e.target.value); setPage(1) }}>
              <option value="">Tous les niveaux</option>
              <option value="beginner">Débutant</option>
              <option value="intermediate">Intermédiaire</option>
              <option value="advanced">Avancé</option>
            </select>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Membre</th>
                  <th>Pays</th>
                  <th>Pôles</th>
                  <th>Statut</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {data?.members?.map((m: any) => (
                  <tr key={m.id}>
                    <td>
                      <span className="avatar">
                        {(m.firstName?.[0] || m.email[0]).toUpperCase()}{(m.lastName?.[0] || '').toUpperCase()}
                      </span>
                      <span>
                        <b>{m.firstName || m.lastName ? `${m.firstName || ''} ${m.lastName || ''}`.trim() : '—'}</b>
                        <small>{m.email}</small>
                      </span>
                    </td>
                    <td>{m.country || '—'}</td>
                    <td>
                      {m.poles?.map((p: any, i: number) => (
                        <span key={i} className="pole-tag">{p.slug}</span>
                      ))}
                    </td>
                    <td>
                      <span className={`status ${m.status === 'active' ? 'active' : 'pending'}`}>
                        {m.status}
                      </span>
                    </td>
                    <td>
                      <button className="text-button" onClick={() => setSelectedMember(m.id)}>
                        Voir le profil
                      </button>
                    </td>
                  </tr>
                ))}
                {(!data?.members || data.members.length === 0) && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>
                      Aucun membre trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {data?.pagination && data.pagination.pages > 1 && (
            <div className="pagination">
              <button disabled={page === 1} onClick={() => setPage(page - 1)}>Précédent</button>
              <span>Page {page} / {data.pagination.pages}</span>
              <button disabled={page === data.pagination.pages} onClick={() => setPage(page + 1)}>Suivant</button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
