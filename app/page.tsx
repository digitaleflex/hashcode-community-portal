'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, LockKeyhole, ShieldCheck, Users, Zap, Cloud, Brain, Shield } from 'lucide-react'
import { fetchCommunityStats, type CommunityStats } from '@/lib/client-stats'
import { Hero, HeroVisual } from '@/components/Hero'

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
          <span className="secure-label"><LockKeyhole size={14} /> Chiffré & privé</span>
        </div>
      </header>

      <Hero
        eyebrow="Registre communautaire nouvelle génération"
        title={
          <>
            HASHCODE<br />
            <em>revient.</em>
          </>
        }
        description={
          <>
            Depuis 2019, des milliers de personnes ont fait partie de notre communauté.<br />
            Aujourd'hui, nous reconstruisons HASHCODE autour d'une nouvelle génération de membres, de compétences et d'opportunités.
          </>
        }
        highlight="Ton profil existe peut-être déjà dans nos archives."
        cta={{
          label: 'Vérifier mon profil',
          onClick: () => router.push('/auth/verify'),
        }}
        microcopy="Tes informations restent privées · Chiffrement AES-256"
        microcopyIcon={<ShieldCheck size={14} />}
        visual={
          <HeroVisual
            notes={{
              top: 'Chaque parcours<br /><b>compte.</b>',
              bottom: 'Chaque voix<br /><b>est unique.</b>',
            }}
          />
        }
      />

      <section className="proof-strip">
        <div><b>{stats ? stats.imported : '—'}</b><span>membres actifs</span></div>
        <div><b>{stats?.polesCovered ?? '—'}</b><span>pôles HASHCODE</span></div>
        <div><b>{stats ? stats.countries : '—'}</b><span>pays représentés</span></div>
        <div className="proof-pulse"><Zap size={18} /> Rejoins le mouvement</div>
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