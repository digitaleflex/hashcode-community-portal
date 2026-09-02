'use client'

import { useState, useEffect } from 'react'
import { ArrowRight, LockKeyhole, Search, AlertCircle, X, CheckCircle2, Loader2, Mail, Shield, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { fetchCommunityStats, type CommunityStats } from '@/lib/client-stats'

type VerifyState = 'idle' | 'checking' | 'found' | 'not_found' | 'sending'

export default function AuthVerify() {
  const [email, setEmail] = useState('')
  const [method, setMethod] = useState<'otp' | 'magic_link'>('otp')
  const [verifyState, setVerifyState] = useState<VerifyState>('idle')
  const [memberInfo, setMemberInfo] = useState<{ firstName: string; lastName: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<CommunityStats | null>(null)
  const router = useRouter()

  const isState = (state: VerifyState): boolean => verifyState === state

  useEffect(() => {
    fetch('/api/auth/session', {
      credentials: 'include'
    }).then(async (res) => {
      const data = await res.json()
      if (data.authenticated) {
        router.push('/profile')
      }
    })
  }, [router])

  useEffect(() => {
    fetchCommunityStats().then(setStats).catch(() => {})
  }, [])

  const memberCount = stats ? stats.total : null

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setError(null)
    setVerifyState('checking')

    try {
      const res = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      })
      const data = await res.json()

      if (res.ok) {
        if (data.exists) {
          setMemberInfo({ firstName: data.firstName, lastName: data.lastName })
          setVerifyState('found')
        } else {
          setVerifyState('not_found')
        }
      } else {
        setError(data.error || 'Erreur')
        setVerifyState('idle')
      }
    } catch (err) {
      setError('Erreur réseau')
      setVerifyState('idle')
    }
  }

  const handleSendCode = async () => {
    setError(null)
    setVerifyState('sending')

    try {
      sessionStorage.setItem('verify_email', email.trim().toLowerCase())
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), method })
      })
      const data = await res.json()

      if (res.ok) {
        if (data.method === 'magic_link') {
          router.push('/auth/magic-link')
        } else {
          router.push('/auth/verify-otp')
        }
      } else {
        setError(data.error || 'Erreur')
        setVerifyState('found')
      }
    } catch (err) {
      setError('Erreur réseau')
      setVerifyState('found')
    }
  }

  const handleReset = () => {
    setVerifyState('idle')
    setError(null)
    setMemberInfo(null)
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="site-header">
        <div className="brand"><span className="brand-mark">H</span><span>HASHCODE</span></div>
        {isState('checking') || isState('found') || isState('not_found') ? (
          <button className="text-button" onClick={handleReset}>Changer d'email</button>
        ) : null}
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="progress-bar">
            <div className={`progress-step ${isState('idle') || isState('checking') ? 'active' : ''}`}>
              <span className="step-dot">1</span>
              <span className="step-label">Vérification</span>
            </div>
            <div className="progress-line"></div>
            <div className={`progress-step ${isState('found') || isState('not_found') ? 'active' : ''}`}>
              <span className="step-dot">2</span>
              <span className="step-label">Authentification</span>
            </div>
          </div>

          <div className="verify-states">
            {isState('idle') && (
              <div className="verify-state-enter">
                <p className="eyebrow">Étape 01 / 02</p>
                <h1>Retrouve ton<br /><em>profil HASHCODE.</em></h1>
                <p className="hero-text">
                  Entre ton adresse email pour vérifier si tu fais déjà partie de nos {memberCount !== null ? `${memberCount}` : '…'} membres historiques.
                </p>

                {error && (
                  <div className="error-banner">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleCheck} className="form-stack">
                  <div className="form-group">
                    <div className="form-group-header">
                      <label htmlFor="email" className="form-label">
                        Adresse email <span className="required">*</span>
                      </label>
                      <span className="form-label-hint">Privé et sécurisé</span>
                    </div>
                    <div className="input-group has-icon-left">
                      <Mail size={18} className="input-icon-left" />
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nom.prenom@email.com"
                        autoFocus
                        required
                        className="input-premium"
                        disabled={verifyState === 'checking'}
                      />
                    </div>
                    {error && (
                      <div className="form-feedback error">
                        <AlertCircle size={14} className="icon" />
                        <span>{error}</span>
                      </div>
                    )}
                  </div>

                  <div className="form-actions">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ width: '100%' }}
                      disabled={!email.trim() || verifyState === 'checking'}
                    >
                      {verifyState === 'checking' ? (
                        <span className="button-loading">
                          <Loader2 className="animate-spin" size={18} />
                          Vérification...
                        </span>
                      ) : (
                        <>
                          Vérifier mon profil <ArrowRight size={18} />
                        </>
                      )}
                    </button>
                  </div>
                </form>

                <p className="microcopy">
                  <Search size={14} /> Recherche sécurisée dans notre base
                </p>
              </div>
            )}

            {isState('checking') && (
              <div className="loading-state">
                <Loader2 className="animate-spin" size={48} />
                <h2>Recherche en cours...</h2>
                <p>On vérifie si <strong>{email}</strong> est dans notre base de {memberCount !== null ? memberCount : '…'} membres.</p>
              </div>
            )}

            {isState('found') && memberInfo && (
              <div className="verify-state-enter">
                <div className="success-animation">
                  <CheckCircle2 size={64} className="success-icon" />
                </div>
                <p className="eyebrow success">✓ Profil trouvé</p>
                <h1>Bonjour<br /><em>{memberInfo.firstName || 'membre'} !</em></h1>
                <div className="success-banner">
                  <CheckCircle2 size={20} />
                  <div>
                    <strong>Tu fais partie de HASHCODE</strong>
                    <p>On a retrouvé ton profil dans nos archives. Choisis comment recevoir ton code de connexion.</p>
                  </div>
                </div>

                {error && (
                  <div className="error-banner">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                  </div>
                )}

                <div className="choice-group">
                  <label className={`choice-item ${method === 'otp' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="method"
                      value="otp"
                      checked={method === 'otp'}
                      onChange={() => setMethod('otp')}
                      className="choice-input"
                    />
                    <div className="choice-content">
                      <Shield size={24} style={{ color: 'var(--primary)', marginBottom: '8px' }} />
                      <span className="choice-label">Code à 6 chiffres</span>
                      <span className="choice-description">Reçu par email, valable 10 minutes</span>
                    </div>
                  </label>
                  <label className={`choice-item ${method === 'magic_link' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="method"
                      value="magic_link"
                      checked={method === 'magic_link'}
                      onChange={() => setMethod('magic_link')}
                      className="choice-input"
                    />
                    <div className="choice-content">
                      <LockKeyhole size={24} style={{ color: 'var(--primary)', marginBottom: '8px' }} />
                      <span className="choice-label">Lien magique</span>
                      <span className="choice-description">Clique directement, valable 15 minutes</span>
                    </div>
                  </label>
                </div>

                <div className="form-actions">
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={handleSendCode}
                    disabled={verifyState === 'sending'}
                  >
                    {verifyState === 'sending' ? (
                      <span className="button-loading">
                        <Loader2 className="animate-spin" size={18} />
                        Envoi en cours...
                      </span>
                    ) : (
                      <>Envoyer le {method === 'otp' ? 'code' : 'lien'} <ArrowRight size={18} /></>
                    )}
                  </button>
                </div>
              </div>
            )}

            {isState('not_found') && (
              <div className="verify-state-enter">
                <div className="info-animation">
                  <AlertCircle size={64} className="info-icon" />
                </div>
                <p className="eyebrow">Nouveau profil</p>
                <h1>Tu es<br /><em>nouveau ici.</em></h1>
                <div className="info-banner">
                  <X size={20} />
                  <div>
                    <strong>Aucun profil historique trouvé</strong>
                    <p>L'email <strong>{email}</strong> n'est pas dans nos archives de {memberCount !== null ? memberCount : '…'} membres. Tu peux rejoindre la nouvelle communauté HASHCODE.</p>
                  </div>
                </div>

                <div className="choice-group">
                  <label className={`choice-item ${method === 'otp' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="method"
                      value="otp"
                      checked={method === 'otp'}
                      onChange={() => setMethod('otp')}
                      className="choice-input"
                    />
                    <div className="choice-content">
                      <Shield size={24} style={{ color: 'var(--primary)', marginBottom: '8px' }} />
                      <span className="choice-label">Code à 6 chiffres</span>
                      <span className="choice-description">Pour créer ton profil</span>
                    </div>
                  </label>
                  <label className={`choice-item ${method === 'magic_link' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="method"
                      value="magic_link"
                      checked={method === 'magic_link'}
                      onChange={() => setMethod('magic_link')}
                      className="choice-input"
                    />
                    <div className="choice-content">
                      <LockKeyhole size={24} style={{ color: 'var(--primary)', marginBottom: '8px' }} />
                      <span className="choice-label">Lien magique</span>
                      <span className="choice-description">Inscription en un clic</span>
                    </div>
                  </label>
                </div>

                <div className="form-actions">
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={handleSendCode}
                    disabled={verifyState === 'sending'}
                  >
                    {verifyState === 'sending' ? (
                      <span className="button-loading">
                        <Loader2 className="animate-spin" size={18} />
                        Envoi en cours...
                      </span>
                    ) : (
                      <>Créer mon profil <ArrowRight size={18} /></>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          <p className="microcopy">
            <LockKeyhole size={14} /> Tes données restent privées et sécurisées
          </p>
        </div>
      </section>

      <footer className="footer">
        <div className="brand"><span className="brand-mark">H</span><span>HASHCODE</span></div>
        <span>© 2026 HASHCODE Community</span>
      </footer>
    </main>
  )
}