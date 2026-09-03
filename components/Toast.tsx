'use client'
import { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'
type Toast = { id: number; type: ToastType; message: string }

let listeners: ((t: Toast) => void)[] = []
let nextId = 1

export function toast(message: string, type: ToastType = 'info') {
  const t = { id: nextId++, type, message }
  listeners.forEach(l => l(t))
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const onToast = useCallback((t: Toast) => {
    setToasts(prev => [...prev, t])
    setTimeout(() => {
      setToasts(prev => prev.filter(x => x.id !== t.id))
    }, 4000)
  }, [])

  useEffect(() => {
    listeners.push(onToast)
    return () => { listeners = listeners.filter(l => l !== onToast) }
  }, [onToast])

  return (
    <div
      role="region"
      aria-label="Notifications"
      style={{
        position: 'fixed', top: '16px', right: '16px',
        zIndex: 9999, display: 'flex', flexDirection: 'column',
        gap: '8px', maxWidth: '360px', pointerEvents: 'none',
      }}
    >
      {toasts.map(t => {
        const Icon = t.type === 'success' ? CheckCircle2 : t.type === 'error' ? AlertCircle : Info
        const color = t.type === 'success' ? '#16a34a' : t.type === 'error' ? '#dc2626' : '#0ea5e9'
        return (
          <div
            key={t.id}
            role={t.type === 'error' ? 'alert' : 'status'}
            aria-live={t.type === 'error' ? 'assertive' : 'polite'}
            style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderLeft: `4px solid ${color}`,
              borderRadius: '8px',
              padding: '12px 16px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              display: 'flex', alignItems: 'center', gap: '12px',
              pointerEvents: 'auto',
              animation: 'toast-slide-in 0.2s ease-out',
            }}
          >
            <Icon size={18} style={{ color, flexShrink: 0 }} />
            <span style={{ fontSize: '14px', flex: 1 }}>{t.message}</span>
            <button
              onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
              aria-label="Fermer"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '4px', color: 'var(--muted-foreground)',
              }}
            >
              <X size={16} />
            </button>
          </div>
        )
      })}
      <style>{`
        @keyframes toast-slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
