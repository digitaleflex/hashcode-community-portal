'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Shield, Brain, Cloud, ArrowLeft, Mail, MapPin, Calendar, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { fetchCommunityStats, type CommunityStats } from '@/lib/client-stats'

const poleIcon = (slug: string) => {
  switch (slug) {
    case 'security': return <Shield size={20} />
    case 'ai': return <Brain size={20} />
    case 'cloud': return <Cloud size={20} />
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

export default function PublicProfilePage() {
  const params = useParams()
  const router = useRouter()
  const [member, setMember] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<CommunityStats | null>(null)

  useEffect(() => {
    if (params.id) {
      fetchMember(params.id as string)
    }
    fetchCommunityStats().then(setStats).catch(() => {})
  }, [params.id])

  const fetchMember = async (id: string) => {
    try {
      const res = await fetch(`/api/members/${id}`)
      if (!res.ok) throw new Error('Membre non trouvé')
      const data = await res.json()
      setMember(data)
    } catch (err) {
      setError('Ce membre n\'existe pas ou a été supprimé.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div style={{ textAlign: 'center', padding: '120px' }}>Chargement...</div>
      </main>
    )
  }

  if (error || !member?.member) {
    return (
      <main className="min-h-screen bg-background">
        <header className="site-header">
          <div className="brand"><span className="brand-mark">H</span><span>HASHCODE</span></div>
          <button className="text-button" onClick={() => router.push('/members')}>
            <ArrowLeft size={16} /> Retour à l'annuaire
          </button>
        </header>
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '16px' }}>404</h1>
          <p style={{ color: 'var(--muted-foreground)', marginBottom: '24px' }}>
            {error || 'Ce profil n\'existe pas.'}
          </p>
          <button className="primary-button" onClick={() => router.push('/members')}>
            <ArrowLeft size={18} /> Retour à l'annuaire
          </button>
        </div>
      </main>
    )
  }

  const m = member.member
  const profile = member.profile
  const poles = member.poles || []
  const interests = member.interests || []
  const commPrefs = member.communicationPrefs

  const initials = (m.firstName?.[0] || m.email[0]).toUpperCase() + (m.lastName?.[0] || '').toUpperCase()
  const fullName = [m.firstName, m.lastName].filter(Boolean).join(' ') || 'Membre HASHCODE'

  return (
    <main className="min-h-screen bg-background">
      <header className="site-header">
        <div className="brand"><span className="brand-mark">H</span><span>HASHCODE</span></div>
        <div className="header-actions">
          <button className="text-button" onClick={() => router.push('/members')}>
            <ArrowLeft size={16} /> Annuaire
          </button>
          <button className="text-button" onClick={() => router.push('/profile')}>Mon profil</button>
        </div>
      </header>

      <div className="onboarding-wrap">
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {/* Profile Header */}
          <div className="profile-header" style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '40px',
            marginBottom: '32px',
            textAlign: 'center'
          }}>
            <div className="avatar" style={{
              width: '80px',
              height: '80px',
              fontSize: '28px',
              margin: '0 auto 20px',
              background: 'var(--primary)',
              color: 'var(--primary-foreground)',
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
            }}>
              {initials}
            </div>
            <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>{fullName}</h1>
            <p style={{ color: 'var(--muted-foreground)', marginBottom: '16px' }}>{m.email}</p>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
              {m.country && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--muted-foreground)', fontSize: '14px' }}>
                  <MapPin size={16} /> {m.country}
                </span>
              )}
              <span className={`status ${m.status === 'active' ? 'active' : 'pending'}`}>
                {m.status === 'active' ? '✓ Membre actif' : 'En attente'}
              </span>
            </div>

            {profile?.bio && (
              <p style={{ marginTop: '20px', color: 'var(--foreground)', lineHeight: '1.6' }}>
                {profile.bio}
              </p>
            )}

            {profile?.linkedinUrl && (
              <a 
                href={profile.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginTop: '16px',
                  color: 'var(--primary)',
                  fontSize: '14px',
                  fontWeight: 600
                }}
              >
                <Mail size={16} /> Voir le profil LinkedIn
              </a>
            )}
          </div>

          {/* Pôles */}
          {poles.length > 0 && (
            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Pôles HASHCODE</h2>
              <div className="pole-list">
                {poles.map((p: any) => (
                  <div key={p.id || p.pole?.slug} className="pole-row" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '20px',
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    marginBottom: '12px'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      background: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      display: 'grid',
                      placeItems: 'center'
                    }}>
                      {poleIcon(p.pole?.slug || p.slug)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <b>{poleLabel(p.pole?.slug || p.slug)}</b>
                      <div style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '4px' }}>
                        Niveau : {levelLabel(p.level)}
                      </div>
                    </div>
                    <span className="level-tag">{levelLabel(p.level)}</span>
                    {p.isPrimary && <span className="primary-tag">Principal</span>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Intérêts */}
          {interests.length > 0 && (
            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Centres d'intérêt</h2>
              <div className="tags">
                {interests.map((i: any) => (
                  <span key={i.id || i} className="tag">{i.name || i}</span>
                ))}
              </div>
            </section>
          )}

          {/* Informations */}
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>À propos</h2>
            <dl className="profile-dl">
              {m.age && <><dt>Âge</dt><dd>{m.age} ans</dd></>}
              {m.city && <><dt>Ville</dt><dd>{m.city}</dd></>}
              {profile?.occupation && <><dt>Statut</dt><dd>{profile.occupation}</dd></>}
              {profile?.timeAvailable && <><dt>Disponibilité</dt><dd>{profile.timeAvailable}h/semaine</dd></>}
              <dt>Membre depuis</dt>
              <dd style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={14} /> {new Date(m.createdAt || Date.now()).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })}
              </dd>
            </dl>
          </section>

          {/* CTA */}
          <div style={{
            background: 'var(--foreground)',
            color: 'var(--primary-foreground)',
            padding: '32px',
            borderRadius: '16px',
            textAlign: 'center'
          }}>
            <h3 style={{ marginBottom: '12px' }}>Tu veux rejoindre HASHCODE ?</h3>
            <p style={{ opacity: 0.8, marginBottom: '20px', fontSize: '14px' }}>
              Découvre les {stats ? stats.total : '…'} membres de notre communauté et inscris-toi pour participer aux prochains événements.
            </p>
            <button className="primary-button" onClick={() => router.push('/auth/verify')} style={{ background: 'var(--primary-foreground)', color: 'var(--foreground)' }}>
              Vérifier mon profil <ArrowLeft size={18} style={{ transform: 'rotate(180deg)' }} />
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}