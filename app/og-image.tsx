import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#17231f',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 80,
            fontWeight: 'bold',
            color: '#d94f35',
            letterSpacing: '-.05em',
            marginBottom: 20,
          }}
        >
          HASHCODE
        </div>
        <div
          style={{
            fontSize: 28,
            color: '#ffffff',
            letterSpacing: '.05em',
          }}
        >
          Community Registry
        </div>
        <div
          style={{
            fontSize: 16,
            color: '#718079',
            marginTop: 40,
          }}
        >
          Security · AI · Cloud
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
