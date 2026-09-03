'use client'

import React from 'react'

interface HeroProps {
  eyebrow?: string
  title: React.ReactNode
  description?: React.ReactNode
  highlight?: React.ReactNode
  cta?: { label: string; onClick: () => void }
  microcopy?: string
  microcopyIcon?: React.ReactNode
  visual?: React.ReactNode
  children?: React.ReactNode
}

interface HeroVisualProps {
  codeCard?: React.ReactNode
  notes?: { top?: string; bottom?: string }
}

/**
 * Hero visual with orbit animation — can be used standalone or as default for Hero
 */
export const HeroVisual = ({ codeCard, notes }: HeroVisualProps) => (
  <div className="hero-visual">
    <div className="code-orbit">
      <div className="orbit-line orbit-one" />
      <div className="orbit-line orbit-two" />
      <div className="code-card">
        {codeCard ?? (
          <>
            <span className="code-kicker">IDENTITÉ HASHCODE</span>
            <strong>HC–26–XXXX–XX</strong>
            <span className="code-status"><span /> Vérifié · Membre actif</span>
          </>
        )}
      </div>
    </div>
    {notes?.top && <div className="visual-note note-top">{notes.top}</div>}
    {notes?.bottom && <div className="visual-note note-bottom">{notes.bottom}</div>}
  </div>
)

/**
 * Reusable two-column Hero section
 * When visual is not provided, uses default HeroVisual
 * When visual is provided, renders it in the right column
 * On mobile (no visual), renders single-column layout
 */
export const Hero = ({
  eyebrow,
  title,
  description,
  highlight,
  cta,
  microcopy,
  microcopyIcon,
  visual,
  children,
}: HeroProps) => {
  const hasVisual = !!visual

  return (
    <section className="hero">
      <div className="hero-copy">
        {eyebrow && (
          <p className="eyebrow">
            <span className="eyebrow-dot" /> {eyebrow}
          </p>
        )}
        {typeof title === 'string' ? (
          <h1>{title}</h1>
        ) : (
          <h1>{title}</h1>
        )}
        {description && <p className="hero-text">{description}</p>}
        {highlight && <p className="hero-text hero-highlight">{highlight}</p>}
        {cta && (
          <button className="primary-button" onClick={cta.onClick}>
            {cta.label}
          </button>
        )}
        {microcopy && (
          <p className="microcopy">
            {microcopyIcon} {microcopy}
          </p>
        )}
        {children}
      </div>
      {hasVisual && (
        <div className="hero-visual-wrapper">
          {visual}
        </div>
      )}
    </section>
  )
}