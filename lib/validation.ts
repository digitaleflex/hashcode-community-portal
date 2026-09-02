// Validation utilities for forms
// Inspired by react-hook-form / zod patterns for real-time validation

export type ValidationResult = {
  valid: boolean
  message?: string
}

export const validators = {
  email: (value: string): ValidationResult => {
    if (!value || value.trim() === '') {
      return { valid: false, message: 'L\'email est requis' }
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value.trim())) {
      return { valid: false, message: 'Format d\'email invalide' }
    }
    return { valid: true }
  },

  name: (value: string, field: string = 'Nom'): ValidationResult => {
    if (!value || value.trim() === '') {
      return { valid: false, message: `${field} requis` }
    }
    if (value.trim().length < 2) {
      return { valid: false, message: `${field} trop court (min 2 caractères)` }
    }
    if (value.trim().length > 50) {
      return { valid: false, message: `${field} trop long (max 50 caractères)` }
    }
    return { valid: true }
  },

  age: (value: string): ValidationResult => {
    if (!value) return { valid: true } // Optionnel
    const num = parseInt(value)
    if (isNaN(num)) {
      return { valid: false, message: 'Doit être un nombre' }
    }
    if (num < 16) {
      return { valid: false, message: 'Vous devez avoir au moins 16 ans' }
    }
    if (num > 99) {
      return { valid: false, message: 'Âge invalide' }
    }
    return { valid: true }
  },

  phone: (value: string): ValidationResult => {
    if (!value) return { valid: true } // Optionnel
    // Accepte formats internationaux: +33612345678, 06 12 34 56 78, etc.
    const phoneRegex = /^[+]?[\d\s.-]{8,20}$/
    if (!phoneRegex.test(value.trim())) {
      return { valid: false, message: 'Format de téléphone invalide' }
    }
    return { valid: true }
  },

  linkedinUrl: (value: string): ValidationResult => {
    if (!value) return { valid: true } // Optionnel
    if (value.includes('linkedin.com/in/') || value.includes('linkedin.com/pub/')) {
      return { valid: true }
    }
    return { valid: false, message: 'URL LinkedIn invalide (doit contenir linkedin.com/in/)' }
  },

  url: (value: string): ValidationResult => {
    if (!value) return { valid: true } // Optionnel
    try {
      new URL(value)
      return { valid: true }
    } catch {
      return { valid: false, message: 'URL invalide' }
    }
  },

  bio: (value: string): ValidationResult => {
    if (!value) return { valid: true } // Optionnel
    if (value.length > 500) {
      return { valid: false, message: 'Bio trop longue (max 500 caractères)' }
    }
    return { valid: true }
  },

  required: (value: any, field: string = 'Ce champ'): ValidationResult => {
    if (value === null || value === undefined || value === '') {
      return { valid: false, message: `${field} requis` }
    }
    return { valid: true }
  },
}

// Helper to validate a whole form
export function validateFields(
  values: Record<string, string>,
  rules: Record<string, (value: string) => ValidationResult>
): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}
  let isValid = true

  for (const [field, validator] of Object.entries(rules)) {
    const result = validator(values[field] || '')
    if (!result.valid && result.message) {
      errors[field] = result.message
      isValid = false
    }
  }

  return { isValid, errors }
}