'use client'

import { Suspense } from 'react'
import AuthMagicLink from './AuthMagicLink'

export default function MagicLinkPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-background">
        <div style={{ textAlign: 'center', padding: '120px' }}>
          <div className="spinner" style={{ width: '48px', height: '48px', margin: '0 auto', border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      </main>
    }>
      <AuthMagicLink />
    </Suspense>
  )
}