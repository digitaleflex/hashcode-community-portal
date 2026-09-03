'use client'

import { useState, useEffect, useTransition } from 'react'
import { ArrowRight, ArrowLeft, Check, Loader2, Shield, Brain, Cloud, AlertCircle, Mail, User, Target, Heart, Bell, CheckCircle2, Sprout, Zap, Crown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { validators } from '@/lib/validation'
import { toast } from '@/components/Toast'
import { Breadcrumbs } from '@/components/Breadcrumbs'

interface OnboardingData {
  email: string
  firstName: string
  lastName: string
  age: string
  gender: string
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

type OnboardingUpdate = {
  [K in keyof OnboardingData]?: OnboardingData[K]
}

type StepProps = {
  data: OnboardingData
  update: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void
  errors: Partial<Record<keyof OnboardingData, string>>
  onBlur: (key: keyof OnboardingData) => void
}

const STEPS = [
  { id: 'profile', title: 'Ton profil', description: 'Tes infos de base', icon: User, short: 'Profil' },
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
  { id: 'beginner', Icon: Sprout, title: 'Débutant', description: 'Je découvre' },
  { id: 'intermediate', Icon: Zap, title: 'Intermédiaire', description: 'J\'apprends' },
  { id: 'advanced', Icon: ArrowRight, title: 'Avancé', description: 'Je maîtrise' },
  { id: 'expert', Icon: Crown, title: 'Expert', description: 'J\'enseigne' },
]

const OCCUPATIONS = [
  { id: 'student', label: 'Étudiant' },
  { id: 'professional', label: 'Professionnel' },
  { id: 'entrepreneur', label: 'Entrepreneur' },
  { id: 'freelancer', label: 'Freelance' },
  { id: 'seeking_opportunities', label: 'En recherche' },
  { id: 'other', label: 'Autre' },
]

const GENDERS = [
  { id: '', label: 'Sélectionner' },
  { id: 'male', label: 'Masculin' },
  { id: 'female', label: 'Féminin' },
  { id: 'other', label: 'Autre' },
  { id: 'prefer_not_to_say', label: 'Préfère ne pas dire' },
]

// Keys must match the communication_preferences columns (lib/db/schema.ts).
const PREFERENCES = [
  { key: 'community', label: 'Communauté', description: 'Actualités de la communauté HASHCODE' },
  { key: 'security', label: 'HASHCODE Security', description: 'Cybersécurité : veille, CTF, ateliers' },
  { key: 'ai', label: 'HASHCODE AI', description: 'Intelligence artificielle : ML, LLM, data' },
  { key: 'cloud', label: 'HASHCODE Cloud', description: 'Cloud & DevOps : infra, déploiement' },
  { key: 'training', label: 'Formations', description: 'Nouvelles formations et tutoriels' },
  { key: 'workshops', label: 'Workshops', description: 'Ateliers pratiques et meetups' },
  { key: 'opportunities', label: 'Opportunités', description: 'Jobs, stages, missions freelance' },
  { key: 'projects', label: 'Projets', description: 'Appels à collaboration sur des projets' },
]

export default function OnboardingWizard() {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [currentStep, setCurrentStep] = useState(0)
  const [showResumeBanner, setShowResumeBanner] = useState(false)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [data, setData] = useState<OnboardingData>({
    email: '',
    firstName: '',
    lastName: '',
    age: '',
    gender: '',
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
      security: false,
      ai: false,
      cloud: false,
      training: false,
      workshops: false,
      opportunities: false,
      projects: false,
    },
  })

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Partial<Record<keyof OnboardingData, boolean>>>({})

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('onboarding_draft')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.data) setData(parsed.data)
        if (typeof parsed.step === 'number' && parsed.step > 0) {
          setCurrentStep(parsed.step)
          setShowResumeBanner(true)
        }
      }
    } catch {
      // ignore corrupt storage
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Save to localStorage on every data/step change (debounced 500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('onboarding_draft', JSON.stringify({ data, step: currentStep }))
      } catch {
        // storage full
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [data, currentStep])

  // Load existing member data
  useEffect(() => {
    fetch('/api/auth/session', { credentials: 'include' })
      .then((r) => r.json())
      .then((session) => {
        if (session?.email) {
          setData((d) => ({ ...d, email: session.email }))
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
            gender: m.gender || '',
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
        if (memberInfo?.communicationPrefs) {
          const prefs = memberInfo.communicationPrefs as Record<string, boolean>
          setData((d) => ({
            ...d,
            preferences: {
              community: prefs.community ?? d.preferences.community,
              security: prefs.security ?? false,
              ai: prefs.ai ?? false,
              cloud: prefs.cloud ?? false,
              training: prefs.training ?? false,
              workshops: prefs.workshops ?? false,
              opportunities: prefs.opportunities ?? false,
              projects: prefs.projects ?? false,
            },
          }))
        }
      })
  }, [])

  const update = <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => {
    // Always lowercase email values
    const finalValue = key === 'email' && typeof value === 'string'
      ? (value.trim().toLowerCase() as OnboardingData[K])
      : value
    setData((d) => ({ ...d, [key]: finalValue }))
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
    const fieldsToShow: string[] = []

    if (step === 0) {
      if (!validators.required(data.email).valid) {
        if (touched.email) errors.email = 'Email requis'
        fieldsToShow.push('email')
      } else if (!validators.email(data.email).valid) {
        if (touched.email) errors.email = 'Email invalide'
        fieldsToShow.push('email')
      }
      if (!validators.required(data.firstName).valid) {
        if (touched.firstName) errors.firstName = 'Prénom requis'
        fieldsToShow.push('firstName')
      }
      if (!validators.required(data.lastName).valid) {
        if (touched.lastName) errors.lastName = 'Nom requis'
        fieldsToShow.push('lastName')
      }
      if (!validators.required(data.country).valid) {
        if (touched.country) errors.country = 'Pays requis'
        fieldsToShow.push('country')
      }
    }

    if (step === 1) {
      if (data.poles.length === 0) {
        setError('Sélectionne au moins un pôle')
        return false
      }
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const next = () => {
    // Mark all step 0 fields as touched before validating
    if (currentStep === 0) {
      setTouched((t) => ({
        ...t,
        email: true,
        firstName: true,
        lastName: true,
        country: true,
      }))
    }
    if (!validateStep(currentStep)) return
    setDirection('forward')
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const back = () => {
    setDirection('backward')
    setCurrentStep((s) => Math.max(s - 1, 0))
  }

  const isStepComplete = (step: number): boolean => {
    switch (step) {
      case 0: return !!(data.firstName || data.lastName || data.email)
      case 1: return data.poles && data.poles.length > 0
      case 2: return data.interests && data.interests.length > 0
      case 3: return true // preferences are optional
      case 4: return true // confirmation
      default: return false
    }
  }

  const goTo = (step: number) => {
    if (step > currentStep && !isStepComplete(step - 1)) {
      const confirmed = window.confirm(`L'étape ${step} n'est pas encore complétée. Continuer quand même ?`)
      if (!confirmed) return
    }
    setDirection(step < currentStep ? 'backward' : 'forward')
    setCurrentStep(step)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
          gender: data.gender || null,
          country: data.country,
          city: data.city,
          phone: data.phone,
          occupation: data.occupation,
          linkedinUrl: data.linkedinUrl,
          bio: data.bio,
          poles: data.poles,
          interests: data.interests,
          communicationPrefs: data.preferences,
        }),
      })

      if (res.ok) {
        setSuccess(true)
        toast('Bienvenue dans la communauté !', 'success')
        try {
          localStorage.removeItem('onboarding_draft')
        } catch {
          // ignore
        }
        setTimeout(() => {
          startTransition(() => {
            router.push('/profile')
          })
        }, 2000)
      } else {
        const err = await res.json()
        const msg = err.error || 'Une erreur est survenue'
        setError(msg)
        toast(msg, 'error')
      }
    } catch (e) {
      const msg = 'Erreur réseau'
      setError(msg)
      toast(msg, 'error')
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
                onClick={() => goTo(i)}
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
        <Breadcrumbs />
        {showResumeBanner && (
          <div style={{
            background: '#fef3c7', border: '1px solid #fcd34d',
            borderRadius: '10px', padding: '12px 16px', marginBottom: '24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '12px', flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '14px', color: '#92400e' }}>
              Tu as une session en cours. Tu peux continuer où tu t'étais arrêté.
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="secondary-button"
                style={{ fontSize: '13px', padding: '6px 12px' }}
                onClick={() => {
                  setShowResumeBanner(false)
                  setCurrentStep(0)
                  localStorage.removeItem('onboarding_draft')
                }}
              >
                Recommencer
              </button>
              <button
                className="primary-button"
                style={{ fontSize: '13px', padding: '6px 12px' }}
                onClick={() => setShowResumeBanner(false)}
              >
                Continuer
              </button>
            </div>
          </div>
        )}

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
          {currentStep === 0 && <StepProfile data={data} update={update} errors={fieldErrors} onBlur={(key) => setTouched((t) => ({ ...t, [key]: true }))} />}
          {currentStep === 1 && <StepPoles data={data} togglePole={togglePole} setLevel={setPoleLevel} />}
          {currentStep === 2 && <StepInterests data={data} toggle={toggleInterest} />}
          {currentStep === 3 && <StepPreferences data={data} toggle={togglePreference} />}
          {currentStep === 4 && <StepConfirm data={data} />}
        </div>

        {/* Footer navigation */}
        <div className="wizard-footer">
          <div className="wizard-footer-info">
            {currentStep === 0 ? '~ 2 minutes' : `Étape ${currentStep + 1} sur ${STEPS.length}`}
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

function StepProfile({ data, update, errors, onBlur }: StepProps) {
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
        <div className="form-group">
          <div className="form-group-header">
            <label htmlFor="email" className="form-label">
              <Mail size={14} />
              Adresse email
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
              onBlur={() => onBlur('email')}
              placeholder="nom.prenom@email.com"
              className="input-premium"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
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
              onBlur={() => onBlur('firstName')}
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
              onBlur={() => onBlur('lastName')}
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
              onBlur={() => onBlur('country')}
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
              onBlur={() => onBlur('city')}
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
              onBlur={() => onBlur('age')}
              placeholder="25"
              className="input-premium"
            />
          </div>

          <div className="form-group">
            <label htmlFor="gender" className="form-label">Genre</label>
            <select
              id="gender"
              value={data.gender}
              onChange={(e) => update('gender', e.target.value)}
              className="select-premium"
            >
              {GENDERS.map((g) => (
                <option key={g.id} value={g.id}>{g.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
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
          <div style={{ position: 'relative' }}>
            <textarea
              id="bio"
              value={data.bio}
              onChange={(e) => update('bio', e.target.value)}
              placeholder="Présente-toi en quelques mots..."
              maxLength={500}
              rows={3}
              className="textarea-premium"
            />
            <span style={{
              position: 'absolute',
              bottom: '8px',
              right: '12px',
              fontSize: '11px',
              color: 'var(--muted-foreground)',
            }}>
              {(data.bio || '').length}/500
            </span>
          </div>
        </div>
      </div>
    </>
  )
}

type StepPolesProps = {
  data: OnboardingData
  togglePole: (slug: string) => void
  setLevel: (slug: string, level: string) => void
}

function StepPoles({ data, togglePole, setLevel }: StepPolesProps) {
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
          const selected = data.poles.find((p) => p.slug === pole.slug)
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
                <div style={{ marginTop: '12px' }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', marginTop: '8px' }}>
                    {(['beginner', 'intermediate', 'advanced'] as const).map((lvl, i) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setLevel(pole.slug, lvl)}
                        style={{
                          flex: 1,
                          padding: '10px 8px',
                          fontSize: '12px',
                          fontWeight: selected.level === lvl ? '700' : '500',
                          background: selected.level === lvl ? 'var(--primary)' : 'var(--card)',
                          color: selected.level === lvl ? 'var(--primary-foreground)' : 'var(--foreground)',
                          border: 'none',
                          borderRight: i < 2 ? '1px solid var(--border)' : 'none',
                          cursor: 'pointer',
                          transition: 'all .15s',
                          minHeight: '44px',
                        }}
                      >
                        {lvl === 'beginner' ? 'Débutant' : lvl === 'intermediate' ? 'Intermédiaire' : 'Avancé'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

type StepInterestsProps = {
  data: OnboardingData
  toggle: (interest: string) => void
}

function StepInterests({ data, toggle }: StepInterestsProps) {
  const allSelected = data.interests.length === INTERESTS.length
  const toggleAll = () => {
    if (allSelected) {
      INTERESTS.forEach((interest) => {
        if (data.interests.includes(interest)) toggle(interest)
      })
    } else {
      INTERESTS.forEach((interest) => {
        if (!data.interests.includes(interest)) toggle(interest)
      })
    }
  }

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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
          {data.interests.length} / {INTERESTS.length} sélectionnés
        </span>
        <button
          type="button"
          className="text-button"
          onClick={toggleAll}
          style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}
        >
          {allSelected ? 'Tout deselectionner' : 'Tout selectionner'}
        </button>
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

type StepPreferencesProps = {
  data: OnboardingData
  toggle: (key: string) => void
}

function StepPreferences({ data, toggle }: StepPreferencesProps) {
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
