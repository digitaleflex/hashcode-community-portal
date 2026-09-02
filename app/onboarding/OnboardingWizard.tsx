'use client'

import { useState, useEffect, useTransition } from 'react'
import { ArrowRight, ArrowLeft, Check, Loader2, Shield, Brain, Cloud, AlertCircle, Sparkles, Mail, User, Target, Heart, Bell, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { validators } from '@/lib/validation'

interface OnboardingData {
  email: string
  firstName: string
  lastName: string
  age: string
  country: string
  city: string
  phone: string
  linkedinUrl: string
  occupation: string
  bio: string
  poles: { slug: string; level: string }[]
  interests: string[]
  preferences: Record<string, boolean>
}

const STEPS = [
  { id: 'welcome', title: 'Bienvenue', description: 'Commençons', icon: Sparkles, short: 'Début' },
  { id: 'profile', title: 'Ton profil', description: 'Tes infos', icon: User, short: 'Profil' },
  { id: 'poles', title: 'Tes pôles', description: 'Tes domaines', icon: Target, short: 'Pôles' },
  { id: 'interests', title: 'Tes intérêts', description: 'Ce que tu aimes', icon: Heart, short: 'Intérêts' },
  { id: 'preferences', title: 'Tes préférences', description: 'Tes notifications', icon: Bell, short: 'Notifs' },
  { id: 'confirm', title: 'Confirmation', description: 'Vérifie et valide', icon: CheckCircle2, short: 'Confirmer' },
]

const POLES = [
  {
    slug: 'security',
    title: 'HASHCODE Security',
    description: 'Cybersécurité défensive et offensive',
    keywords: ['Pentest', 'SOC', 'Forensics', 'CTF'],
    icon: Shield,
  },
  {
    slug: 'ai',
    title: 'HASHCODE AI',
    description: 'Intelligence artificielle et machine learning',
    keywords: ['ML', 'Deep Learning', 'NLP', 'LLM'],
    icon: Brain,
  },
  {
    slug: 'cloud',
    title: 'HASHCODE Cloud',
    description: 'Infrastructure cloud et DevOps',
    keywords: ['AWS', 'Kubernetes', 'DevOps', 'SRE'],
    icon: Cloud,
  },
]

const INTERESTS = [
  'Web Development', 'Mobile', 'DevOps', 'Cloud Architecture', 'API Design',
  'Microservices', 'CTF & Sécurité', 'Pentest', 'Reverse Engineering',
  'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'LLM',
  'Kubernetes', 'Docker', 'Terraform', 'CI/CD', 'Monitoring', 'SRE',
  'Frontend', 'Backend', 'Full-Stack', 'Mobile (iOS/Android)', 'PWA',
  'Blockchain', 'Web3', 'IoT', 'Embedded', 'Robotics',
]

const LEVELS = [
  { id: 'beginner', icon: '🌱', title: 'Débutant', description: 'Je découvre' },
  { id: 'intermediate', icon: '⚡', title: 'Intermédiaire', description: 'J\'apprends' },
  { id: 'advanced', icon: '🚀', title: 'Avancé', description: 'Je maîtrise' },
  { id: 'expert', icon: '👑', title: 'Expert', description: 'J\'enseigne' },
]

const OCCUPATIONS = [
  { id: 'student', label: 'Étudiant' },
  { id: 'professional', label: 'Professionnel' },
  { id: 'entrepreneur', label: 'Entrepreneur' },
  { id: 'freelancer', label: 'Freelance' },
  { id: 'seeking_opportunities', label: 'En recherche' },
  { id: 'other', label: 'Autre' },
]

const PREFERENCES = [
  { key: 'community', label: 'Communauté', description: 'Actualités de la communauté HASHCODE' },
  { key: 'events', label: 'Événements', description: 'Conférences, workshops, meetups' },
  { key: 'training', label: 'Formations', description: 'Nouvelles formations et tutoriels' },
  { key: 'opportunities', label: 'Opportunités', description: 'Jobs, stages, missions freelance' },
  { key: 'projects', label: 'Projets', description: 'Appels à collaboration sur des projets' },
  { key: 'poles', label: 'Pôles', description: 'Actus spécifiques à mes pôles' },
]

export default function OnboardingWizard() {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [data, setData] = useState<OnboardingData>({
    email: '',
    firstName: '',
    lastName: '',
    age: '',
    country: '',
    city: '',
    phone: '',
    linkedinUrl: '',
    occupation: 'student',
    bio: '',
    poles: [],
    interests: [],
    preferences: {
      community: true,
      events: true,
      training: false,
      opportunities: false,
      projects: false,
      poles: true,
    },
  })

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Load existing member data
  useEffect(() => {
    fetch('/api/auth/session', { credentials: 'include' })
      .then((r) => r.json())
      .then((session) => {
        if (session?.member?.email) {
          setData((d) => ({ ...d, email: session.member.email }))
        }
      })

    fetch('/api/members/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((memberInfo) => {
        if (memberInfo?.member) {
          const m = memberInfo.member
          const p = memberInfo.profile || {}
          setData((d) => ({
            ...d,
            email: m.email || d.email,
            firstName: m.firstName || '',
            lastName: m.lastName || '',
            age: m.age?.toString() || '',
            country: m.country || '',
            city: m.city || '',
            phone: m.phone || '',
            linkedinUrl: p.linkedinUrl || '',
            occupation: p.occupation || 'student',
            bio: p.bio || '',
            poles: memberInfo.poles?.map((pole: any) => ({
              slug: pole.pole.slug,
              level: pole.level,
            })) || [],
            interests: memberInfo.interests?.map((i: any) => i.interest.name) || [],
          }))
        }
      })
  }, [])

  const update = <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => {
    setData((d) => ({ ...d, [key]: value }))
    setFieldErrors((e) => ({ ...e, [key]: '' }))
    setError(null)
  }

  const togglePole = (slug: string) => {
    setData((d) => {
      const exists = d.poles.find((p) => p.slug === slug)
      if (exists) {
        return { ...d, poles: d.poles.filter((p) => p.slug !== slug) }
      }
      return { ...d, poles: [...d.poles, { slug, level: 'intermediate' }] }
    })
  }

  const setPoleLevel = (slug: string, level: string) => {
    setData((d) => ({
      ...d,
      poles: d.poles.map((p) => (p.slug === slug ? { ...p, level } : p)),
    }))
  }

  const toggleInterest = (interest: string) => {
    setData((d) => ({
      ...d,
      interests: d.interests.includes(interest)
        ? d.interests.filter((i) => i !== interest)
        : [...d.interests, interest],
    }))
  }

  const togglePreference = (key: string) => {
    setData((d) => ({
      ...d,
      preferences: { ...d.preferences, [key]: !d.preferences[key] },
    }))
  }

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {}

    if (step === 0) {
      if (!validators.required(data.email).valid) errors.email = 'Email requis'
      else if (!validators.email(data.email).valid) errors.email = 'Email invalide'
    }

    if (step === 1) {
      if (!validators.required(data.firstName).valid) errors.firstName = 'Prénom requis'
      if (!validators.required(data.lastName).valid) errors.lastName = 'Nom requis'
      if (!validators.required(data.country).valid) errors.country = 'Pays requis'
    }

    if (step === 2) {
      if (data.poles.length === 0) {
        setError('Sélectionne au moins un pôle')
        return false
      }
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const next = () => {
    if (!validateStep(currentStep)) return
    setDirection('forward')
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const back = () => {
    setDirection('backward')
    setCurrentStep((s) => Math.max(s - 1, 0))
  }

  const goTo = (step: number) => {
    if (step < currentStep) {
      setDirection('backward')
      setCurrentStep(step)
    }
  }

  const submit = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/members/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          age: data.age ? parseInt(data.age) : null,
          country: data.country,
          city: data.city,
          phone: data.phone,
          occupation: data.occupation,
          linkedinUrl: data.linkedinUrl,
          bio: data.bio,
          poles: data.poles,
          interests: data.interests,
          preferences: data.preferences,
        }),
      })

      if (res.ok) {
        setSuccess(true)
        setTimeout(() => {
          startTransition(() => {
            router.push('/profile')
          })
        }, 2000)
      } else {
        const err = await res.json()
        setError(err.error || 'Une erreur est survenue')
      }
    } catch (e) {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  const progress = ((currentStep + 1) / STEPS.length) * 100

  if (success) {
    return (
      <div className="wizard">
        <div className="wizard-content" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div className="wizard-success">
            <div className="wizard-success-icon">
              <CheckCircle2 size={48} />
            </div>
            <h1 className="wizard-success-title">Profil complété !</h1>
            <p className="wizard-success-description">
              Bienvenue dans HASHCODE. On te redirige vers ton profil...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="wizard">
      {/* Sidebar with steps */}
      <aside className="wizard-sidebar">
        <div className="wizard-brand">
          <span className="wizard-brand-mark">H</span>
          <span>HASHCODE</span>
        </div>

        <nav className="step-list">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            const status = i === currentStep ? 'active' : i < currentStep ? 'completed' : 'locked'
            return (
              <button
                key={step.id}
                className={`step-item step-${status}`}
                onClick={() => status !== 'locked' && goTo(i)}
                disabled={status === 'locked'}
                data-short={step.short}
                style={{ background: 'none', border: 'none', textAlign: 'left' }}
              >
                <div className="step-number">
                  {status === 'completed' ? <Check size={16} /> : i + 1}
                </div>
                <div className="step-content">
                  <div className="step-title">{step.title}</div>
                  <div className="step-description">{step.description}</div>
                </div>
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="wizard-content">
        {/* Progress bar */}
        <div className="wizard-progress">
          <div className="wizard-progress-bar">
            <div className="wizard-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="wizard-progress-text">
            {currentStep + 1} / {STEPS.length}
          </div>
        </div>

        {error && (
          <div className="wizard-error">
            <AlertCircle size={20} />
            <div className="wizard-error-content">
              <div className="wizard-error-title">Oups !</div>
              <div className="wizard-error-message">{error}</div>
            </div>
          </div>
        )}

        {/* Step content */}
        <div className="wizard-body" key={currentStep}>
          {currentStep === 0 && <StepWelcome data={data} update={update} errors={fieldErrors} />}
          {currentStep === 1 && <StepProfile data={data} update={update} errors={fieldErrors} />}
          {currentStep === 2 && <StepPoles data={data} togglePole={togglePole} setLevel={setPoleLevel} />}
          {currentStep === 3 && <StepInterests data={data} toggle={toggleInterest} />}
          {currentStep === 4 && <StepPreferences data={data} toggle={togglePreference} />}
          {currentStep === 5 && <StepConfirm data={data} />}
        </div>

        {/* Footer navigation */}
        <div className="wizard-footer">
          <div className="wizard-footer-info">
            {currentStep === 0 ? '~ 3 minutes' : `Étape ${currentStep + 1} sur ${STEPS.length}`}
          </div>
          <div className="wizard-footer-actions">
            {currentStep > 0 && (
              <button className="btn btn-secondary" onClick={back} disabled={loading}>
                <ArrowLeft size={18} />
                Retour
              </button>
            )}
            {currentStep < STEPS.length - 1 ? (
              <button className="btn btn-primary" onClick={next}>
                Continuer
                <ArrowRight size={18} />
              </button>
            ) : (
              <button className="btn btn-primary" onClick={submit} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    Finaliser mon profil
                    <Check size={18} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

// ── STEP COMPONENTS ───────────────

function StepWelcome({ data, update, errors }: { data: OnboardingData; update: any; errors: any }) {
  return (
    <>
      <div className="wizard-header">
        <div className="wizard-eyebrow">
          <span className="wizard-eyebrow-dot" />
          Bienvenue
        </div>
        <h1 className="wizard-title">
          Construisons <em>ton profil</em>
        </h1>
        <p className="wizard-subtitle">
          Quelques étapes pour rejoindre la communauté HASHCODE. Tes données restent privées et tu pourras les modifier à tout moment.
        </p>
      </div>

      <div className="form-stack">
        <div className="form-group">
          <div className="form-group-header">
            <label htmlFor="email" className="form-label">
              <Mail size={14} />
              Ton adresse email
              <span className="required">*</span>
            </label>
            <span className="form-label-hint">Privé</span>
          </div>
          <div className="input-group has-icon-left">
            <Mail size={18} className="input-icon-left" />
            <input
              id="email"
              type="email"
              value={data.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="nom.prenom@email.com"
              className="input-premium"
            />
          </div>
          {errors.email && (
            <div className="form-feedback error">
              <AlertCircle size={14} className="icon" />
              <span>{errors.email}</span>
            </div>
          )}
          <div className="form-helper">
            <Shield size={14} className="icon" />
            <span>On l'utilise uniquement pour t'identifier. Jamais partagé.</span>
          </div>
        </div>
      </div>
    </>
  )
}

function StepProfile({ data, update, errors }: { data: OnboardingData; update: any; errors: any }) {
  return (
    <>
      <div className="wizard-header">
        <div className="wizard-eyebrow">
          <span className="wizard-eyebrow-dot" />
          Étape 1
        </div>
        <h1 className="wizard-title">
          Parlons <em>de toi</em>
        </h1>
        <p className="wizard-subtitle">
          Ces infos permettent aux autres membres de te connaître et de te contacter.
        </p>
      </div>

      <div className="form-stack">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="firstName" className="form-label">
              Prénom <span className="required">*</span>
            </label>
            <input
              id="firstName"
              type="text"
              value={data.firstName}
              onChange={(e) => update('firstName', e.target.value)}
              placeholder="Prénom"
              className="input-premium"
            />
            {errors.firstName && (
              <div className="form-feedback error">
                <AlertCircle size={14} className="icon" />
                <span>{errors.firstName}</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="lastName" className="form-label">
              Nom <span className="required">*</span>
            </label>
            <input
              id="lastName"
              type="text"
              value={data.lastName}
              onChange={(e) => update('lastName', e.target.value)}
              placeholder="Nom"
              className="input-premium"
            />
            {errors.lastName && (
              <div className="form-feedback error">
                <AlertCircle size={14} className="icon" />
                <span>{errors.lastName}</span>
              </div>
            )}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="country" className="form-label">
              Pays <span className="required">*</span>
            </label>
            <input
              id="country"
              type="text"
              value={data.country}
              onChange={(e) => update('country', e.target.value)}
              placeholder="France"
              className="input-premium"
            />
            {errors.country && (
              <div className="form-feedback error">
                <AlertCircle size={14} className="icon" />
                <span>{errors.country}</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="city" className="form-label">Ville</label>
            <input
              id="city"
              type="text"
              value={data.city}
              onChange={(e) => update('city', e.target.value)}
              placeholder="Paris"
              className="input-premium"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="age" className="form-label">Âge</label>
            <input
              id="age"
              type="number"
              min="16"
              max="100"
              value={data.age}
              onChange={(e) => update('age', e.target.value)}
              placeholder="25"
              className="input-premium"
            />
          </div>

          <div className="form-group">
            <label htmlFor="occupation" className="form-label">Statut</label>
            <select
              id="occupation"
              value={data.occupation}
              onChange={(e) => update('occupation', e.target.value)}
              className="select-premium"
            >
              {OCCUPATIONS.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="linkedinUrl" className="form-label">LinkedIn (optionnel)</label>
          <input
            id="linkedinUrl"
            type="url"
            value={data.linkedinUrl}
            onChange={(e) => update('linkedinUrl', e.target.value)}
            placeholder="https://linkedin.com/in/ton-profil"
            className="input-premium"
          />
        </div>

        <div className="form-group">
          <div className="form-group-header">
            <label htmlFor="bio" className="form-label">Bio (optionnel)</label>
            <span className="input-counter">
              {data.bio.length} / 500
            </span>
          </div>
          <textarea
            id="bio"
            value={data.bio}
            onChange={(e) => update('bio', e.target.value)}
            placeholder="Présente-toi en quelques mots..."
            maxLength={500}
            rows={3}
            className="textarea-premium"
          />
        </div>
      </div>
    </>
  )
}

function StepPoles({ data, togglePole, setLevel }: any) {
  return (
    <>
      <div className="wizard-header">
        <div className="wizard-eyebrow">
          <span className="wizard-eyebrow-dot" />
          Étape 2
        </div>
        <h1 className="wizard-title">
          Tes <em>pôles</em>
        </h1>
        <p className="wizard-subtitle">
          Sélectionne les domaines qui te correspondent. Pour chaque pôle, indique ton niveau.
        </p>
      </div>

      <div className="choice-grid choice-grid-3">
        {POLES.map((pole) => {
          const Icon = pole.icon
          const selected = data.poles.find((p: any) => p.slug === pole.slug)
          return (
            <div
              key={pole.slug}
              className={`choice-card pole-${pole.slug} ${selected ? 'selected' : ''}`}
              onClick={() => togglePole(pole.slug)}
            >
              <div className="choice-card-icon">
                <Icon size={24} />
              </div>
              <div className="choice-card-title">{pole.title}</div>
              <div className="choice-card-description">{pole.description}</div>
              <div className="choice-card-keywords">
                {pole.keywords.map((k) => (
                  <span key={k} className="choice-card-keyword">{k}</span>
                ))}
              </div>

              {selected && (
                <div className="level-group" style={{ marginTop: '12px' }} onClick={(e) => e.stopPropagation()}>
                  {LEVELS.map((level) => (
                    <div
                      key={level.id}
                      className={`level-option ${selected.level === level.id ? 'selected' : ''}`}
                      onClick={() => setLevel(pole.slug, level.id)}
                    >
                      <div className="level-option-icon">{level.icon}</div>
                      <div className="level-option-title">{level.title}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

function StepInterests({ data, toggle }: any) {
  return (
    <>
      <div className="wizard-header">
        <div className="wizard-eyebrow">
          <span className="wizard-eyebrow-dot" />
          Étape 3
        </div>
        <h1 className="wizard-title">
          Ce qui <em>t'intéresse</em>
        </h1>
        <p className="wizard-subtitle">
          Sélectionne les sujets qui t'attirent. Plus tu en mets, plus on pourra te recommander du contenu pertinent.
        </p>
      </div>

      <div className="interest-grid">
        {INTERESTS.map((interest) => (
          <button
            key={interest}
            className={`interest-pill ${data.interests.includes(interest) ? 'selected' : ''}`}
            onClick={() => toggle(interest)}
            type="button"
          >
            {data.interests.includes(interest) && <Check size={12} />}
            {interest}
          </button>
        ))}
      </div>
    </>
  )
}

function StepPreferences({ data, toggle }: any) {
  return (
    <>
      <div className="wizard-header">
        <div className="wizard-eyebrow">
          <span className="wizard-eyebrow-dot" />
          Étape 4
        </div>
        <h1 className="wizard-title">
          Tes <em>notifications</em>
        </h1>
        <p className="wizard-subtitle">
          Choisis les types d'emails que tu souhaites recevoir. Tu pourras modifier ça à tout moment.
        </p>
      </div>

      <div className="preference-list">
        {PREFERENCES.map((pref) => (
          <label key={pref.key} className="preference-item">
            <div className="preference-content">
              <div className="preference-label">{pref.label}</div>
              <div className="preference-description">{pref.description}</div>
            </div>
            <button
              type="button"
              className={`toggle-premium ${data.preferences[pref.key] ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault()
                toggle(pref.key)
              }}
              aria-pressed={data.preferences[pref.key]}
            />
          </label>
        ))}
      </div>
    </>
  )
}

function StepConfirm({ data }: { data: OnboardingData }) {
  const poleData = (slug: string) => POLES.find((p) => p.slug === slug)
  const levelLabel = (id: string) => LEVELS.find((l) => l.id === id)?.title || id

  return (
    <>
      <div className="wizard-header">
        <div className="wizard-eyebrow">
          <span className="wizard-eyebrow-dot" />
          Étape finale
        </div>
        <h1 className="wizard-title">
          Tout est <em>prêt</em> !
        </h1>
        <p className="wizard-subtitle">
          Vérifie tes informations avant de finaliser ton profil.
        </p>
      </div>

      <div className="summary-card">
        <div className="summary-section">
          <div className="summary-label">
            <User size={12} />
            Identité
          </div>
          <div className="summary-value">
            {data.firstName} {data.lastName}
            {data.country && ` · ${data.country}${data.city ? `, ${data.city}` : ''}`}
            {data.occupation && ` · ${OCCUPATIONS.find((o) => o.id === data.occupation)?.label}`}
          </div>
        </div>

        {data.poles.length > 0 && (
          <div className="summary-section">
            <div className="summary-label">
              <Target size={12} />
              Pôles ({data.poles.length})
            </div>
            <div className="summary-pole-list">
              {data.poles.map((p) => {
                const pole = poleData(p.slug)
                return pole ? (
                  <span key={p.slug} className={`summary-pole ${p.slug}`}>
                    {pole.title.replace('HASHCODE ', '')} · {levelLabel(p.level)}
                  </span>
                ) : null
              })}
            </div>
          </div>
        )}

        {data.interests.length > 0 && (
          <div className="summary-section">
            <div className="summary-label">
              <Heart size={12} />
              Intérêts ({data.interests.length})
            </div>
            <div className="summary-pole-list">
              {data.interests.map((i) => (
                <span key={i} className="summary-pole" style={{ background: 'var(--background)' }}>
                  {i}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="summary-section">
          <div className="summary-label">
            <Bell size={12} />
            Notifications
          </div>
          <div className="summary-value">
            {Object.entries(data.preferences).filter(([_, v]) => v).length} types d'emails activés
          </div>
        </div>
      </div>
    </>
  )
}
