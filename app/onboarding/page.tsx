'use client'

import { useState, useEffect } from 'react'
import { ArrowRight, Check, ChevronLeft, LockKeyhole, ShieldCheck, Cloud, Brain, Shield, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

const steps = ['Email', 'Type', 'Profil', 'Pôles', 'Niveaux', 'Intérêts', 'Préférences', 'Confirmation']

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [email, setEmail] = useState('')
  const [memberType, setMemberType] = useState<'existing' | 'new' | null>(null)
  const [selectedPoles, setSelectedPoles] = useState<{ slug: string; level: string }[]>([])
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [commPrefs, setCommPrefs] = useState({
    community: true,
    security: false,
    ai: false,
    cloud: false,
    training: false,
    workshops: false,
    opportunities: false,
    projects: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [memberData, setMemberData] = useState<any>(null)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    age: '',
    country: '',
    city: '',
    phone: '',
    linkedinUrl: '',
    occupation: 'student' as 'student' | 'professional' | 'entrepreneur' | 'freelancer' | 'seeking_opportunities' | 'other',
    bio: '',
  })
  const router = useRouter()

  useEffect(() => {
    fetch('/api/auth/session', { credentials: 'include' }).then(async (res) => {
      if (res.ok) {
        const data = await res.json()
        if (data.authenticated) {
          // Pre-fill form
          const res2 = await fetch('/api/members/me', { credentials: 'include' })
          if (res2.ok) {
            const memberInfo = await res2.json()
            setMemberData(memberInfo)
            if (memberInfo.member) {
              setEmail(memberInfo.member.email)
              setForm((f) => ({
                ...f,
                firstName: memberInfo.member.firstName || '',
                lastName: memberInfo.member.lastName || '',
                age: memberInfo.member.age?.toString() || '',
                country: memberInfo.member.country || '',
                city: memberInfo.member.city || '',
                phone: memberInfo.member.phone || '',
              }))
            }
            if (memberInfo.profile) {
              setForm((f) => ({
                ...f,
                linkedinUrl: memberInfo.profile.linkedinUrl || '',
                bio: memberInfo.profile.bio || '',
                occupation: memberInfo.profile.occupation || 'student',
              }))
            }
          }
        }
      }
    })
  }, [])

  const next = () => {
    setError(null)
    setStep((s) => Math.min(s + 1, steps.length - 1))
  }

  const back = () => {
    setError(null)
    setStep((s) => Math.max(0, s - 1))
  }

  const saveProfile = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/members/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          firstName: form.firstName || null,
          lastName: form.lastName || null,
          age: form.age ? parseInt(form.age) : null,
          country: form.country || null,
          city: form.city || null,
          phone: form.phone || null,
          occupation: form.occupation,
          bio: form.bio || null,
          linkedinUrl: form.linkedinUrl || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Erreur')
        return false
      }
      return true
    } catch (err) {
      setError('Erreur réseau')
      return false
    } finally {
      setLoading(false)
    }
  }

  const savePoles = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/members/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          poles: selectedPoles.map((p, i) => ({ slug: p.slug, level: p.level, isPrimary: i === 0 })),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Erreur')
        return false
      }
      return true
    } catch (err) {
      setError('Erreur réseau')
      return false
    } finally {
      setLoading(false)
    }
  }

  const saveInterests = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/members/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          interests: selectedInterests,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Erreur')
        return false
      }
      return true
    } catch (err) {
      setError('Erreur réseau')
      return false
    } finally {
      setLoading(false)
    }
  }

  const saveCommPrefs = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/members/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          communicationPrefs: commPrefs,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Erreur')
        return false
      }
      return true
    } catch (err) {
      setError('Erreur réseau')
      return false
    } finally {
      setLoading(false)
    }
  }

  const handleNext = async () => {
    if (step === 2) {
      const ok = await saveProfile()
      if (ok) next()
      return
    }
    if (step === 4) {
      const ok = await savePoles()
      if (ok) next()
      return
    }
    if (step === 5) {
      const ok = await saveInterests()
      if (ok) next()
      return
    }
    if (step === 6) {
      const ok = await saveCommPrefs()
      if (ok) next()
      return
    }
    next()
  }

  return (
    <main className="onboarding">
      <header className="site-header">
        <div className="brand"><span className="brand-mark">H</span><span>HASHCODE</span></div>
        <button className="text-button" onClick={() => router.push('/')}>Quitter</button>
      </header>
      <div className="onboarding-wrap">
        <div className="progress">
          <span>0{step + 1}</span>
          <div>
            {steps.map((label, i) => (
              <div key={label} className={i <= step ? 'progress-step active' : 'progress-step'}>
                <i />{label}
              </div>
            ))}
          </div>
        </div>

        <div className="form-panel">
          {error && (
            <div className="error-banner">{error}</div>
          )}

          {step === 0 && (
            <>
              <p className="eyebrow">Étape 01 / 08</p>
              <h1>Commençons par<br /><em>vous retrouver.</em></h1>
              <p>Votre adresse email nous permet de vérifier si vous faites déjà partie de la communauté.</p>
              <label>Adresse email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.fr"
                type="email"
                disabled={loading}
              />
              <button className="primary-button" onClick={handleNext} disabled={!email.trim() || loading}>
                Vérifier mon profil <ArrowRight size={18} />
              </button>
            </>
          )}

          {step === 1 && (
            <>
              <p className="eyebrow">Étape 02 / 08</p>
              <h1>Bienvenue dans<br /><em>le mouvement.</em></h1>
              <p>Dites-nous où vous en êtes pour personnaliser votre expérience.</p>
              <div className="choice-grid">
                <button
                  className={memberType === 'existing' ? 'choice selected' : 'choice'}
                  onClick={() => { setMemberType('existing'); next() }}
                  disabled={loading}
                >
                  <b>Je suis déjà membre</b>
                  <span>Je mets à jour mon profil</span>
                </button>
                <button
                  className={memberType === 'new' ? 'choice selected' : 'choice'}
                  onClick={() => { setMemberType('new'); next() }}
                  disabled={loading}
                >
                  <b>Je rejoins la communauté</b>
                  <span>Je crée mon HASHCODE</span>
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="eyebrow">Étape 03 / 08</p>
              <h1>Construisons votre<br /><em>profil unique.</em></h1>
              <p>Quelques informations pour mieux vous connecter aux bonnes personnes.</p>
              <div className="form-grid">
                <div><label>Prénom</label><input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
                <div><label>Nom</label><input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
                <div><label>Âge</label><input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} /></div>
                <div><label>Pays</label><input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
                <div><label>Ville</label><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                <div><label>Téléphone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><label>LinkedIn</label><input value={form.linkedinUrl} onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })} /></div>
                <div>
                  <label>Statut actuel</label>
                  <select value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value as any })}>
                    <option value="student">Étudiant</option>
                    <option value="professional">Professionnel</option>
                    <option value="entrepreneur">Entrepreneur</option>
                    <option value="freelancer">Freelance</option>
                    <option value="seeking_opportunities">En recherche d'opportunités</option>
                    <option value="other">Autre</option>
                  </select>
                </div>
              </div>
              <button className="primary-button" onClick={handleNext} disabled={loading}>
                {loading ? <><Loader2 className="spin" size={18} /> Sauvegarde...</> : <>Suivant <ArrowRight size={18} /></>}
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <p className="eyebrow">Étape 04 / 08</p>
              <h1>Sélectionnez vos <br /><em>pôles HASHCODE</em></h1>
              <p>Choisissez 1 pôle principal et jusqu'à 2 pôles secondaires. Vous pourrez les modifier plus tard.</p>
              <div className="pole-grid">
                <button
                  className={selectedPoles.find((p) => p.slug === 'security') ? 'pole-card selected' : 'pole-card'}
                  onClick={() => {
                    const exists = selectedPoles.find((p) => p.slug === 'security')
                    if (exists) setSelectedPoles(selectedPoles.filter((p) => p.slug !== 'security'))
                    else if (selectedPoles.length < 3) setSelectedPoles([...selectedPoles, { slug: 'security', level: 'beginner' }])
                  }}
                  disabled={loading}
                >
                  <Shield size={32} />
                  <b>HASHCODE Security</b>
                  <span>Cybersécurité, pentesting, SOC</span>
                </button>
                <button
                  className={selectedPoles.find((p) => p.slug === 'ai') ? 'pole-card selected' : 'pole-card'}
                  onClick={() => {
                    const exists = selectedPoles.find((p) => p.slug === 'ai')
                    if (exists) setSelectedPoles(selectedPoles.filter((p) => p.slug !== 'ai'))
                    else if (selectedPoles.length < 3) setSelectedPoles([...selectedPoles, { slug: 'ai', level: 'beginner' }])
                  }}
                  disabled={loading}
                >
                  <Brain size={32} />
                  <b>HASHCODE AI</b>
                  <span>Intelligence artificielle, ML, NLP</span>
                </button>
                <button
                  className={selectedPoles.find((p) => p.slug === 'cloud') ? 'pole-card selected' : 'pole-card'}
                  onClick={() => {
                    const exists = selectedPoles.find((p) => p.slug === 'cloud')
                    if (exists) setSelectedPoles(selectedPoles.filter((p) => p.slug !== 'cloud'))
                    else if (selectedPoles.length < 3) setSelectedPoles([...selectedPoles, { slug: 'cloud', level: 'beginner' }])
                  }}
                  disabled={loading}
                >
                  <Cloud size={32} />
                  <b>HASHCODE Cloud</b>
                  <span>Cloud, DevOps, infrastructure</span>
                </button>
              </div>
              <p className="microcopy">{selectedPoles.length}/3 pôles sélectionnés</p>
              <button className="primary-button" onClick={handleNext} disabled={selectedPoles.length === 0 || loading}>
                Suivant <ArrowRight size={18} />
              </button>
            </>
          )}

          {step === 4 && (
            <>
              <p className="eyebrow">Étape 05 / 08</p>
              <h1>Indiquez votre <br /><em>niveau par pôle</em></h1>
              <p>Pour chaque pôle sélectionné, précisez votre niveau actuel.</p>
              {selectedPoles.map((pole) => (
                <div key={pole.slug} className="level-group">
                  <h3>{pole.slug === 'security' ? 'HASHCODE Security' : pole.slug === 'ai' ? 'HASHCODE AI' : 'HASHCODE Cloud'}</h3>
                  <div className="level-options">
                    {['beginner', 'intermediate', 'advanced'].map((level) => (
                      <button
                        key={level}
                        className={pole.level === level ? 'level-btn selected' : 'level-btn'}
                        onClick={() => setSelectedPoles(selectedPoles.map((p) => p.slug === pole.slug ? { ...p, level } : p))}
                        disabled={loading}
                      >
                        {level === 'beginner' ? 'Débutant' : level === 'intermediate' ? 'Intermédiaire' : 'Avancé'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button className="primary-button" onClick={handleNext} disabled={loading}>
                {loading ? <><Loader2 className="spin" size={18} /> Sauvegarde...</> : <>Suivant <ArrowRight size={18} /></>}
              </button>
            </>
          )}

          {step === 5 && (
            <>
              <p className="eyebrow">Étape 06 / 08</p>
              <h1>Qu'aimeriez-vous <br /><em>faire avec HASHCODE ?</em></h1>
              <p>Sélectionnez tout ce qui vous intéresse.</p>
              <div className="interest-grid">
                {[
                  { slug: 'learn', label: 'Apprendre' },
                  { slug: 'workshops', label: 'Participer à des workshops' },
                  { slug: 'projects', label: 'Travailler sur des projets' },
                  { slug: 'opportunities', label: 'Trouver des opportunités' },
                  { slug: 'networking', label: 'Développer mon réseau' },
                  { slug: 'mentor', label: 'Devenir mentor' },
                  { slug: 'mentee', label: 'Trouver un mentor' },
                  { slug: 'entrepreneurship', label: 'Entreprendre' },
                ].map((interest) => (
                  <button
                    key={interest.slug}
                    className={selectedInterests.includes(interest.slug) ? 'interest-card selected' : 'interest-card'}
                    onClick={() => {
                      if (selectedInterests.includes(interest.slug)) {
                        setSelectedInterests(selectedInterests.filter((i) => i !== interest.slug))
                      } else {
                        setSelectedInterests([...selectedInterests, interest.slug])
                      }
                    }}
                    disabled={loading}
                  >
                    {interest.label}
                  </button>
                ))}
              </div>
              <button className="primary-button" onClick={handleNext} disabled={loading}>
                {loading ? <><Loader2 className="spin" size={18} /> Sauvegarde...</> : <>Suivant <ArrowRight size={18} /></>}
              </button>
            </>
          )}

          {step === 6 && (
            <>
              <p className="eyebrow">Étape 07 / 08</p>
              <h1>Que souhaitez-vous <br /><em>recevoir ?</em></h1>
              <p>Tu peux appartenir à plusieurs pôles sans recevoir toutes les communications.</p>
              <div className="comm-prefs">
                <div className="comm-group">
                  <h3>Communauté</h3>
                  <label className="toggle"><input type="checkbox" checked={commPrefs.community} onChange={(e) => setCommPrefs({ ...commPrefs, community: e.target.checked })} /> Annonces importantes</label>
                </div>
                <div className="comm-group">
                  <h3>Pôles HASHCODE</h3>
                  <label className="toggle"><input type="checkbox" checked={commPrefs.security} onChange={(e) => setCommPrefs({ ...commPrefs, security: e.target.checked })} /> HASHCODE Security</label>
                  <label className="toggle"><input type="checkbox" checked={commPrefs.ai} onChange={(e) => setCommPrefs({ ...commPrefs, ai: e.target.checked })} /> HASHCODE AI</label>
                  <label className="toggle"><input type="checkbox" checked={commPrefs.cloud} onChange={(e) => setCommPrefs({ ...commPrefs, cloud: e.target.checked })} /> HASHCODE Cloud</label>
                </div>
                <div className="comm-group">
                  <h3>Activités</h3>
                  <label className="toggle"><input type="checkbox" checked={commPrefs.training} onChange={(e) => setCommPrefs({ ...commPrefs, training: e.target.checked })} /> Formations</label>
                  <label className="toggle"><input type="checkbox" checked={commPrefs.workshops} onChange={(e) => setCommPrefs({ ...commPrefs, workshops: e.target.checked })} /> Workshops</label>
                  <label className="toggle"><input type="checkbox" checked={commPrefs.opportunities} onChange={(e) => setCommPrefs({ ...commPrefs, opportunities: e.target.checked })} /> Opportunités</label>
                  <label className="toggle"><input type="checkbox" checked={commPrefs.projects} onChange={(e) => setCommPrefs({ ...commPrefs, projects: e.target.checked })} /> Projets</label>
                </div>
              </div>
              <button className="primary-button" onClick={handleNext} disabled={loading}>
                {loading ? <><Loader2 className="spin" size={18} /> Sauvegarde...</> : <>Terminer <Check size={18} /></>}
              </button>
            </>
          )}

          {step === 7 && (
            <>
              <div className="success-icon">
                <Check size={48} color="white" />
              </div>
              <h1>Ton profil HASHCODE <br /><em>est à jour.</em></h1>
              <p>Bienvenue dans la nouvelle communauté HASHCODE.</p>
              <div className="member-card">
                <div className="card-kicker">HASHCODE MEMBER</div>
                <div className="card-name">{form.firstName || 'Membre'}</div>
                <div className="card-pole">
                  <small>PRINCIPAL</small>
                  <b>{selectedPoles[0]?.slug === 'security' ? 'Security' : selectedPoles[0]?.slug === 'ai' ? 'AI' : 'Cloud'}</b>
                </div>
                <div className="card-poles">
                  {selectedPoles.map((p) => (
                    <div key={p.slug} className="card-pole-row">
                      <span>{p.slug === 'security' ? 'Security' : p.slug === 'ai' ? 'AI' : 'Cloud'}</span>
                      <span className="level-tag">{p.level === 'beginner' ? 'Débutant' : p.level === 'intermediate' ? 'Intermédiaire' : 'Avancé'}</span>
                    </div>
                  ))}
                </div>
                <div className="card-status">✓ Profil vérifié</div>
              </div>
              <button className="primary-button" onClick={() => router.push('/')}>
                Rejoindre mon espace HASHCODE <ArrowRight size={18} />
              </button>
            </>
          )}

          {step > 0 && step < 7 && (
            <button className="text-button back-btn" onClick={back}>
              <ChevronLeft size={18} /> Retour
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
