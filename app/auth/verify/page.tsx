'use client'

import { useState, useEffect } from 'react'
import { ArrowRight, LockKeyhole, Search, AlertCircle, X, CheckCircle2, Loader2, Mail, Shield, ArrowLeft, Sparkles, UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { fetchCommunityStats, type CommunityStats } from '@/lib/client-stats'
import { Hero } from '@/components/Hero'
import { AuthMethodChooser } from '@/components/AuthMethodChooser'

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

    const normalizedEmail = email.trim().toLowerCase()
    setError(null)
    setVerifyState('checking')

    // 10s timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    try {
      const res = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      const data = await res.json()

      if (res.ok) {
        // 3.8: réponse uniforme — aucune distinction existant/inexistant.
        // On enchaîne directement l'envoi générique (verify-email, déjà uniforme).
        await handleSendCode()
      } else {
        setError(data.error || 'Erreur')
        setVerifyState('idle')
      }
    } catch (err) {
      clearTimeout(timeoutId)
      if ((err as Error).name === 'AbortError') {
        setError('Vérification trop longue. Vérifie ta connexion.')
      } else {
        setError('Erreur réseau')
      }
      setVerifyState('idle')
    }
  }

  const handleSendCode = async () => {
    setError(null)
    setVerifyState('sending')

    const normalizedEmail = email.trim().toLowerCase()

    try {
      sessionStorage.setItem('verify_email', normalizedEmail)
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, method })
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
        setVerifyState('idle')
      }
    } catch (err) {
      setError('Erreur réseau')
      setVerifyState('idle')
    }
  }

  const handleReset = () => {
    setVerifyState('idle')
    setError(null)
    setMemberInfo(null)
  }

  // State-specific content
  const renderContent = () => {
    if (isState('idle')) {
      return (
        <div className="verify-state-enter">
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
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
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
        </div>
      )
    }

    if (isState('checking')) {
      return (
        <div className="loading-state">
          <Loader2 className="animate-spin" size={48} />
          <h2>Recherche en cours...</h2>
          <p>On vérifie si <strong>{email}</strong> est dans notre base de {memberCount !== null ? memberCount : '…'} membres.</p>
        </div>
      )
    }

    if (isState('found') && memberInfo) {
      return (
        <div className="verify-state-enter">
          <div className="success-animation">
            <CheckCircle2 size={64} className="success-icon" />
          </div>
          <p className="eyebrow success">✓ Profil trouvé</p>
          <h1>Content de te revoir<br /><em>{memberInfo.firstName || ''} {memberInfo.lastName || ''}</em></h1>
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

          <AuthMethodChooser method={method} onChange={setMethod} purpose="login" />

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
      )
    }

    if (isState('not_found')) {
      return (
        <div className="verify-state-enter">
          <div className="info-animation">
            <Sparkles size={64} className="success-icon" style={{ color: 'var(--primary)' }} />
          </div>
          <p className="eyebrow success">Bienvenue</p>
          <h1>Tu es<br /><em>nouveau ici.</em></h1>
          <div className="success-banner success-banner-info">
            <UserPlus size={20} />
            <div>
              <strong>Rejoins la communauté HASHCODE</strong>
              <p>L'email <strong>{email}</strong> n'est pas encore dans nos archives. Crée ton profil en quelques secondes.</p>
            </div>
          </div>

          <AuthMethodChooser method={method} onChange={setMethod} purpose="signup" />

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
      )
    }

    return null
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="site-header">
        <div className="brand"><span className="brand-mark">H</span><span>HASHCODE</span></div>
        {isState('checking') || isState('found') || isState('not_found') ? (
          <button className="text-button" onClick={handleReset}>Changer d'email</button>
        ) : null}
      </header>

      <Hero
        eyebrow={isState('idle') ? 'Étape 01 / 02' : isState('checking') ? 'Étape 01 / 02' : 'Étape 02 / 02'}
        title={
          <>
            {isState('idle') && 'Retrouve ton<br /><em>profil HASHCODE.</em>'}
            {isState('checking') && 'Recherche en cours...'}
            {isState('found') && memberInfo && (
              <>Content de te revoir<br /><em>{memberInfo.firstName || ''} {memberInfo.lastName || ''}</em></>
            )}
            {isState('not_found') && 'Tu es<br /><em>nouveau ici.</em>'}
          </>
        }
description={
          isState('idle') 
            ? `Entre ton adresse email pour vérifier si tu fais déjà partie de nos ${memberCount !== null ? `${memberCount}` : '…'} membres historiques.`
            : isState('checking')
              ? `On vérifie si <strong>${email}</strong> est dans notre base de ${memberCount !== null ? memberCount : '…'} membres.`
              : isState('found')
                ? 'On a retrouvé ton profil dans nos archives. Choisis comment recevoir ton code de connexion.'
                : isState('not_found')
                  ? `L'email <strong>${email}</strong> n'est pas encore dans nos archives. Crée ton profil en quelques secondes.`
                  : undefined
        }
        microcopy="Tes données restent privées et sécurisées"
        microcopyIcon={<LockKeyhole size={14} />}
      >
        {renderContent()}
      </Hero>

      <footer className="footer">
        <div className="brand"><span className="brand-mark">H</span><span>HASHCODE</span></div>
        <span>© 2026 HASHCODE Community</span>
      </footer>
    </main>
  )
}