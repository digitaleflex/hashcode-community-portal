'use client'

import { useState, useEffect } from 'react'
import { ArrowRight, Check, LockKeyhole, Search, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AuthVerifyEmail() {
  const [email, setEmail] = useState('')
  const [method, setMethod] = useState<'otp' | 'magic_link'>('otp')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Vérifier la session existante
  useEffect(() => {
    fetch('/api/auth/session', {
      credentials: 'include'
    }).then(async (res) => {
      const data = await res.json()
      if (data.authenticated) {
        router.push('/onboarding')
      }
    })
  }, [router])

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, method })
      })
      const data = await res.json()

      if (res.ok) {
        if (data.method === 'magic_link') {
          router.push(`/auth/magic-link?resent=true`)
        } else {
          router.push('/auth/verify-otp')
        }
      } else {
        alert(data.error || 'Erreur')
      }
    } catch (err) {
      alert('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  // Si déjà authentifié, rediriger
  if (method === 'otp' && loading) return null

  return (
    <main className="min-h-screen bg-background">
      <header className="site-header"><div className="brand"><span className="brand-mark">H</span><span>HASHCODE</span></div></header>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Retrouve ton profil</p>
          <h1>Votre engagement.<br/><em>Votre trace.</em></h1>
          <p className="hero-text">HASHCODE crée une empreinte numérique unique pour chaque membre de notre communauté.</p>
          <button className="primary-button" onClick={() => setMethod('magic_link')}>
            Se connecter avec un lien magique
            <ArrowRight size={18} />
          </button>
          <button className="secondary-button" style={{ marginLeft: '16px' }} onClick={() => setMethod('otp')}>
            Se connecter par code
          </button>
          <p className="microcopy"><LockKeyhole size={14} /> Données sécurisées</p>
        </div>
      </section>
      {method === 'otp' && (
        <section className="proof-strip"><div><b>181</b><span>membres enregistrés</span></div></section>
      )}
      <footer className="footer"><div className="brand"><span className="brand-mark">H</span><span>HASHCODE</span></div><span>© 2024 HASHCODE · La communauté qui vous ressemble.</span></footer>
    </main>
  )
}