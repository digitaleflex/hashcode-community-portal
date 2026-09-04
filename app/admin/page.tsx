'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, TrendingUp, RotateCw } from 'lucide-react'
import UserSidebar from '@/components/UserSidebar'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { genderLabel, genderColor } from '@/lib/display'

interface MemberPole {
  name: string
  slug: string
  level?: string | null
  isPrimary?: boolean | null
}

interface MemberRow {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
  country?: string | null
  status: string
  gender?: string | null
  createdAt?: string | null
  poles?: MemberPole[] | null
}

interface PoleStat {
  name: string
  slug: string
  count: number
}

interface DashboardStats {
  total: number
  imported: number
  verified?: number
  updated: number
  active: number
}

interface DashboardPagination {
  page: number
  limit: number
  total: number
  pages: number
}

interface DashboardData {
  stats: DashboardStats
  poleStats: PoleStat[]
  members: MemberRow[]
  pagination: DashboardPagination
}

export default function AdminDashboard() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [poleFilter, setPoleFilter] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [genderFilter, setGenderFilter] = useState('')
  const [page, setPage] = useState(1)
  const [selectedMember, setSelectedMember] = useState<string | null>(null)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [bulkAction, setBulkAction] = useState<'' | 'delete' | 'changeStatus'>('')
  const [bulkStatus, setBulkStatus] = useState<string>('')

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('')
    setPoleFilter('')
    setLevelFilter('')
    setGenderFilter('')
    setPage(1)
    setSelectedMembers([])
  }

  const toggleSelectAll = () => {
    if (selectedMembers.length === data?.members?.length) {
      setSelectedMembers([])
    } else {
      setSelectedMembers(data?.members?.map((m: MemberRow) => m.id) || [])
    }
  }

  const toggleSelectMember = (id: string) => {
    setSelectedMembers(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

    const timeout = setTimeout(() => {
      setPage(1)
      fetchData()
    }, 500)

    searchTimeoutRef.current = timeout

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [search])

  useEffect(() => {
    if (statusFilter || poleFilter || levelFilter || genderFilter || page > 1) {
      fetchData()
    }
  }, [statusFilter, poleFilter, levelFilter, genderFilter, page])

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
        gender: genderFilter,
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
      if (res.status === 403) {
        router.push('/profile')
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

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce membre ? Cette action ne peut être annulée.')) {
      try {
        const res = await fetch(`/api/admin/members/${id}`, {
          method: 'DELETE',
          credentials: 'include',
        })
        if (res.ok) {
          fetchData()
          setSelectedMember(null)
          setSelectedMembers([])
          window.alert('Membre supprimé avec succès')
        } else {
          const err = await res.json()
          window.alert(err.error || 'Erreur lors de la suppression')
        }
      } catch (e) {
        window.alert('Erreur réseau')
      }
    }
  }

  const handleBulkChangeStatus = async () => {
    if (!bulkStatus) return
    try {
      const res = await fetch(`/api/admin/members/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ids: selectedMembers,
          action: 'changeStatus',
          status: bulkStatus,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        fetchData()
        setBulkAction('')
        setBulkStatus('')
        window.alert(`${data.modifiedCount} membre(s) mis à jour`)
      } else {
        window.alert(data.error || 'Erreur')
      }
    } catch (e) {
      window.alert('Erreur réseau')
    }
  }

  const handleBulkDelete = async () => {
    if (window.confirm('Voulez-vous supprimer définitivement ces ' + selectedMembers.length + ' membre(s) ?')) {
      try {
        const res = await fetch(`/api/admin/members/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            ids: selectedMembers,
            action: 'delete',
          }),
        })
        const data = await res.json()
        if (res.ok) {
          fetchData()
          setSelectedMembers([])
          setSelectedMember(null)
          window.alert(`${data.deletedCount} membre(s) supprimé(s)`)
        } else {
          window.alert(data.error || 'Erreur')
        }
      } catch (e) {
        window.alert('Erreur réseau')
      }
    }
  }

  if (loading && !data) {
    return (
      <div className="page-with-sidebar">
        <UserSidebar />
        <main className="user-main">
          <div style={{ textAlign: 'center', padding: '120px 32px' }}>
            <div className="spinner spinner-lg" style={{ margin: '0 auto 16px' }} />
            <span style={{ color: 'var(--muted-foreground)' }}>Chargement...</span>
          </div>
        </main>
      </div>
    )
  }

  const memberDetail = data?.members?.find((m: MemberRow) => m.id === selectedMember)

  return (
    <div className="page-with-sidebar">
      <UserSidebar />
      <main className="user-main">
        <div className="admin-wrap">
          <Breadcrumbs />
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  {data.stats.total > 0 && (
                    <small className={data.stats.updated / data.stats.total > 0.3 ? 'up' : ''}>
                      {data.stats.total > 0 ? Math.round((data.stats.updated / data.stats.total) * 100) : 0}% du total
                    </small>
                  )}
                </div>
              </div>
              <div>
                <span>Actifs</span>
                <b>{data.stats.active}</b>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  {data.stats.total > 0 && (
                    <small className={data.stats.active / data.stats.total > 0.2 ? 'up' : ''}>
                      {data.stats.total > 0 ? Math.round((data.stats.active / data.stats.total) * 100) : 0}% taux d'engagement
                    </small>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Engagement Score */}
          {data?.stats && data.stats.total > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '16px 20px',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              marginBottom: 32
            }}>
              <TrendingUp size={20} style={{ color: data.stats.active / data.stats.total > 0.3 ? '#16a34a' : '#ca8a04' }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  Score d'engagement : {data.stats.total > 0 ? Math.round((data.stats.active / data.stats.total) * 100) : 0}%
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                  {data.stats.active / data.stats.total > 0.3
                    ? 'Excellente participation de la communauté !'
                    : 'Encouragez les membres à compléter leurs profils'}
                </div>
              </div>
            </div>
          )}

          {/* Pole Distribution */}
          {data?.poleStats && (
            <div className="distribution-section">
              <h2>Distribution par pôles</h2>
              <div className="pole-stats">
                {data.poleStats.map((p: PoleStat) => (
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
                {(search || statusFilter || poleFilter || levelFilter || genderFilter) && (
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
                <option value="expert">Expert</option>
              </select>
              <select value={genderFilter} onChange={(e) => { setGenderFilter(e.target.value); setPage(1) }}>
                <option value="">Tous les genres</option>
                <option value="male">Masculin</option>
                <option value="female">Féminin</option>
                <option value="other">Autre</option>
                <option value="prefer_not_to_say">Préfère ne pas dire</option>
              </select>
            </div>

            {/* Bulk actions bar */}
            {selectedMembers.length > 1 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  background: 'var(--primary-glow, #fef2f2)',
                  borderBottom: '1px solid var(--border)',
                  fontSize: 14,
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontWeight: 600 }}>{selectedMembers.length} membre(s) sélectionné(s)</span>
                <select
                  style={{ padding: 6, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--card)' }}
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value as '' | 'delete' | 'changeStatus')}
                >
                  <option value="">Action</option>
                  <option value="changeStatus">Changer le statut</option>
                  <option value="delete">Supprimer</option>
                </select>
                {bulkAction === 'changeStatus' && (
                  <select
                    style={{ padding: 6, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--card)' }}
                    value={bulkStatus}
                    onChange={(e) => setBulkStatus(e.target.value as string)}
                  >
                    <option value="">Statut</option>
                    <option value="imported">Importé</option>
                    <option value="claimed">Réclamé</option>
                    <option value="verified">Vérifié</option>
                    <option value="updated">À jour</option>
                    <option value="active">Actif</option>
                    <option value="inactive">Inactif</option>
                  </select>
                )}
                <button
                  className="button"
                  style={{ padding: '6px 12px' }}
                  onClick={() => bulkAction === 'changeStatus' && bulkStatus && handleBulkChangeStatus()}
                  disabled={!bulkStatus}
                >
                  Appliquer
                </button>
                <button
                  className="button"
                  style={{ padding: '6px 12px', background: 'var(--danger)', color: 'white' }}
                  onClick={() => bulkAction === 'delete' && handleBulkDelete()}
                >
                  Supprimer
                </button>
              </div>
            )}

            <div className="table-scroll">
              {selectedMembers.length > 0 && selectedMembers.length === 1 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  background: 'var(--primary-glow, #fef2f2)',
                  borderBottom: '1px solid var(--border)',
                  fontSize: 14
                }}>
                  <span style={{ fontWeight: 600 }}>{selectedMembers.length} membre sélectionné</span>
                  <button className="text-button" style={{ fontSize: 13, color: 'var(--primary)' }} onClick={() => setSelectedMembers([])}>
                    Désélectionner
                  </button>
                </div>
              )}
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <input
                        type="checkbox"
                        checked={selectedMembers.length === data?.members?.length && data?.members?.length > 0}
                        onChange={toggleSelectAll}
                        style={{ cursor: 'pointer' }}
                      />
                    </th>
                    <th>Membre</th>
                    <th>Pays</th>
                    <th>Pôles</th>
                    <th>Statut</th>
                    <th>Genre</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.members?.map((m: MemberRow) => (
                    <tr key={m.id} style={{ background: selectedMembers.includes(m.id) ? 'var(--primary-glow, #fef2f2)' : undefined }}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(m.id)}
                          onChange={() => toggleSelectMember(m.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
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
                        {m.poles?.map((p: MemberPole, i: number) => (
                          <span key={i} className="pole-tag">{p.slug}</span>
                        ))}
                      </td>
                      <td>
                        <span className={`status ${m.status === 'active' ? 'active' : 'pending'}`}>
                          {m.status}
                        </span>
                      </td>
                      <td>
                        {m.gender ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '3px 8px',
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 500,
                            color: genderColor(m.gender),
                            background: `${genderColor(m.gender)}18`,
                            border: `1px solid ${genderColor(m.gender)}40`,
                          }}>
                            <span style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: genderColor(m.gender),
                              display: 'inline-block',
                              flexShrink: 0,
                            }} />
                            {genderLabel(m.gender)}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        <button className="text-button" onClick={() => setSelectedMember(m.id)}>
                          Voir le profil
                        </button>
                        <button className="text-button" style={{ marginLeft: 8, color: '#dc2626' }} onClick={() => handleDelete(m.id)}>
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!data?.members || data.members.length === 0) && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
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
    </div>
  )
}