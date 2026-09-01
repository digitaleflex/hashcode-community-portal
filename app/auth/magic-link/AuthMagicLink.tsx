'use client'

import { useEffect, useState } from 'react'
import { Check, LockKeyhole, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react'
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

    if (token) {
      verifyToken(token)
    } else {
      const sent = params.get('sent')
      if (sent === '1') {
        setState('sent')
        const sentEmail = params.get('email')
        if (sentEmail) setEmail(sentEmail)
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
        setState('valid')
        setTimeout(() => {
          router.push('/profile')
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
          <div className="form-panel" style={{ textAlign: 'center', maxWidth: '480px', margin: '0 auto' }}>

            {state === 'checking' && (
              <>
                <div style={{ width: '64px', height: '64px', margin: '0 auto 24px', border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <h1>Vérification<br /><em>en cours...</em></h1>
                <p style={{ color: 'var(--muted-foreground)' }}>
                  On vérifie ton lien de connexion.
                </p>
              </>
            )}

            {state === 'valid' && (
              <>
                <div style={{ width: '64px', height: '64px', margin: '0 auto 24px', background: '#16a34a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={32} color="white" />
                </div>
                <h1>Bienvenue !</h1>
                <p style={{ color: 'var(--muted-foreground)' }}>
                  Connexion réussie. Redirection vers ton profil...
                </p>
              </>
            )}

            {state === 'expired' && (
              <>
                <div style={{ width: '64px', height: '64px', margin: '0 auto 24px', background: '#dc2626', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertCircle size={32} color="white" />
                </div>
                <h1>Lien expiré</h1>
                <p style={{ color: 'var(--muted-foreground)', marginBottom: '24px' }}>
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
              </>
            )}

            {state === 'used' && (
              <>
                <div style={{ width: '64px', height: '64px', margin: '0 auto 24px', background: '#f59e0b', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertCircle size={32} color="white" />
                </div>
                <h1>Lien déjà utilisé</h1>
                <p style={{ color: 'var(--muted-foreground)', marginBottom: '24px' }}>
                  Ce lien a déjà été utilisé. Demande un nouveau lien.
                </p>
                <button
                  className="primary-button"
                  onClick={() => router.push('/auth/verify')}
                >
                  Retour à la connexion
                </button>
              </>
            )}

            {state === 'invalid' && (
              <>
                <div style={{ width: '64px', height: '64px', margin: '0 auto 24px', background: '#dc2626', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertCircle size={32} color="white" />
                </div>
                <h1>Lien invalide</h1>
                <p style={{ color: 'var(--muted-foreground)', marginBottom: '24px' }}>
                  Ce lien n'est pas valide. Il a peut-être été modifié.
                </p>
                <button
                  className="primary-button"
                  onClick={() => router.push('/auth/verify')}
                >
                  Retour à la connexion
                </button>
              </>
            )}

            {state === 'sent' && (
              <>
                <div style={{ width: '64px', height: '64px', margin: '0 auto 24px', background: '#1a1a2e', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <LockKeylock size={32} color="white" />
                </div>
                <h1>Lien envoyé !</h1>
                <p style={{ color: 'var(--muted-foreground)', marginBottom: '8px' }}>
                  {email
                    ? `Un lien de connexion a été envoyé à ${email}.`
                    : 'Un lien de connexion a été envoyé à ton email.'
                  }
                </p>
                <p className="microcopy" style={{ marginBottom: '24px' }}>
                  <ShieldCheck size={14} /> Le lien expire dans 15 minutes
                </p>
                <button
                  className="secondary-button"
                  onClick={resendLink}
                  disabled={resending || !email}
                >
                  {resending ? 'Envoi...' : 'Renvoyer le lien'}
                </button>
                <br />
                <button
                  className="text-button"
                  style={{ marginTop: '16px' }}
                  onClick={() => router.push('/auth/verify')}
                >
                  Utiliser un autre email
                </button>
              </>
            )}

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