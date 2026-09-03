'use client'

import { useEffect, useState } from 'react'
import { Check, LockKeyhole, ShieldCheck, AlertCircle, Loader2, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

type MagicLinkState = 'checking' | 'valid' | 'invalid' | 'expired' | 'used' | 'sent'

export default function AuthMagicLink() {
  const router = useRouter()
  const [state, setState] = useState<MagicLinkState>('checking')
  const [error, setError] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')

    // Email is only present on the ?sent=1 flow; fall back to what the
    // verify page stored so "Renvoyer un lien" also works after expiry.
    const savedEmail = params.get('email') || sessionStorage.getItem('verify_email')
    if (savedEmail) setEmail(savedEmail)

    if (token) {
      verifyToken(token)
    } else {
      const sent = params.get('sent')
      if (sent === '1') {
        setState('sent')
      } else {
        router.replace('/auth/verify')
      }
    }
  }, [router])

  const verifyToken = async (token: string) => {
    try {
      const res = await fetch(`/api/auth/verify-magic-link?token=${encodeURIComponent(token)}`, {
        credentials: 'include'
      })

      if (res.status === 410) {
        setState('expired')
        return
      }

      if (res.status === 409) {
        setState('used')
        return
      }

      if (res.ok) {
        const data = await res.json()
        setState('valid')
        setTimeout(() => {
          router.push(data.redirect || '/profile')
        }, 1500)
      } else {
        setState('invalid')
      }
    } catch (err) {
      setState('invalid')
      setError('Erreur réseau')
    }
  }

  const resendLink = async () => {
    if (!email) return

    setResending(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      if (res.ok) {
        setState('sent')
      } else {
        const data = await res.json()
        setError(data.error || 'Erreur')
      }
    } catch (err) {
      setError('Erreur réseau')
    } finally {
      setResending(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="site-header">
        <div className="brand"><span className="brand-mark">H</span><span>HASHCODE</span></div>
        {state !== 'checking' && (
          <button className="text-button" onClick={() => router.push('/auth/verify')}>
            Retour
          </button>
        )}
      </header>

      <div className="onboarding">
        <div className="onboarding-wrap">
          <div className="magic-link-panel">
            <div
              className={`magic-link-state checking ${state === 'checking' ? 'active' : ''}`}
            >
              <div className="magic-icon loading">
                <Loader2 size={32} className="animate-spin" />
              </div>
              <h1>Vérification<br /><em>en cours...</em></h1>
              <p className="magic-link-text">
                On vérifie ton lien de connexion.
              </p>
            </div>

            <div
              className={`magic-link-state valid ${state === 'valid' ? 'active' : ''}`}
            >
              <div className="magic-icon success">
                <Check size={32} />
              </div>
              <h1>Bienvenue !</h1>
              <p className="magic-link-text">
                Connexion réussie. Redirection vers ton profil...
              </p>
            </div>

            <div
              className={`magic-link-state expired ${state === 'expired' ? 'active' : ''}`}
            >
              <div className="magic-icon error">
                <AlertCircle size={32} />
              </div>
              <h1>Lien expiré</h1>
              <p className="magic-link-text">
                Ce lien de connexion a expiré (valable 15 minutes).
              </p>
              {error && <div className="error-banner">{error}</div>}
              <button
                className="primary-button"
                onClick={resendLink}
                disabled={resending || !email}
              >
                {resending ? <Loader2 size={18} className="spin" /> : 'Renvoyer un lien'}
              </button>
            </div>

            <div
              className={`magic-link-state used ${state === 'used' ? 'active' : ''}`}
            >
              <div className="magic-icon warning">
                <AlertCircle size={32} />
              </div>
              <h1>Lien déjà utilisé</h1>
              <p className="magic-link-text">
                Ce lien a déjà été utilisé. Demande un nouveau lien.
              </p>
              <button
                className="primary-button"
                onClick={() => router.push('/auth/verify')}
              >
                Retour à la connexion <ArrowRight size={18} />
              </button>
            </div>

            <div
              className={`magic-link-state invalid ${state === 'invalid' ? 'active' : ''}`}
            >
              <div className="magic-icon error">
                <AlertCircle size={32} />
              </div>
              <h1>Lien invalide</h1>
              <p className="magic-link-text">
                Ce lien n'est pas valide. Il a peut-être été modifié.
              </p>
              <button
                className="primary-button"
                onClick={() => router.push('/auth/verify')}
              >
                Retour à la connexion <ArrowRight size={18} />
              </button>
            </div>

            <div
              className={`magic-link-state sent ${state === 'sent' ? 'active' : ''}`}
            >
              <div className="magic-icon sent">
                <LockKeyhole size={32} />
              </div>
              <h1>Lien envoyé !</h1>
              <p className="magic-link-text">
                {email
                  ? `Un lien de connexion a été envoyé à ${email}.`
                  : 'Un lien de connexion a été envoyé à ton email.'}
              </p>
              <p className="magic-link-hint">
                <ShieldCheck size={14} /> Le lien expire dans 15 minutes
              </p>
              <button
                className="primary-button"
                onClick={resendLink}
                disabled={resending || !email}
              >
                {resending ? 'Envoi...' : 'Renvoyer le lien'}
              </button>
              <button
                className="text-button magic-link-alt"
                onClick={() => router.push('/auth/verify')}
              >
                Utiliser un autre email
              </button>
            </div>
          </div>
        </div>
      </div>

      <footer className="footer">
        <div className="brand"><span className="brand-mark">H</span><span>HASHCODE</span></div>
        <span>© 2026 HASHCODE Community</span>
      </footer>
    </main>
  )
}