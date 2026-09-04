'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowRight, LockKeyhole, CheckCircle2, Loader2, AlertCircle, Shield, ArrowLeft, Check, XCircle, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'

type ErrorType = 'invalid' | 'expired' | 'network' | 'rate_limit' | null

interface ErrorResponse {
  error?: string
  code?: string
  redirect?: string
}

export default function AuthVerifyOTP() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ErrorType>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [resent, setResent] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [loadingSession, setLoadingSession] = useState(true)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const router = useRouter()

  // Session loading effect with redirect guard
  useEffect(() => {
    const savedEmail = sessionStorage.getItem('verify_email')
    if (!savedEmail) {
      setLoadingSession(false)
      router.push('/auth/verify')
      return
    }
    setEmail(savedEmail)
    setLoadingSession(false)
  }, [router])

  // Auto-submit when code is complete
  useEffect(() => {
    if (code.length === 8 && !isVerifying && !loading) {
      handleVerify()
    }
  }, [code, isVerifying, loading])

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(prev => prev - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldown])

  const handleResend = async () => {
    if (!email || cooldown > 0) return

    setCooldown(60)
    setLoading(true)
    setError(null)
    setErrorMessage('')
    setResent(false)

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), method: 'otp' })
      })
      const data: ErrorResponse = await res.json()

      if (!res.ok) {
        setError('rate_limit')
        setErrorMessage(data.error || 'Trop de tentatives. Réessaie dans 1 minute.')
        setCooldown(0)
      } else {
        setResent(true)
      }
    } catch (err) {
      setError('network')
      setErrorMessage('Problème de connexion. Vérifie ta connexion internet.')
      setCooldown(0)
    } finally {
      setLoading(false)
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, index: number) => {
    e.preventDefault()
    const pastedText = e.clipboardData?.getData('text') || ''
    const digitsOnly = pastedText.replace(/\D/g, '')

    if (digitsOnly.length === 8) {
      for (let i = 0; i < 8; i++) {
        const input = inputRefs.current[i]
        if (input) {
          input.value = digitsOnly[i]
          input.dispatchEvent(new Event('input', { bubbles: true }))
        }
      }
      setCode(digitsOnly)
      inputRefs.current[7]?.focus()
      return
    }

    for (let i = 0; i < Math.min(digitsOnly.length, 8 - index); i++) {
      const input = inputRefs.current[index + i]
      if (input) {
        input.value = digitsOnly[i]
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }
    }
    const newIndex = Math.min(index + digitsOnly.length, 7)
    inputRefs.current[newIndex]?.focus()
  }

  const handleCodeChange = (index: number, value: string) => {
    const newCode = value.replace(/\D/g, '')
    if (newCode.length === 1 && index < 7) {
      inputRefs.current[index + 1]?.focus()
    }

    const codeArray = code.split('')
    if (index < codeArray.length) {
      codeArray[index] = newCode
    } else {
      while (codeArray.length <= index) {
        codeArray.push('')
      }
      codeArray[index] = newCode
    }
    setCode(codeArray.join(''))

    if (newCode === '' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleVerify = async () => {
    if (!email || code.length !== 8) return

    setIsVerifying(true)
    setLoading(true)
    setError(null)
    setErrorMessage('')

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      })
      const data: ErrorResponse = await res.json()

      if (res.ok) {
        router.push(data.redirect || '/onboarding')
      } else {
        // Analyse du type d'erreur
        const msg = data.error || ''
        if (msg.toLowerCase().includes('expiré') || msg.toLowerCase().includes('expire')) {
          setError('expired')
          setErrorMessage('Le code a expiré. Demande un nouveau.')
        } else if (msg.toLowerCase().includes('rate') || msg.toLowerCase().includes('tentative')) {
          setError('rate_limit')
          setErrorMessage(msg)
        } else {
          setError('invalid')
          setErrorMessage(msg || 'Code invalide. Vérifie le code reçu.')
        }
      }
    } catch (err) {
      setError('network')
      setErrorMessage('Problème de connexion. Vérifie ta connexion internet.')
    } finally {
      setIsVerifying(false)
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await handleVerify()
  }

  const getErrorIcon = () => {
    switch (error) {
      case 'expired': return <RefreshCw size={18} />
      case 'rate_limit': return <Loader2 size={18} className="animate-spin" />
      case 'network': return <XCircle size={18} />
      default: return <AlertCircle size={18} />
    }
  }

  const getErrorTitle = () => {
    switch (error) {
      case 'expired': return 'Code expiré'
      case 'rate_limit': return 'Trop de tentatives'
      case 'network': return 'Problème de connexion'
      default: return 'Code incorrect'
    }
  }

  if (loadingSession) {
    return (
      <main className="min-h-screen bg-background">
        <header className="site-header">
          <div className="brand"><span className="brand-mark">H</span><span>HASHCODE</span></div>
        </header>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '24px' }}>
          <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="skeleton" style={{ height: '24px', width: '60%' }} />
            <div className="skeleton" style={{ height: '64px' }} />
            <div className="skeleton" style={{ height: '48px' }} />
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="site-header">
        <div className="brand"><span className="brand-mark">H</span><span>HASHCODE</span></div>
        <button className="text-button" onClick={() => router.push('/auth/verify')}>
          <ArrowLeft size={16} /> Retour
        </button>
      </header>

      <div className="onboarding">
        <div className="onboarding-wrap">
          <div className="progress-bar-otp">
            <div className="progress-step active">
              <span className="step-dot active">
                <CheckCircle2 size={20} />
              </span>
              <span>Connexion</span>
            </div>
            <div className="progress-line"></div>
            <div className="progress-step">
              <span className="step-dot">2</span>
              <span>Vérification</span>
            </div>
            <div className="progress-line"></div>
            <div className="progress-step">
              <span className="step-dot">3</span>
              <span>Profil</span>
            </div>
          </div>

          <div className="verify-otp-card">
            <div className="verify-otp-header">
              <Shield size={48} className="verify-otp-icon" />
              <h1>Code de vérification</h1>
            </div>
            <p className="verify-otp-text">
              Nous avons envoyé un code à 8 chiffres à l'adresse <strong>{email || '...'}</strong>.
              Vérifiez votre boîte de réception (et le dossier spam).
            </p>

            {resent && !error && (
              <div className="success-banner" role="status">
                <CheckCircle2 size={20} />
                <span>Un nouveau code a été envoyé.</span>
              </div>
            )}

            {error && (
              <div className="error-banner error-flash">
                {getErrorIcon()}
                <div>
                  <strong>{getErrorTitle()}</strong>
                  <span>{errorMessage}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="verify-form">
              <label className="form-label">Code à 8 chiffres</label>
              <div className="otp-inputs">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
                  <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    maxLength={1}
                    value={code[index] || ''}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onPaste={(e) => handlePaste(e, index)}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !code[index] && index > 0) {
                        const newIndex = Math.max(0, index - 1)
                        inputRefs.current[newIndex]?.focus()
                      }
                    }}
                    className="otp-input"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    disabled={loading}
                  />
                ))}
              </div>

              <button
                type="submit"
                className="primary-button w-full"
                disabled={loading || code.length !== 8}
              >
                {loading ? (
                  <span className="button-loading">
                    <Loader2 className="animate-spin" size={18} />
                    Vérification...
                  </span>
                ) : (
                  <>Vérifier le code <ArrowRight size={18} /></>
                )}
              </button>

              <div className="resend-section">
                <button
                  type="button"
                  className="resend-button"
                  onClick={handleResend}
                  disabled={loading || cooldown > 0 || !email}
                >
                  {cooldown > 0 ? (
                    `Renvoyer dans ${cooldown}s`
                  ) : loading ? (
                    'Envoi...'
                  ) : (
                    'Renvoyer le code'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <footer className="footer">
        <div className="brand"><span className="brand-mark">H</span><span>HASHCODE</span></div>
        <span>© 2026 HASHCODE Community</span>
      </footer>
    </main>
  )
}