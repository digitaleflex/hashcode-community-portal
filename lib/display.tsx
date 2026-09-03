// ── SHARED DISPLAY HELPERS ───────────────────────────────
// Single source of truth for pole/level/preference labels used by
// the profile page, the public member page and the wizard.

import {
  Shield,
  Brain,
  Cloud,
  Users,
  BookOpen,
  Wrench,
  Target,
  Rocket,
  Pin,
  type LucideIcon,
} from 'lucide-react'

export const POLE_SLUGS = ['security', 'ai', 'cloud'] as const

export const poleIcon = (slug: string, size = 20) => {
  switch (slug) {
    case 'security': return <Shield size={size} />
    case 'ai': return <Brain size={size} />
    case 'cloud': return <Cloud size={size} />
    default: return null
  }
}

export const poleLabel = (slug: string) => {
  switch (slug) {
    case 'security': return 'HASHCODE Security'
    case 'ai': return 'HASHCODE AI'
    case 'cloud': return 'HASHCODE Cloud'
    default: return slug
  }
}

export const poleDescription = (slug: string) => {
  switch (slug) {
    case 'security': return 'Cybersécurité, pentesting, audit'
    case 'ai': return 'Intelligence artificielle, ML, Data'
    case 'cloud': return 'Cloud computing, DevOps, Infra'
    default: return ''
  }
}

export const levelLabel = (level: string) => {
  switch (level) {
    case 'beginner': return 'Débutant'
    case 'intermediate': return 'Intermédiaire'
    case 'advanced': return 'Avancé'
    case 'expert': return 'Expert'
    default: return level
  }
}

export const levelColor = (level: string) => {
  switch (level) {
    case 'beginner': return '#16a34a'
    case 'intermediate': return '#d97706'
    case 'advanced': return '#dc2626'
    case 'expert': return '#7c3aed'
    default: return '#6b7280'
  }
}

export const commPrefLabel = (key: string) => {
  switch (key) {
    case 'community': return 'Communauté'
    case 'security': return 'HASHCODE Security'
    case 'ai': return 'HASHCODE AI'
    case 'cloud': return 'HASHCODE Cloud'
    case 'training': return 'Formations'
    case 'workshops': return 'Workshops'
    case 'opportunities': return 'Opportunités'
    case 'projects': return 'Projets'
    default: return key
  }
}

const COMM_PREF_ICONS: Record<string, LucideIcon> = {
  community: Users,
  security: Shield,
  ai: Brain,
  cloud: Cloud,
  training: BookOpen,
  workshops: Wrench,
  opportunities: Target,
  projects: Rocket,
}

export const commPrefIcon = (key: string, size = 18) => {
  const Icon = COMM_PREF_ICONS[key] ?? Pin
  return <Icon size={size} strokeWidth={1.75} />
}

export const getInitials = (firstName?: string | null, lastName?: string | null) => {
  const f = firstName?.trim()?.[0] || ''
  const l = lastName?.trim()?.[0] || ''
  return (f + l).toUpperCase() || '?'
}

export const genderLabel = (gender: string) => {
  switch (gender) {
    case 'male': return 'Masculin'
    case 'female': return 'Féminin'
    case 'other': return 'Autre'
    case 'prefer_not_to_say': return 'Préfère ne pas dire'
    default: return gender
  }
}

export const genderColor = (gender: string) => {
  switch (gender) {
    case 'male': return '#3b82f6'
    case 'female': return '#ec4899'
    case 'other': return '#8b5cf6'
    case 'prefer_not_to_say': return '#6b7280'
    default: return '#6b7280'
  }
}
