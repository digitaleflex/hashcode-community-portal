'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Award, ArrowLeft, Plus, Minus, RotateCw } from 'lucide-react';
import type { Level } from '@/lib/types';

type Member = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  points: number;
  level: Level;
};

const LEVEL_COLORS: Record<Level, string> = {
  Novice: '#94a3b8',
  Intermediate: '#3b82f6',
  Advanced: '#a855f7',
  Legend: '#f59e0b',
};

export default function PointsPage() {
  const router = useRouter();
  const [data, setData] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});

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
      const res = await fetch('/api/admin/points', { credentials: 'include' });
      if (res.status === 401) {
        router.push('/auth/verify');
        return;
      }
      if (res.status === 403) {
        router.push('/profile');
        return;
      }
      const result = await res.json();
      setData(result.members || []);
      setError(null);
    } catch (err) {
      setError('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const adjustPoints = async (memberId: string, delta: number) => {
    const reason = (reasons[memberId] || '').trim();
    const amount = amounts[memberId] ?? Math.abs(delta);

    if (!reason) {
      setError('Veuillez entrer une raison.');
      return;
    }
    if (!amount || amount <= 0) {
      setError('Veuillez entrer un montant valide.');
      return;
    }

    const finalDelta = delta < 0 ? -amount : amount;

    setSubmitting((prev) => ({ ...prev, [memberId]: true }));
    try {
      const res = await fetch('/api/admin/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ memberId, delta: finalDelta, reason }),
      });
      if (res.ok) {
        setAmounts((prev) => ({ ...prev, [memberId]: 0 }));
        setReasons((prev) => ({ ...prev, [memberId]: '' }));
        await fetchData();
      } else {
        const err = await res.json();
        setError(err.error || 'Erreur lors de la mise à jour');
      }
    } catch {
      setError('Erreur réseau');
    } finally {
      setSubmitting((prev) => ({ ...prev, [memberId]: false }));
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
          <button className="text-button" onClick={() => router.push('/admin/leaderboard')}>
            <Award size={14} style={{ marginRight: 4 }} />
            Leaderboard
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
              <span className="eyebrow-dot" /> Gamification
            </p>
            <h1>Points &amp; Niveaux</h1>
            <p>Attribuez ou retirez des points aux membres. Les niveaux sont calculés automatiquement.</p>
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ padding: '10px 16px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}>
            <span style={{ color: LEVEL_COLORS.Novice, fontWeight: 600 }}>Novice</span> 0–49
          </div>
          <div style={{ padding: '10px 16px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}>
            <span style={{ color: LEVEL_COLORS.Intermediate, fontWeight: 600 }}>Intermediate</span> 50–149
          </div>
          <div style={{ padding: '10px 16px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}>
            <span style={{ color: LEVEL_COLORS.Advanced, fontWeight: 600 }}>Advanced</span> 150–299
          </div>
          <div style={{ padding: '10px 16px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}>
            <span style={{ color: LEVEL_COLORS.Legend, fontWeight: 600 }}>Legend</span> 300+
          </div>
        </div>

        <div className="table-panel">
          <div className="table-head">
            <div>
              <h2>Membres</h2>
              <span>{data.length} membre(s)</span>
            </div>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Membre</th>
                  <th>Email</th>
                  <th>Points</th>
                  <th>Niveau</th>
                  <th>Ajuster</th>
                </tr>
              </thead>
              <tbody>
                {data.map((m) => {
                  const name = m.firstName || m.lastName
                    ? `${m.firstName || ''} ${m.lastName || ''}`.trim()
                    : '—';
                  const isSubmitting = submitting[m.id];
                  return (
                    <tr key={m.id}>
                      <td>
                        <span className="avatar">
                          {(m.firstName?.[0] || m.email[0]).toUpperCase()}
                          {(m.lastName?.[0] || '').toUpperCase()}
                        </span>
                        <span>
                          <b>{name}</b>
                        </span>
                      </td>
                      <td>
                        <small>{m.email}</small>
                      </td>
                      <td>
                        <b style={{ fontSize: 16 }}>{m.points}</b>
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: 12,
                            background: LEVEL_COLORS[m.level] + '22',
                            color: LEVEL_COLORS[m.level],
                            fontWeight: 600,
                            fontSize: 12,
                          }}
                        >
                          {m.level}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <input
                            type="number"
                            min={1}
                            placeholder="Montant"
                            value={amounts[m.id] ?? ''}
                            onChange={(e) =>
                              setAmounts((prev) => ({ ...prev, [m.id]: Number(e.target.value) }))
                            }
                            style={{
                              width: 80,
                              padding: '4px 8px',
                              border: '1px solid var(--border)',
                              borderRadius: 6,
                              fontSize: 13,
                            }}
                          />
                          <input
                            type="text"
                            placeholder="Raison..."
                            value={reasons[m.id] ?? ''}
                            onChange={(e) =>
                              setReasons((prev) => ({ ...prev, [m.id]: e.target.value }))
                            }
                            style={{
                              width: 140,
                              padding: '4px 8px',
                              border: '1px solid var(--border)',
                              borderRadius: 6,
                              fontSize: 13,
                            }}
                          />
                          <button
                            className="text-button"
                            onClick={() => adjustPoints(m.id, 1)}
                            disabled={isSubmitting}
                            style={{
                              color: 'var(--success, #16a34a)',
                              padding: '4px 8px',
                              fontSize: 13,
                            }}
                            title="Ajouter des points"
                          >
                            <Plus size={14} style={{ marginRight: 2 }} />
                            Ajouter
                          </button>
                          <button
                            className="text-button"
                            onClick={() => adjustPoints(m.id, -1)}
                            disabled={isSubmitting}
                            style={{
                              color: 'var(--danger, #dc2626)',
                              padding: '4px 8px',
                              fontSize: 13,
                            }}
                            title="Retirer des points"
                          >
                            <Minus size={14} style={{ marginRight: 2 }} />
                            Retirer
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>
                      Aucun membre trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}