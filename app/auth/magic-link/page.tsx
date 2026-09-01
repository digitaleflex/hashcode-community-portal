'use client'

import { useEffect, useState } from 'react'
import { Check, ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AuthMagicLink() {
  const [resent, setResent] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('resent') === 'true') {
      setResent(true)
    }
  }, [])

  const resend = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'eflexcloud@gmail.com', method: 'magic_link' })
      })
      if (res.ok) {
        setResent(true)
      }
    } catch (err) {
      console.error('Resend error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="site-header"><div className="brand"><span className="brand-mark">H</span><span>HASHCODE</span></div></header>
      <div className="onboarding">
        <div className="onboarding-wrap">
          <div className="form-panel" style={{ textAlign: 'center', maxWidth: '480px', margin: '0 auto' }}>
            {resent ? (
              <>
                <div style={{ width: '64px', height: '64px', margin: '0 auto 24px', background: '#16a34a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={32} color="white" />
                </div>
                <h1>Lien envoyé !</h1>
                <p>Un nouveau lien de connexion a été envoyé à ton email. Il expire dans 15 minutes.</p>
                <button className="secondary-button" onClick={() => router.push('/auth/verify')}>
                  Retour à la connexion
                </button>
              </>
            ) : (
              <>
                <div style={{ width: '64px', height: '64px', margin: '0 auto 24px', background: '#1a1a2e', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <LockKeyhole size={32} color="white" />
                </div>
                <h1>Connexion par lien magique</h1>
                <p>Un lien de connexion a été envoyé à ton email. Clique dessus pour te connecter.</p>
                <p className="microcopy"><ShieldCheck size={14} /> Le lien expire dans 15 minutes</p>
                <button className="secondary-button" onClick={resend} disabled={loading}>
                  {loading ? 'Envoi...' : 'Renvoyer le lien'}
                </button>
                <button className="text-button" style={{ marginLeft: '16px' }} onClick={() => router.push('/auth/verify')}>
                  Retour
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      <footer className="footer"><div className="brand"><span className="brand-mark">H</span><span>HASHCODE</span></div><span>© 2024 HASHCODE · La communauté qui vous ressemble.</span></footer>
    </main>
  )
}