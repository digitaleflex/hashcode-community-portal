'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Loader2,
  Check,
  MapPin,
  Phone,
  Mail,
  Edit3,
  X,
  ExternalLink,
  User,
  Briefcase,
  Globe,
  Shield,
  Users,
  ArrowRight,
  Target,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  poleIcon,
  poleLabel,
  poleDescription,
  levelLabel,
  levelColor,
  commPrefLabel,
  commPrefIcon,
  getInitials,
} from '@/lib/display'
import { validators } from '@/lib/validation'
import UserSidebar from '@/components/UserSidebar'
import { toast } from '@/components/Toast'
import { PrivacyBadge } from '@/lib/display'
import { Breadcrumbs } from '@/components/Breadcrumbs'

interface ProfileMember {
  id?: string
  email?: string | null
  firstName?: string | null
  lastName?: string | null
  age?: number | null
  gender?: string | null
  country?: string | null
  city?: string | null
  phone?: string | null
  status?: string | null
}

interface ProfileDetails {
  occupation?: string | null
  bio?: string | null
  linkedinUrl?: string | null
}

interface ProfilePole {
  id: string
  level: string
  isPrimary?: boolean | null
  pole: {
    slug: string
    id?: string
    name?: string | null
    description?: string | null
  }
}

interface ProfileInterest {
  id: string
  name: string
  slug?: string
}

interface ProfileCommPrefs {
  id?: string
  memberId?: string
  community: boolean
  security: boolean
  ai: boolean
  cloud: boolean
  training: boolean
  workshops: boolean
  opportunities: boolean
  projects: boolean
}

interface ProfileData {
  member?: ProfileMember | null
  profile?: ProfileDetails | null
  poles?: ProfilePole[]
  interests?: ProfileInterest[]
  communicationPrefs?: ProfileCommPrefs | null
}

const GENDERS = [
  { id: '', label: 'Sélectionner' },
  { id: 'male', label: 'Masculin' },
  { id: 'female', label: 'Féminin' },
  { id: 'other', label: 'Autre' },
  { id: 'prefer_not_to_say', label: 'Préfère ne pas dire' },
]

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [data, setData] = useState<ProfileData | null>(null)
  const [editMode, setEditMode] = useState(false)
  const previousDataRef = useRef<typeof form | null>(null)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    age: '',
    gender: '',
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
    const controller = new AbortController()
    setLoading(true)
    fetch('/api/members/me', { signal: controller.signal })
      .then((res) => {
        if (res.status === 401) {
          router.push('/auth/verify')
          return null
        }
        return res.json()
      })
      .then((data) => {
        if (!data) return
        setData(data)
        if (data.member) {
          setForm({
            firstName: data.member.firstName || '',
            lastName: data.member.lastName || '',
            age: data.member.age?.toString() || '',
            gender: data.member.gender || '',
            country: data.member.country || '',
            city: data.member.city || '',
            phone: data.member.phone || '',
            linkedinUrl: data.profile?.linkedinUrl || '',
            bio: data.profile?.bio || '',
          })
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
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError('Erreur de chargement')
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [router])

  const fetchProfile = () => {
    const controller = new AbortController()
    setLoading(true)
    fetch('/api/members/me', { signal: controller.signal })
      .then((res) => {
        if (res.status === 401) {
          router.push('/auth/verify')
          return null
        }
        return res.json()
      })
      .then((data) => {
        if (!data) return
        setData(data)
        if (data.member) {
          setForm({
            firstName: data.member.firstName || '',
            lastName: data.member.lastName || '',
            age: data.member.age?.toString() || '',
            gender: data.member.gender || '',
            country: data.member.country || '',
            city: data.member.city || '',
            phone: data.member.phone || '',
            linkedinUrl: data.profile?.linkedinUrl || '',
            bio: data.profile?.bio || '',
          })
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
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError('Erreur de chargement')
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }

  const handleSave = async () => {
    // Same rules as the server (lib/server-validation.ts).
    if (form.age) {
      const ageCheck = validators.age(form.age)
      if (!ageCheck.valid) {
        const msg = ageCheck.message || 'Âge invalide'
        setError(msg)
        toast(msg, 'error')
        return
      }
    }

    previousDataRef.current = { ...form }
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
          age: form.age || null,
          gender: form.gender || null,
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
        toast('Profil mis à jour', 'success')
      } else {
        const data = await res.json().catch(() => null)
        const msg = data?.error || 'Erreur lors de la sauvegarde'
        setError(msg)
        toast(msg, 'error')
      }
    } catch {
      const msg = 'Erreur réseau'
      setError(msg)
      toast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="page-with-sidebar">
        <UserSidebar />
        <main className="user-main">
          <div className="profile-container">
            <div className="profile-header" style={{ opacity: 0.5 }}>
              <div className="skeleton skeleton-circle" style={{ width: 120, height: 120 }} />
              <div>
                <div className="skeleton skeleton-text tall" style={{ width: 200 }} />
                <div className="skeleton skeleton-text" style={{ width: 160, marginTop: 8 }} />
              </div>
            </div>
            <div className="profile-section">
              <div className="skeleton skeleton-text" style={{ width: 120, height: 24, marginBottom: 16 }} />
              <div className="skeleton skeleton-card" />
              <div className="skeleton skeleton-card" />
              <div className="skeleton skeleton-card" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  const member = data?.member
  const profile = data?.profile
  const poles = data?.poles || []
  const interests = data?.interests || []
  const comms = data?.communicationPrefs

  return (
    <div className="page-with-sidebar">
      <UserSidebar />
      <main className="user-main">
        <div className="profile-container">
          <Breadcrumbs />
          {/* ── HEADER ──────────────────────────────────── */}
          <div className="profile-header">
            <div className="profile-avatar">
              {getInitials(member?.firstName, member?.lastName)}
            </div>
            <div className="profile-info">
              <h1>{member?.firstName ? `${member.firstName} ${member.lastName || ''}` : 'Bienvenue'}</h1>
              <div className="profile-handle" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span>{member?.email}</span>
                <PrivacyBadge level="public" />
              </div>
              <div className="profile-meta">
                {member?.city && (
                  <span className="profile-meta-item">
                    <MapPin size={14} /> {member.city}{member?.country ? `, ${member.country}` : ''}
                  </span>
                )}
                {member?.phone && (
                  <span className="profile-meta-item">
                    <Phone size={14} /> {member.phone}
                  </span>
                )}
                <span className="profile-meta-item" style={{
                  background: member?.status === 'active' ? '#dcfce7' : '#fef3c7',
                  color: member?.status === 'active' ? '#166534' : '#92400e',
                  padding: '2px 10px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  {member?.status === 'active' ? <Check size={12} strokeWidth={2.5} /> : null}
                  {member?.status === 'active' ? 'Actif' : 'En attente'}
                </span>
              </div>
            </div>
            <div className="profile-actions">
              {!editMode ? (
                <>
                  <button className="primary-button" onClick={() => setEditMode(true)}>
                    <Edit3 size={16} /> Modifier
                  </button>
                  {member?.id && (
                    <a
                      href={`/m/${member.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-button"
                      style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}
                    >
                      Voir mon profil public
                    </a>
                  )}
                </>
              ) : (
                <button className="text-button" onClick={() => { setEditMode(false); fetchProfile() }}>
                  <X size={16} /> Annuler
                </button>
              )}
            </div>
          </div>

          {/* ── ALERTS ──────────────────────────────────── */}
          {error && <div className="error-banner">{error}</div>}
          {success && (
            <div className="success-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={18} />
                <span>Profil mis à jour</span>
              </div>
              {previousDataRef.current && (
                <button
                  className="text-button"
                  style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}
                  onClick={async () => {
                    if (!previousDataRef.current) return
                    await fetch('/api/members/me', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(previousDataRef.current),
                    })
                    setForm(previousDataRef.current)
                    previousDataRef.current = null
                  }}
                >
                  Annuler
                </button>
              )}
            </div>
          )}

          {/* ── VIEW MODE ──────────────────────────────── */}
          {!editMode ? (
            <>
              {/* Identity Section */}
              <div className="profile-section">
                <h2><User size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Identité</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Prénom</div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{member?.firstName || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Nom</div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{member?.lastName || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Âge</div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{member?.age || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Pays</div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{member?.country || '—'}</div>
                  </div>
                </div>
              </div>

              {/* Profile Section */}
              {(profile?.occupation || profile?.bio || profile?.linkedinUrl) && (
                <div className="profile-section">
                  <h2><Briefcase size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Profil professionnel</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                    {profile?.occupation && (
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Occupation</div>
                        <div style={{ fontSize: 15, fontWeight: 600, textTransform: 'capitalize' }}>{profile.occupation}</div>
                      </div>
                    )}
                    {profile?.linkedinUrl && (
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>LinkedIn</div>
                        <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontSize: 15, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          Voir profil <ExternalLink size={14} />
                        </a>
                      </div>
                    )}
                  </div>
                  {profile?.bio && (
                    <div style={{ marginTop: 20 }}>
                      <div style={{ fontSize: 12, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Bio</div>
                      <div style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--foreground)' }}>{profile.bio}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Poles Section */}
              {poles.length > 0 && (
                <div className="profile-section">
                  <h2><Shield size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Pôles ({poles.length})</h2>
                  <div className="pole-cards">
                    {poles.map((p: ProfilePole) => (
                      <div key={p.id} className="pole-card">
                        <div className={`pole-card-icon ${p.pole.slug}`}>
                          {poleIcon(p.pole.slug)}
                        </div>
                        <h3>{poleLabel(p.pole.slug)}</h3>
                        <p>{poleDescription(p.pole.slug)}</p>
                        <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: levelColor(p.level),
                            background: `${levelColor(p.level)}15`,
                            padding: '4px 10px',
                            borderRadius: 999,
                          }}>
                            {levelLabel(p.level)}
                          </span>
                          {p.isPrimary && (
                            <span style={{
                              fontSize: 11,
                              fontWeight: 700,
                              background: 'var(--primary)',
                              color: 'white',
                              padding: '4px 10px',
                              borderRadius: 999,
                              textTransform: 'uppercase',
                              letterSpacing: '.05em',
                            }}>
                              Principal
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interests Section */}
              {interests.length > 0 && (
                <div className="profile-section">
                  <h2><Globe size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Intérêts ({interests.length})</h2>
                  <div className="interest-tags">
                    {interests.map((i: ProfileInterest) => (
                      <span key={i.id} className="interest-tag">{i.name}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Communication Preferences */}
              {comms && (
                <div className="profile-section">
                  <h2><Mail size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Préférences de communication</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                    {Object.entries(comms)
                      .filter(([k, v]: [string, unknown]) => v === true && k !== 'id' && k !== 'memberId')
                      .map(([k]) => (
                        <div key={k} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '12px 16px',
                          background: 'var(--background)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)',
                        }}>
                          <span style={{
                            color: 'var(--primary)',
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}>
                            {commPrefIcon(k, 18)}
                          </span>
                          <span style={{ fontSize: 14, fontWeight: 500 }}>{commPrefLabel(k)}</span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}

              {/* Goal Gradient - Next Steps */}
              <div className="profile-section" style={{ background: 'linear-gradient(135deg, var(--card) 0%, #f0fdf4 100%)', border: '1px solid #bbf7d0' }}>
                <h2 style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 8 }}><Target size={18} style={{ marginRight: 8, verticalAlign: 'middle', color: '#16a34a' }} /> Prochaines étapes</h2>
                <p style={{ fontSize: 14, color: 'var(--muted-foreground)', marginBottom: 20 }}>
                  Continue à enrichir ton profil et connecte-toi avec la communauté.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  <button
                    className="secondary-button"
                    onClick={() => router.push('/members')}
                    style={{ justifyContent: 'flex-start', padding: '16px', height: 'auto', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Users size={16} style={{ color: 'var(--primary)' }} />
                      <span style={{ fontWeight: 700 }}>Découvrir les membres</span>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>Explore l'annuaire et trouve des collaborateurs</span>
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => setEditMode(true)}
                    style={{ justifyContent: 'flex-start', padding: '16px', height: 'auto', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Edit3 size={16} style={{ color: 'var(--primary)' }} />
                      <span style={{ fontWeight: 700 }}>Compléter ton profil</span>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>Ajoute ta bio, photo et LinkedIn</span>
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => router.push('/onboarding')}
                    style={{ justifyContent: 'flex-start', padding: '16px', height: 'auto', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ArrowRight size={16} style={{ color: 'var(--primary)' }} />
                      <span style={{ fontWeight: 700 }}>Modifier mes pôles</span>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>Change tes domaines ou niveaux</span>
                  </button>
                </div>
              </div>

              {/* Empty State */}
              {poles.length === 0 && interests.length === 0 && (
                <div className="profile-section" style={{ textAlign: 'center', padding: '48px 24px' }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      background: 'var(--primary-glow, rgba(181, 61, 31, 0.08))',
                      color: 'var(--primary)',
                      marginBottom: 16,
                    }}
                  >
                    <Sparkles size={32} strokeWidth={1.75} />
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Bienvenue sur HASHCODE</h3>
                  <p style={{ color: 'var(--muted-foreground)', marginBottom: 32, maxWidth: 400, margin: '0 auto 32px' }}>
                    Complète ton profil en 3 étapes pour rejoindre la communauté.
                  </p>
                  <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'var(--background)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>1</span>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>Choisis tes pôles</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'var(--background)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>2</span>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>Ajoute tes intérêts</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'var(--background)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>3</span>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>Définis tes notifs</span>
                    </div>
                  </div>
                  <button className="primary-button" onClick={() => router.push('/onboarding')}>
                    Compléter mon profil <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </>
          ) : (
            /* ── EDIT MODE ──────────────────────────────── */
            <>
              <div className="profile-section">
                <h2><User size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Informations personnelles</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>Prénom</label>
                    <input
                      className="form-input"
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      placeholder="Ton prénom"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>Nom</label>
                    <input
                      className="form-input"
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      placeholder="Ton nom"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>Âge</label>
                    <input
                      className="form-input"
                      type="number"
                      value={form.age}
                      onChange={(e) => setForm({ ...form, age: e.target.value })}
                      placeholder="25"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>Pays</label>
                    <input
                      className="form-input"
                      value={form.country}
                      onChange={(e) => setForm({ ...form, country: e.target.value })}
                      placeholder="Cameroun"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>Ville</label>
                    <input
                      className="form-input"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="Douala"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>Téléphone</label>
                    <input
                      className="form-input"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+237 6XX XXX XXX"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>Genre</label>
                    <select
                      className="form-input"
                      value={form.gender}
                      onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    >
                      {GENDERS.map((g) => (
                        <option key={g.id} value={g.id}>{g.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="profile-section">
                <h2><Briefcase size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Profil professionnel</h2>
                <div style={{ display: 'grid', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>LinkedIn URL</label>
                    <input
                      className="form-input"
                      value={form.linkedinUrl}
                      onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })}
                      placeholder="https://linkedin.com/in/ton-profil"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>Bio</label>
                    <textarea
                      className="form-input"
                      rows={3}
                      value={form.bio}
                      onChange={(e) => setForm({ ...form, bio: e.target.value })}
                      placeholder="Parle de toi, de ton parcours, de ce qui te passionne..."
                      style={{ resize: 'vertical', minHeight: 80 }}
                    />
                  </div>
                </div>
              </div>

              <div className="profile-section">
                <h2><Mail size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Préférences de communication</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.05em' }}>Pôles HASHCODE</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {(['security', 'ai', 'cloud'] as const).map((key) => (
                        <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: `1px solid ${commPrefs[key] ? 'var(--primary)' : 'var(--border)'}`, background: commPrefs[key] ? '#fef2f2' : 'transparent', transition: 'all .15s' }}>
                          <button
                            type="button"
                            className={`toggle ${commPrefs[key] ? 'active' : ''}`}
                            aria-pressed={commPrefs[key]}
                            aria-label={poleLabel(key)}
                            onClick={() => setCommPrefs({ ...commPrefs, [key]: !commPrefs[key] })}
                          />
                          <span style={{ fontSize: 14, fontWeight: 500 }}>{poleLabel(key)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.05em' }}>Activités</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {(['training', 'workshops', 'opportunities', 'projects'] as const).map((key) => (
                        <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: `1px solid ${commPrefs[key] ? 'var(--primary)' : 'var(--border)'}`, background: commPrefs[key] ? '#f0fdf4' : 'transparent', transition: 'all .15s' }}>
                          <button
                            type="button"
                            className={`toggle ${commPrefs[key] ? 'active' : ''}`}
                            aria-pressed={commPrefs[key]}
                            aria-label={commPrefLabel(key)}
                            onClick={() => setCommPrefs({ ...commPrefs, [key]: !commPrefs[key] })}
                          />
                          <span style={{ fontSize: 14, fontWeight: 500 }}>{commPrefLabel(key)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{
                position: 'sticky', bottom: 0, left: 0, right: 0,
                padding: '16px 24px env(safe-area-inset-bottom)',
                background: 'var(--card)', borderTop: '1px solid var(--border)',
                display: 'flex', justifyContent: 'flex-end', gap: '12px',
                zIndex: 10,
                boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
              }}>
                <button className="text-button" onClick={() => { setEditMode(false); fetchProfile() }}>
                  Annuler
                </button>
                <button className="primary-button" onClick={handleSave} disabled={saving}>
                  {saving ? <><Loader2 className="animate-spin" size={16} /> Sauvegarde…</> : <><Check size={16} /> Sauvegarder</>}
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}