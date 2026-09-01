'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ArrowRight, Loader2 } from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [data, setData] = useState<any>(null)
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
    community: true,
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
      const res = await fetch('/api/members/me', { credentials: 'include' })
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
        credentials: 'include',
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
    await fetch('/api/auth/session', { method: 'DELETE', credentials: 'include' })
    router.push('/')
  }

  if (loading) {
    return <main className="min-h-screen bg-background"><div style={{ textAlign: 'center', padding: '120px' }}>Chargement...</div></main>
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="site-header">
        <div className="brand">
          <span className="brand-mark">H</span>
          <span>HASHCODE</span>
        </div>
        <div className="header-actions">
          <button className="text-button" onClick={() => router.push('/admin')}>Admin</button>
          <button className="text-button" onClick={handleLogout}>Déconnexion</button>
        </div>
      </header>

      <div className="onboarding-wrap">
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <p className="eyebrow"><span className="eyebrow-dot" /> Mon profil</p>
          <h1 style={{ fontSize: 'clamp(40px, 5vw, 56px)', margin: '0 0 24px', letterSpacing: '-.04em' }}>
            {data?.member?.firstName || 'Membre'}
          </h1>
          <p style={{ color: 'var(--muted-foreground)', marginBottom: '32px' }}>
            {data?.member?.email}
          </p>

          {error && <div className="error-banner">{error}</div>}
          {success && <div className="success-banner">✓ Profil mis à jour</div>}

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

          <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Préférences de communication</h2>
          <div className="comm-prefs" style={{ marginBottom: '32px' }}>
            <div className="comm-group">
              <h3>Pôles HASHCODE</h3>
              <label className="toggle"><input type="checkbox" checked={commPrefs.security} onChange={(e) => setCommPrefs({ ...commPrefs, security: e.target.checked })} /> HASHCODE Security</label>
              <label className="toggle"><input type="checkbox" checked={commPrefs.ai} onChange={(e) => setCommPrefs({ ...commPrefs, ai: e.target.checked })} /> HASHCODE AI</label>
              <label className="toggle"><input type="checkbox" checked={commPrefs.cloud} onChange={(e) => setCommPrefs({ ...commPrefs, cloud: e.target.checked })} /> HASHCODE Cloud</label>
            </div>
            <div className="comm-group">
              <h3>Activités</h3>
              <label className="toggle"><input type="checkbox" checked={commPrefs.training} onChange={(e) => setCommPrefs({ ...commPrefs, training: e.target.checked })} /> Formations</label>
              <label className="toggle"><input type="checkbox" checked={commPrefs.workshops} onChange={(e) => setCommPrefs({ ...commPrefs, workshops: e.target.checked })} /> Workshops</label>
              <label className="toggle"><input type="checkbox" checked={commPrefs.opportunities} onChange={(e) => setCommPrefs({ ...commPrefs, opportunities: e.target.checked })} /> Opportunités</label>
              <label className="toggle"><input type="checkbox" checked={commPrefs.projects} onChange={(e) => setCommPrefs({ ...commPrefs, projects: e.target.checked })} /> Projets</label>
            </div>
          </div>

          <button className="primary-button" onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="spin" size={18} /> Sauvegarde...</> : <>Sauvegarder <Check size={18} /></>}
          </button>
        </div>
      </div>
    </main>
  )
}
