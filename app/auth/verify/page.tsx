'use client'

import { useState, useEffect } from 'react'
import { ArrowRight, Check, LockKeyhole, Search, AlertCircle, X, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

type VerifyState = 'idle' | 'checking' | 'found' | 'not_found' | 'sending'

export default function AuthVerifyEmail() {
  const [email, setEmail] = useState('')
  const [method, setMethod] = useState<'otp' | 'magic_link'>('otp')
  const [verifyState, setVerifyState] = useState<VerifyState>('idle')
  const [memberInfo, setMemberInfo] = useState<{ firstName: string; lastName: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

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

  const isState = (state: VerifyState): boolean => verifyState === state

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
          {isState('idle') && (
            <>
              <p className="eyebrow">Étape 01 / 02</p>
              <h1>Retrouve ton<br /><em>profil HASHCODE.</em></h1>
              <p className="hero-text">
                Entre ton adresse email pour vérifier si tu fais déjà partie de nos 181 membres historiques.
              </p>

              {error && (
                <div className="error-banner">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleCheck}>
                <label>Adresse email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.fr"
                  autoFocus
                  required
                />
                <button
                  type="submit"
                  className="primary-button"
                  disabled={!email.trim() || isState('checking')}
                >
                  {isState('checking') ? (
                    <>Vérification...</>
                  ) : (
                    <>
                      Vérifier mon profil <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              <p className="microcopy">
                <Search size={14} /> Recherche sécurisée dans notre base
              </p>
            </>
          )}

          {isState('checking') && (
            <>
              <p className="eyebrow">Vérification en cours</p>
              <h1>Recherche de<br /><em>ton profil...</em></h1>
              <div className="loading-state">
                <div className="spinner" />
                <p>On vérifie si <strong>{email}</strong> est dans notre base de 181 membres.</p>
              </div>
            </>
          )}

          {isState('found') && memberInfo && (
            <>
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

              <div className="method-selector">
                <button
                  className={method === 'otp' ? 'method-card selected' : 'method-card'}
                  onClick={() => setMethod('otp')}
                  type="button"
                >
                  <b>Code à 6 chiffres</b>
                  <span>Reçu par email, valable 10 minutes</span>
                </button>
                <button
                  className={method === 'magic_link' ? 'method-card selected' : 'method-card'}
                  onClick={() => setMethod('magic_link')}
                  type="button"
                >
                  <b>Lien magique</b>
                  <span>Clique directement, valable 15 minutes</span>
                </button>
              </div>

              <button
                className="primary-button"
                onClick={handleSendCode}
                disabled={isState('sending')}
              >
                {isState('sending') ? 'Envoi en cours...' : (
                  <>Envoyer le {method === 'otp' ? 'code' : 'lien'} <ArrowRight size={18} /></>
                )}
              </button>
            </>
          )}

          {isState('not_found') && (
            <>
              <p className="eyebrow">Nouveau profil</p>
              <h1>Tu es<br /><em>nouveau ici.</em></h1>
              <div className="info-banner">
                <X size={20} />
                <div>
                  <strong>Aucun profil historique trouvé</strong>
                  <p>L'email <strong>{email}</strong> n'est pas dans nos archives de 181 membres. Tu peux rejoindre la nouvelle communauté HASHCODE.</p>
                </div>
              </div>

              <div className="method-selector">
                <button
                  className={method === 'otp' ? 'method-card selected' : 'method-card'}
                  onClick={() => setMethod('otp')}
                  type="button"
                >
                  <b>Code à 6 chiffres</b>
                  <span>Pour créer ton profil</span>
                </button>
                <button
                  className={method === 'magic_link' ? 'method-card selected' : 'method-card'}
                  onClick={() => setMethod('magic_link')}
                  type="button"
                >
                  <b>Lien magique</b>
                  <span>Inscription en un clic</span>
                </button>
              </div>

              <button
                className="primary-button"
                onClick={handleSendCode}
                disabled={isState('sending')}
              >
                {isState('sending') ? 'Envoi en cours...' : (
                  <>Créer mon profil <ArrowRight size={18} /></>
                )}
              </button>
            </>
          )}

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