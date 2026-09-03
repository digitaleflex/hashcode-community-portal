'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, ArrowLeft, RotateCw, Award } from 'lucide-react';

type LeaderboardEntry = {
  rank: number;
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  points: number;
  level: 'Novice' | 'Intermediate' | 'Advanced' | 'Legend';
};

const LEVEL_COLORS: Record<LeaderboardEntry['level'], string> = {
  Novice: '#94a3b8',
  Intermediate: '#3b82f6',
  Advanced: '#a855f7',
  Legend: '#f59e0b',
};

const RANK_MEDALS: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

export default function LeaderboardPage() {
  const router = useRouter();
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/session', { credentials: 'include' });
      if (!res.ok) {
        router.push('/auth/verify');
        return;
      }
      fetchData();
    } catch {
      router.push('/auth/verify');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/leaderboard', { credentials: 'include' });
      if (res.status === 401) {
        router.push('/auth/verify');
        return;
      }
      if (res.status === 403) {
        router.push('/profile');
        return;
      }
      const result = await res.json();
      setData(result.leaderboard || []);
      setError(null);
    } catch (err) {
      setError('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  if (loading && data.length === 0) {
    return (
      <main className="admin">
        <div style={{ textAlign: 'center', padding: '120px 32px' }}>Chargement...</div>
      </main>
    );
  }

  return (
    <main className="admin">
      <header className="site-header">
        <div className="brand">
          <span className="brand-mark">H</span>
          <span>HASHCODE <small>ADMIN</small></span>
        </div>
        <div className="header-actions">
          <button className="text-button" onClick={() => router.push('/admin')}>
            <ArrowLeft size={14} style={{ marginRight: 4 }} />
            Retour
          </button>
          <button className="text-button" onClick={() => router.push('/admin/points')}>
            <Award size={14} style={{ marginRight: 4 }} />
            Gérer les points
          </button>
          <button className="text-button" onClick={fetchData}>
            <RotateCw size={14} style={{ marginRight: 4 }} />
            Rafraîchir
          </button>
        </div>
      </header>

      <div className="admin-wrap">
        <div className="admin-heading">
          <div>
            <p className="eyebrow">
              <span className="eyebrow-dot" /> Classement
            </p>
            <h1>
              <Trophy size={28} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} />
              Leaderboard
            </h1>
            <p>Top 20 des membres par points.</p>
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {data.length === 0 ? (
          <div className="table-panel" style={{ padding: 60, textAlign: 'center', color: 'var(--muted-foreground)' }}>
            Aucun membre n'a encore accumulé de points.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            {data.map((entry) => {
              const name =
                entry.firstName || entry.lastName
                  ? `${entry.firstName || ''} ${entry.lastName || ''}`.trim()
                  : entry.email;
              const medal = RANK_MEDALS[entry.rank];

              return (
                <div
                  key={entry.id}
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    boxShadow: medal ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      flexShrink: 0,
                      borderRadius: '50%',
                      background: medal ? 'var(--primary-glow, #fef2f2)' : 'var(--bg, #f8fafc)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: medal ? 22 : 14,
                      fontWeight: 700,
                      color: medal ? undefined : 'var(--muted-foreground)',
                    }}
                  >
                    {medal || `#${entry.rank}`}
                  </div>

                  <span className="avatar" style={{ flexShrink: 0 }}>
                    {(entry.firstName?.[0] || entry.email[0]).toUpperCase()}
                    {(entry.lastName?.[0] || '').toUpperCase()}
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {name}
                    </div>
                    <small style={{ color: 'var(--muted-foreground)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {entry.email}
                    </small>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: 18 }}>{entry.points}</div>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 10,
                        background: LEVEL_COLORS[entry.level] + '22',
                        color: LEVEL_COLORS[entry.level],
                        fontWeight: 600,
                        fontSize: 11,
                      }}
                    >
                      {entry.level}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}