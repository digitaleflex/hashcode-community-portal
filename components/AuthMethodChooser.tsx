'use client'

import React from 'react'
import { Shield, LockKeyhole } from 'lucide-react'

interface AuthMethodChooserProps {
  method: 'otp' | 'magic_link'
  onChange: (method: 'otp' | 'magic_link') => void
  purpose?: 'login' | 'signup'
}

const descriptions = {
  login: {
    otp: 'Reçu par email, valable 10 minutes',
    magic_link: 'Clique directement, valable 15 minutes',
  },
  signup: {
    otp: 'Pour créer ton profil',
    magic_link: 'Inscription en un clic',
  },
}

const labels = {
  otp: 'Code à 8 chiffres',
  magic_link: 'Lien magique',
}

const icons = {
  otp: <Shield size={24} style={{ color: 'var(--primary)', marginBottom: '8px' }} />,
  magic_link: <LockKeyhole size={24} style={{ color: 'var(--primary)', marginBottom: '8px' }} />,
}

/**
 * Deduplicated auth method chooser (OTP vs Magic Link)
 * Used in both found and not_found states of auth/verify
 */
export const AuthMethodChooser = ({ method, onChange, purpose = 'login' }: AuthMethodChooserProps) => (
  <div className="choice-group">
    <label className={`choice-item ${method === 'otp' ? 'selected' : ''}`}>
      <input
        type="radio"
        name="method"
        value="otp"
        checked={method === 'otp'}
        onChange={() => onChange('otp')}
        className="choice-input"
      />
      <div className="choice-content">
        {icons.otp}
        <span className="choice-label">{labels.otp}</span>
        <span className="choice-description">{descriptions[purpose].otp}</span>
      </div>
    </label>
    <label className={`choice-item ${method === 'magic_link' ? 'selected' : ''}`}>
      <input
        type="radio"
        name="method"
        value="magic_link"
        checked={method === 'magic_link'}
        onChange={() => onChange('magic_link')}
        className="choice-input"
      />
      <div className="choice-content">
        {icons.magic_link}
        <span className="choice-label">{labels.magic_link}</span>
        <span className="choice-description">{descriptions[purpose].magic_link}</span>
      </div>
    </label>
  </div>
)