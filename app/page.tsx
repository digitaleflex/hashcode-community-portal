'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, LockKeyhole, ShieldCheck, Users, Zap, Cloud, Brain, Shield } from 'lucide-react'
import { fetchCommunityStats, type CommunityStats } from '@/lib/client-stats'

export default function LandingPage() {
  const router = useRouter()
  const [stats, setStats] = useState<CommunityStats | null>(null)

  useEffect(() => {
    checkAuth()
    fetchCommunityStats()
      .then(setStats)
      .catch(() => setStats({ total: 0, imported: 0, active: 0, verified: 0, updated: 0, countries: 0, polesCovered: 0, poleBreakdown: [] }))
  }, [])

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/session', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        if (data.authenticated) {
          router.push('/profile')
        }
      }
    } catch {
      // Not authenticated, show landing
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="site-header">
        <div className="brand">
          <span className="brand-mark">H</span>
          <span>HASHCODE</span>
        </div>
        <div className="header-actions">
          <button className="text-button" onClick={() => router.push('/auth/verify')}>Connexion</button>
          <span className="secure-label"><LockKeyhole size={14} /> Données sécurisées</span>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-dot" /> Registre communautaire nouvelle génération</p>
          <h1>HASHCODE<br /><em>revient.</em></h1>
          <p className="hero-text">
            Depuis 2019, des milliers de personnes ont fait partie de notre communauté.<br />
            Aujourd'hui, nous reconstruisons HASHCODE autour d'une nouvelle génération de membres, de compétences et d'opportunités.
          </p>
          <p className="hero-text">
            Ton profil existe peut-être déjà dans nos archives.<br />
            <strong>Vérifie-le, mets-le à jour et retrouve ta place dans la communauté.</strong>
          </p>
          <button className="primary-button" onClick={() => router.push('/auth/verify')}>
            Vérifier mon profil <ArrowRight size={18} />
          </button>
          <div style={{ marginTop: '16px' }}>
            <button className="secondary-button" onClick={() => router.push('/auth/verify')}>
              Déjà membre ? Vérifie ton profil
            </button>
          </div>
          <p className="microcopy"><ShieldCheck size={14} /> Tes informations restent privées</p>
        </div>
        <div className="hero-visual">
          <div className="code-orbit">
            <div className="orbit-line orbit-one" />
            <div className="orbit-line orbit-two" />
            <div className="code-card">
              <span className="code-kicker">IDENTITÉ HASHCODE</span>
              <strong>HC–26–XXXX–XX</strong>
              <span className="code-status"><span /> Vérifié · Membre actif</span>
            </div>
          </div>
          <div className="visual-note note-top">Chaque parcours<br /><b>compte.</b></div>
          <div className="visual-note note-bottom">Chaque voix<br /><b>est unique.</b></div>
        </div>
      </section>

      <section className="proof-strip">
        <div><b>{stats ? stats.imported : '—'}</b><span>membres importés</span></div>
        <div><b>{stats?.polesCovered ?? '—'}</b><span>pôles HASHCODE</span></div>
        <div><b>{stats ? stats.countries : '—'}</b><span>pays représentés</span></div>
        <div className="proof-pulse"><Zap size={18} /> Rejoignez le mouvement</div>
      </section>

      <section className="poles-section">
        <p className="eyebrow"><span className="eyebrow-dot" /> Les 3 pôles HASHCODE</p>
        <h2>Trois domaines.<br /><span>Une communauté.</span></h2>
        <div className="poles-grid">
          <article className="pole-preview-card">
            <Shield size={32} />
            <b>HASHCODE Security</b>
            <p>Cybersécurité, pentesting, SOC, forensics, threat intelligence</p>
          </article>
          <article className="pole-preview-card">
            <Brain size={32} />
            <b>HASHCODE AI</b>
            <p>Intelligence artificielle, machine learning, deep learning, NLP</p>
          </article>
          <article className="pole-preview-card">
            <Cloud size={32} />
            <b>HASHCODE Cloud</b>
            <p>Cloud computing, DevOps, architecture, infrastructure</p>
          </article>
        </div>
      </section>

      <section className="manifesto">
        <p className="eyebrow">Pourquoi HASHCODE ?</p>
        <h2>Une identité qui ne vous définit pas.<br /><span>Elle vous révèle.</span></h2>
        <div className="manifesto-grid">
          <p>
            Nous croyons que chaque personne est plus qu'un nom dans une base de données.
            HASHCODE transforme vos engagements, vos idées et vos liens en une signature qui vous ressemble.
          </p>
          <div className="manifesto-items">
            <div><Users size={20} /><span><b>Une communauté</b> qui avance ensemble.</span></div>
            <div><ShieldCheck size={20} /><span><b>Un espace sûr</b> pour être pleinement soi.</span></div>
            <div><Check size={20} /><span><b>Une segmentation</b> par pôles et compétences.</span></div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="brand">
          <span className="brand-mark">H</span>
          <span>HASHCODE</span>
        </div>
        <span>© 2026 HASHCODE Community · <a href="/auth/verify">Vérifier mon profil</a></span>
      </footer>
    </main>
  )
}