'use client'

import { useState, useEffect } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'

type Theme = 'light' | 'dark' | 'system'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('theme') as Theme | null
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    if (saved) {
      setTheme(saved)
      applyTheme(saved, prefersDark)
    } else {
      setTheme('system')
      applyTheme('system', prefersDark)
    }
  }, [])

  const applyTheme = (newTheme: Theme, prefersDark: boolean = false) => {
    const root = document.documentElement

    if (newTheme === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
    } else if (newTheme === 'light') {
      root.classList.add('light')
      root.classList.remove('dark')
    } else {
      // system
      root.classList.remove('light', 'dark')
      if (prefersDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
  }

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    applyTheme(newTheme, prefersDark)
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="theme-toggle">
      <button
        className={`theme-toggle-btn ${theme === 'light' ? 'active' : ''}`}
        onClick={() => handleThemeChange('light')}
        aria-label="Mode clair"
        aria-pressed={theme === 'light'}
      >
        <Sun size={16} />
      </button>
      <button
        className={`theme-toggle-btn ${theme === 'dark' ? 'active' : ''}`}
        onClick={() => handleThemeChange('dark')}
        aria-label="Mode sombre"
        aria-pressed={theme === 'dark'}
      >
        <Moon size={16} />
      </button>
      <button
        className={`theme-toggle-btn ${theme === 'system' ? 'active' : ''}`}
        onClick={() => handleThemeChange('system')}
        aria-label="Système"
        aria-pressed={theme === 'system'}
      >
        <Monitor size={16} />
      </button>
    </div>
  )
}