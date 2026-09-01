'use client'

import { useState, useEffect } from 'react'
import { Check, ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AuthVerifyOTP() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Try to get email from session or previous step
    fetch('/api/auth/session', {
      credentials: 'include'
    }).then(async (res) => {
      const data = await res.json()
      if (data.authenticated) {
        router.push('/onboarding')
      }
    })
  }, [router])

  const handleSubmit = async (e: React.MouseEvent | React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      })
      const data = await res.json()

      if (res.ok) {
        router.push('/onboarding')
      } else {
        setError(data.error || 'Erreur')
      }
    } catch (err) {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="site-header"><div className="brand"><span className="brand-mark">H</span><span>HASHCODE</span></div><button className="text-button" onClick={() => router.push('/auth/verify')}>Retour</button></header>
      <div className="onboarding">
        <div className="onboarding-wrap">
          <div className="progress">
            <span>02</span>
            <div>
              <div className="progress-step active">Email</div>
              <div className="progress-step active">Code</div>
              <div className="progress-step">Profil</div>
            </div>
          </div>
          <div className="form-panel">
            <h1>Entrez votre code de vérification</h1>
            {error && (
              <div style={{ color: '#ef4444', marginBottom: '16px' }}>{error}</div>
            )}
            <p>Nous avons envoyé un code à 6 chiffres à l'adresse email indiquée. Vérifiez votre boîte de réception.</p>
            <label>Code de vérification</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              onKeyDown={handleKeyDown}
              placeholder="123456"
              disabled={loading}
              autoFocus
            />
            <button
              className="primary-button"
              onClick={(e) => handleSubmit(e)}
              disabled={loading || !code}
            >
              {loading ? 'Vérification...' : 'Vérifier le code'}
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
      <footer className="footer"><div className="brand"><span className="brand-mark">H</span><span>HASHCODE</span></div><span>© 2024 HASHCODE · La communauté qui vous ressemble.</span></footer>
    </main>
  )
}