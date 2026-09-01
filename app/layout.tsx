import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HASHCODE Community | Registre des membres - Security · AI · Cloud',
  description: 'HASHCODE revient. Depuis 2019, des milliers de personnes ont fait partie de notre communauté. Vérifiez votre profil, mettez-le à jour et retrouvez votre place dans la nouvelle HASHCODE Community.',
  keywords: ['HASHCODE', 'community', 'cybersécurité', 'AI', 'cloud', 'registre membres', 'security', 'artificial intelligence', 'devops', 'tech community'],
  authors: [{ name: 'HASHCODE Community' }],
  creator: 'HASHCODE Community',
  publisher: 'HASHCODE Community',
  metadataBase: new URL('https://community.joinhashcode.com'),
  alternates: {
    canonical: 'https://community.joinhashcode.com',
  },
  openGraph: {
    title: 'HASHCODE Community | Registre des membres',
    description: 'HASHCODE revient. Depuis 2019, des milliers de personnes ont fait partie de notre communauté. Vérifiez votre profil, mettez-le à jour et retrouvez votre place.',
    url: 'https://community.joinhashcode.com',
    siteName: 'HASHCODE Community',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'HASHCODE Community - Registre des membres',
      },
    ],
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HASHCODE Community | Registre des membres',
    description: 'HASHCODE revient. Vérifiez votre profil et retrouvez votre place dans la nouvelle communauté.',
    images: ['/og-image.png'],
    creator: '@hashcode',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f7f4' },
    { media: '(prefers-color-scheme: dark)', color: '#17231f' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className="bg-background">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'HASHCODE Community',
              description: 'Communauté technique autour de la cybersécurité, l\'intelligence artificielle et le cloud computing.',
              url: 'https://community.joinhashcode.com',
              logo: 'https://community.joinhashcode.com/placeholder-logo.svg',
              sameAs: [
                'https://github.com/digitaleflex/hashcode-community-portal',
              ],
              contactPoint: {
                '@type': 'ContactPoint',
                email: 'noreply@joinhashcode.com',
                contactType: 'customer support',
              },
              areaServed: 'FR',
              member: {
                '@type': 'Organization',
                name: 'HASHCODE Community',
              },
            }),
          }}
        />
        <link rel="canonical" href="https://community.joinhashcode.com" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
