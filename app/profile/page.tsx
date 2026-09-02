'use client'

import { useState, useEffect } from 'react'
import { Shield, Brain, Cloud, Loader2, Check, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

const poleIcon = (slug: string) => {
  switch (slug) {
    case 'security': return <Shield size={16} />
    case 'ai': return <Brain size={16} />
    case 'cloud': return <Cloud size={16} />
    default: return null
  }
}

const poleLabel = (slug: string) => {
  switch (slug) {
    case 'security': return 'HASHCODE Security'
    case 'ai': return 'HASHCODE AI'
    case 'cloud': return 'HASHCODE Cloud'
    default: return slug
  }
}

const levelLabel = (level: string) => {
  switch (level) {
    case 'beginner': return 'Débutant'
    case 'intermediate': return 'Intermédiaire'
    case 'advanced': return 'Avancé'
    default: return level
  }
}

const commPrefLabel = (key: string) => {
  switch (key) {
    case 'community': return 'Communauté'
    case 'security': return 'HASHCODE Security'
    case 'ai': return 'HASHCODE AI'
    case 'cloud': return 'HASHCODE Cloud'
    case 'training': return 'Formations'
    case 'workshops': return 'Workshops'
    case 'opportunities': return 'Opportunités'
    case 'projects': return 'Projets'
    default: return key
  }
}

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [data, setData] = useState<any>(null)
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    age: '',
    country: '',
    city: '',
    phone: '',
    linkedinUrl: '',
    bio: '',
  })
  const [commPrefs, setCommPrefs] = useState({
    community: false,
    security: false,
    ai: false,
    cloud: false,
    training: false,
    workshops: false,
    opportunities: false,
    projects: false,
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/members/me')
      if (res.status === 401) {
        router.push('/auth/verify')
        return
      }
      const data = await res.json()
      setData(data)
      if (data.member) {
        setForm((f) => ({
          ...f,
          firstName: data.member.firstName || '',
          lastName: data.member.lastName || '',
          age: data.member.age?.toString() || '',
          country: data.member.country || '',
          city: data.member.city || '',
          phone: data.member.phone || '',
        }))
      }
      if (data.profile) {
        setForm((f) => ({
          ...f,
          linkedinUrl: data.profile.linkedinUrl || '',
          bio: data.profile.bio || '',
        }))
      }
      if (data.communicationPrefs) {
        setCommPrefs({
          community: data.communicationPrefs.community,
          security: data.communicationPrefs.security,
          ai: data.communicationPrefs.ai,
          cloud: data.communicationPrefs.cloud,
          training: data.communicationPrefs.training,
          workshops: data.communicationPrefs.workshops,
          opportunities: data.communicationPrefs.opportunities,
          projects: data.communicationPrefs.projects,
        })
      }
    } catch (err) {
      setError('Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch('/api/members/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName || null,
          lastName: form.lastName || null,
          age: form.age ? parseInt(form.age) : null,
          country: form.country || null,
          city: form.city || null,
          phone: form.phone || null,
          bio: form.bio || null,
          linkedinUrl: form.linkedinUrl || null,
          communicationPrefs: commPrefs,
        }),
      })
      if (res.ok) {
        setSuccess(true)
        setEditMode(false)
        fetchProfile()
        setTimeout(() => setSuccess(false), 3000)
      } else {
        setError('Erreur lors de la sauvegarde')
      }
    } catch {
      setError('Erreur réseau')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/session', { method: 'DELETE' })
    router.push('/')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div style={{ textAlign: 'center', padding: '120px' }}>Chargement…</div>
      </main>
    )
  }

  const member = data?.member
  const profile = data?.profile
  const poles = data?.poles || []
  const interests = data?.interests || []
  const comms = data?.communicationPrefs

  return (
    <main className="min-h-screen bg-background">
      <header className="site-header">
        <div className="brand">
          <span className="brand-mark">H</span>
          <span>HASHCODE</span>
        </div>
        <div className="header-actions">
          {data?.isAdmin && (
            <button className="text-button" onClick={() => router.push('/admin')}>Admin</button>
          )}
          <button className="text-button" onClick={handleLogout}><LogOut size={14} /> Déconnexion</button>
        </div>
      </header>

      <div className="onboarding-wrap">
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <p className="eyebrow"><span className="eyebrow-dot" /> Mon profil</p>
          <h1 style={{ fontSize: 'clamp(40px, 5vw, 56px)', margin: '0 0 8px', letterSpacing: '-.04em' }}>
            {member?.firstName ? `Bonjour, ${member.firstName}` : 'Bienvenue'}
          </h1>
          <p style={{ color: 'var(--muted-foreground)', marginBottom: '32px' }}>
            {member?.email}
          </p>

          {error && <div className="error-banner">{error}</div>}
          {success && <div className="success-banner">✓ Profil mis à jour avec succès</div>}

          {!editMode && (
            <>
              <section style={{ marginBottom: '40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '20px', margin: 0 }}>Identité</h2>
                  <button className="text-button" onClick={() => setEditMode(true)}>Modifier</button>
                </div>
                <dl className="profile-dl">
                  <dt>Prénom</dt><dd>{member?.firstName || '—'}</dd>
                  <dt>Nom</dt><dd>{member?.lastName || '—'}</dd>
                  <dt>Âge</dt><dd>{member?.age || '—'}</dd>
                  <dt>Pays</dt><dd>{member?.country || '—'}</dd>
                  <dt>Ville</dt><dd>{member?.city || '—'}</dd>
                  <dt>Téléphone</dt><dd>{member?.phone || '—'}</dd>
                  <dt>Statut</dt><dd><span className={`status ${member?.status === 'active' ? 'active' : 'pending'}`}>{member?.status}</span></dd>
                </dl>
              </section>

              {profile && (
                <section style={{ marginBottom: '40px' }}>
                  <h2 style={{ fontSize: '20px', margin: '0 0 20px' }}>Profil</h2>
                  <dl className="profile-dl">
                    <dt>Occupation</dt><dd>{profile.occupation || '—'}</dd>
                    <dt>LinkedIn</dt><dd>{profile.linkedinUrl ? <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>Voir profil</a> : '—'}</dd>
                    <dt>Bio</dt><dd>{profile.bio || '—'}</dd>
                  </dl>
                </section>
              )}

              {poles.length > 0 && (
                <section style={{ marginBottom: '40px' }}>
                  <h2 style={{ fontSize: '20px', margin: '0 0 16px' }}>Pôles ({poles.length})</h2>
                  <div className="pole-list">
                    {poles.map((p: any) => (
                      <div key={p.id} className="pole-row">
                        <div className="pole-row-icon">{poleIcon(p.pole.slug)}</div>
                        <b>{poleLabel(p.pole.slug)}</b>
                        <span className="level-tag">{levelLabel(p.level)}</span>
                        {p.isPrimary && <span className="primary-tag">Principal</span>}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {interests.length > 0 && (
                <section style={{ marginBottom: '40px' }}>
                  <h2 style={{ fontSize: '20px', margin: '0 0 16px' }}>Intérêts ({interests.length})</h2>
                  <div className="tags">
                    {interests.map((i: any) => (
                      <span key={i.id} className="tag">{i.name}</span>
                    ))}
                  </div>
                </section>
              )}

              {comms && (
                <section style={{ marginBottom: '40px' }}>
                  <h2 style={{ fontSize: '20px', margin: '0 0 16px' }}>Préférences de communication</h2>
                  <div className="tags">
                    {Object.entries(comms)
                      .filter(([k, v]: [string, any]) => v === true && k !== 'id' && k !== 'memberId')
                      .map(([k]) => <span key={k} className="tag">✓ {commPrefLabel(k)}</span>)
                    }
                  </div>
                </section>
              )}

              {poles.length === 0 && interests.length === 0 && (
                <section className="info-card" style={{ marginBottom: '40px' }}>
                  <p>Tu n'as pas encore complété ton profil.</p>
                  <button className="primary-button" onClick={() => router.push('/onboarding')}>
                    Compléter mon profil
                  </button>
                </section>
              )}
            </>
          )}

          {editMode && (
            <>
              <h2 style={{ fontSize: '20px', margin: '0 0 20px' }}>Modifier mon profil</h2>
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '32px' }}>
                <div><label>Prénom</label><input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
                <div><label>Nom</label><input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
                <div><label>Âge</label><input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} /></div>
                <div><label>Pays</label><input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
                <div><label>Ville</label><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                <div><label>Téléphone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div style={{ gridColumn: '1 / -1' }}><label>LinkedIn</label><input value={form.linkedinUrl} onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })} /></div>
                <div style={{ gridColumn: '1 / -1' }}><label>Bio</label><input value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
              </div>

              <h2 style={{ fontSize: '20px', margin: '0 0 16px' }}>Préférences de communication</h2>
              <div className="comm-prefs" style={{ marginBottom: '32px' }}>
                <div className="comm-group">
                  <h3>Pôles HASHCODE</h3>
                  <label className="toggle">
                    <label className="toggle-switch">
                      <input type="checkbox" checked={commPrefs.security} onChange={(e) => setCommPrefs({ ...commPrefs, security: e.target.checked })} />
                      <span className="toggle-slider"></span>
                    </label>
                    HASHCODE Security
                  </label>
                  <label className="toggle">
                    <label className="toggle-switch">
                      <input type="checkbox" checked={commPrefs.ai} onChange={(e) => setCommPrefs({ ...commPrefs, ai: e.target.checked })} />
                      <span className="toggle-slider"></span>
                    </label>
                    HASHCODE AI
                  </label>
                  <label className="toggle">
                    <label className="toggle-switch">
                      <input type="checkbox" checked={commPrefs.cloud} onChange={(e) => setCommPrefs({ ...commPrefs, cloud: e.target.checked })} />
                      <span className="toggle-slider"></span>
                    </label>
                    HASHCODE Cloud
                  </label>
                </div>
                <div className="comm-group">
                  <h3>Activités</h3>
                  <label className="toggle">
                    <label className="toggle-switch">
                      <input type="checkbox" checked={commPrefs.training} onChange={(e) => setCommPrefs({ ...commPrefs, training: e.target.checked })} />
                      <span className="toggle-slider"></span>
                    </label>
                    Formations
                  </label>
                  <label className="toggle">
                    <label className="toggle-switch">
                      <input type="checkbox" checked={commPrefs.workshops} onChange={(e) => setCommPrefs({ ...commPrefs, workshops: e.target.checked })} />
                      <span className="toggle-slider"></span>
                    </label>
                    Workshops
                  </label>
                  <label className="toggle">
                    <label className="toggle-switch">
                      <input type="checkbox" checked={commPrefs.opportunities} onChange={(e) => setCommPrefs({ ...commPrefs, opportunities: e.target.checked })} />
                      <span className="toggle-slider"></span>
                    </label>
                    Opportunités
                  </label>
                  <label className="toggle">
                    <label className="toggle-switch">
                      <input type="checkbox" checked={commPrefs.projects} onChange={(e) => setCommPrefs({ ...commPrefs, projects: e.target.checked })} />
                      <span className="toggle-slider"></span>
                    </label>
                    Projets
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="primary-button" onClick={handleSave} disabled={saving}>
                  {saving ? <><Loader2 className="spin" size={18} /> Sauvegarde…</> : <>Sauvegarder <Check size={18} /></>}
                </button>
                <button className="text-button" onClick={() => { setEditMode(false); fetchProfile() }}>Annuler</button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
