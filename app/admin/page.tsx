'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Users, ShieldCheck, Zap, Activity, CheckCircle, X } from 'lucide-react'

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

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (search || statusFilter || poleFilter || levelFilter || page) {
      fetchData()
    }
  }, [search, statusFilter, poleFilter, levelFilter, page])

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
            <h1>Dashboard Admin</h1>
            <p>Pilote la migration et l'activation des membres HASHCODE</p>
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
            <h2>Distribution par pôle</h2>
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
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="Rechercher email, nom, pays..."
              />
            </div>
          </div>

          <div className="filters-row">
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}>
              <option value="">Tous les statuts</option>
              <option value="imported">Imported</option>
              <option value="claimed">Claimed</option>
              <option value="verified">Verified</option>
              <option value="updated">Updated</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select value={poleFilter} onChange={(e) => { setPoleFilter(e.target.value); setPage(1) }}>
              <option value="">Tous les pôles</option>
              <option value="security">Security</option>
              <option value="ai">AI</option>
              <option value="cloud">Cloud</option>
            </select>
            <select value={levelFilter} onChange={(e) => { setLevelFilter(e.target.value); setPage(1) }}>
              <option value="">Tous les niveaux</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Membre</th>
                  <th>Email</th>
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
                    <td>{m.email}</td>
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
                        Voir
                      </button>
                    </td>
                  </tr>
                ))}
                {(!data?.members || data.members.length === 0) && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>
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

      {selectedMember && <MemberDetailModal id={selectedMember} onClose={() => setSelectedMember(null)} />}
    </main>
  )
}

function MemberDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [member, setMember] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/admin/members/${id}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        setMember(data)
        setLoading(false)
      })
  }, [id])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>
        {loading ? (
          <div style={{ padding: '40px' }}>Chargement...</div>
        ) : member ? (
          <div className="member-detail">
            <h2>{member.member.firstName} {member.member.lastName}</h2>
            <p className="microcopy">{member.member.email}</p>

            <div className="detail-section">
              <h3>Identité</h3>
              <dl>
                <dt>Pays</dt><dd>{member.member.country || '—'}</dd>
                <dt>Âge</dt><dd>{member.member.age || '—'}</dd>
                <dt>Téléphone</dt><dd>{member.member.phone || '—'}</dd>
                <dt>Statut</dt><dd>{member.member.status}</dd>
              </dl>
            </div>

            {member.profile && (
              <div className="detail-section">
                <h3>Profil</h3>
                <dl>
                  <dt>Occupation</dt><dd>{member.profile.occupation || '—'}</dd>
                  <dt>LinkedIn</dt><dd>{member.profile.linkedinUrl ? <a href={member.profile.linkedinUrl} target="_blank" rel="noreferrer">Voir profil</a> : '—'}</dd>
                  <dt>Heures/semaine</dt><dd>{member.profile.timeAvailable || '—'}</dd>
                  <dt>Travail</dt><dd>{member.profile.workPreference || '—'}</dd>
                </dl>
              </div>
            )}

            {member.poles?.length > 0 && (
              <div className="detail-section">
                <h3>Pôles ({member.poles.length})</h3>
                {member.poles.map((p: any, i: number) => (
                  <div key={i} className="pole-row">
                    <b>{p.pole.name}</b>
                    <span className="level-tag">{p.level}</span>
                    {p.isPrimary && <span className="primary-tag">Principal</span>}
                  </div>
                ))}
              </div>
            )}

            {member.interests?.length > 0 && (
              <div className="detail-section">
                <h3>Intérêts ({member.interests.length})</h3>
                <div className="tags">
                  {member.interests.map((i: any) => (
                    <span key={i.id} className="tag">{i.name}</span>
                  ))}
                </div>
              </div>
            )}

            {member.communicationPrefs && (
              <div className="detail-section">
                <h3>Préférences communication</h3>
                <div className="tags">
                  {Object.entries(member.communicationPrefs).filter(([k, v]) => v === true && k !== 'id' && k !== 'memberId').map(([k]) => (
                    <span key={k} className="tag">✓ {k}</span>
                  ))}
                </div>
              </div>
            )}

            {member.history?.length > 0 && (
              <div className="detail-section">
                <h3>Historique</h3>
                {member.history.map((h: any, i: number) => (
                  <div key={i} className="history-row">
                    <small><b>Source:</b> {h.source}</small>
                    {h.score && <small><b>Score:</b> {h.score}</small>}
                    {h.languages && <small><b>Langues:</b> {h.languages}</small>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: '40px' }}>Membre non trouvé</div>
        )}
      </div>
    </div>
  )
}
