'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUp, ArrowDown, Users, Activity, UserPlus, TrendingUp, RefreshCw } from 'lucide-react';
import UserSidebar from '@/components/UserSidebar';

interface TrendsData {
  currentMonth: {
    total: number;
    active: number;
    newMembers: number;
    engagementRate: number;
  };
  previousMonth: {
    total: number;
    active: number;
    newMembers: number;
    engagementRate: number;
  };
  percentageChanges: {
    totalMembers: number;
    activeMembers: number;
    newMembers: number;
    engagementRate: number;
  };
}

interface MetricCardProps {
  title: string;
  icon: React.ReactNode;
  current: number;
  previous: number;
  change: number;
  suffix?: string;
  isPercent?: boolean;
}

function MetricCard({ title, icon, current, previous, change, suffix = '', isPercent = false }: MetricCardProps) {
  const isPositive = change > 0;
  const isNegative = change < 0;
  const isNeutral = change === 0;
  const color = isPositive ? '#10b981' : isNegative ? '#ef4444' : '#6b7280';

  return (
    <div className="table-panel" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        {icon}
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted-foreground)', margin: 0 }}>{title}</h3>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 32, fontWeight: 700, color: 'var(--foreground)' }}>
          {isPercent ? `${current}${suffix}` : current.toLocaleString('fr-FR') + suffix}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
          Mois précédent : {isPercent ? `${previous}${suffix}` : previous.toLocaleString('fr-FR') + suffix}
        </span>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 10px',
          borderRadius: 12,
          background: isPositive ? '#d1fae5' : isNegative ? '#fee2e2' : '#f3f4f6',
          color: color,
          fontSize: 12,
          fontWeight: 600,
        }}>
          {!isNeutral && (isPositive ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
          {isNeutral ? '0%' : `${Math.abs(change)}%`}
        </span>
      </div>
    </div>
  );
}

export default function TrendsPage() {
  const router = useRouter();
  const [data, setData] = useState<TrendsData | null>(null);
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
      const res = await fetch('/api/admin/analytics', { credentials: 'include' });
      if (res.status === 401) {
        router.push('/auth/verify');
        return;
      }
      if (res.status === 403) {
        router.push('/profile');
        return;
      }
      const result = await res.json();
      setData({
        currentMonth: result.currentMonth,
        previousMonth: result.previousMonth,
        percentageChanges: result.percentageChanges,
      });
      setError(null);
    } catch (err) {
      setError('Erreur de chargement des tendances');
    } finally {
      setLoading(false);
    }
  };

  const currentMonthLabel = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const previousDate = new Date();
  previousDate.setMonth(previousDate.getMonth() - 1);
  const previousMonthLabel = previousDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  if (loading && !data) {
    return (
      <div className="page-with-sidebar">
        <UserSidebar />
        <main className="user-main">
          <div style={{ textAlign: 'center', padding: '120px 32px' }}>
            <div className="spinner spinner-lg" style={{ margin: '0 auto 16px' }} />
            <span style={{ color: 'var(--muted-foreground)' }}>Chargement des tendances...</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-with-sidebar">
      <UserSidebar />
      <main className="user-main">
        <div className="admin-wrap">
          <div className="admin-heading">
            <div>
              <p className="eyebrow"><span className="eyebrow-dot" /> Comparaison mensuelle</p>
              <h1>Tendances</h1>
              <p>{currentMonthLabel} vs {previousMonthLabel}</p>
            </div>
            <button
              className="button"
              onClick={fetchData}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <RefreshCw size={16} />
              Actualiser
            </button>
          </div>

          {error && <div className="error-banner">{error}</div>}

          {data && (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 16,
                marginBottom: 32,
              }}>
                <MetricCard
                  title="Total Membres"
                  icon={<Users size={16} style={{ color: 'var(--muted-foreground)' }} />}
                  current={data.currentMonth.total}
                  previous={data.previousMonth.total}
                  change={data.percentageChanges.totalMembers}
                />
                <MetricCard
                  title="Membres Actifs"
                  icon={<Activity size={16} style={{ color: 'var(--muted-foreground)' }} />}
                  current={data.currentMonth.active}
                  previous={data.previousMonth.active}
                  change={data.percentageChanges.activeMembers}
                />
                <MetricCard
                  title="Nouveaux Membres"
                  icon={<UserPlus size={16} style={{ color: 'var(--muted-foreground)' }} />}
                  current={data.currentMonth.newMembers}
                  previous={data.previousMonth.newMembers}
                  change={data.percentageChanges.newMembers}
                />
                <MetricCard
                  title="Taux d'Engagement"
                  icon={<TrendingUp size={16} style={{ color: 'var(--muted-foreground)' }} />}
                  current={data.currentMonth.engagementRate}
                  previous={data.previousMonth.engagementRate}
                  change={data.percentageChanges.engagementRate}
                  suffix="%"
                  isPercent
                />
              </div>

              <div className="table-panel">
                <div className="table-head">
                  <h2>Comparaison détaillée</h2>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Métrique</th>
                        <th style={{ textAlign: 'right' }}>{previousMonthLabel}</th>
                        <th style={{ textAlign: 'right' }}>{currentMonthLabel}</th>
                        <th style={{ textAlign: 'right' }}>Évolution</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><b><Users size={14} style={{ marginRight: 6 }} />Total Membres</b></td>
                        <td style={{ textAlign: 'right' }}>{data.previousMonth.total.toLocaleString('fr-FR')}</td>
                        <td style={{ textAlign: 'right' }}>{data.currentMonth.total.toLocaleString('fr-FR')}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span style={{
                            color: data.percentageChanges.totalMembers > 0 ? '#10b981' :
                              data.percentageChanges.totalMembers < 0 ? '#ef4444' : '#6b7280',
                            fontWeight: 600,
                          }}>
                            {data.percentageChanges.totalMembers > 0 ? '+' : ''}{data.percentageChanges.totalMembers}%
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td><b><Activity size={14} style={{ marginRight: 6 }} />Membres Actifs</b></td>
                        <td style={{ textAlign: 'right' }}>{data.previousMonth.active.toLocaleString('fr-FR')}</td>
                        <td style={{ textAlign: 'right' }}>{data.currentMonth.active.toLocaleString('fr-FR')}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span style={{
                            color: data.percentageChanges.activeMembers > 0 ? '#10b981' :
                              data.percentageChanges.activeMembers < 0 ? '#ef4444' : '#6b7280',
                            fontWeight: 600,
                          }}>
                            {data.percentageChanges.activeMembers > 0 ? '+' : ''}{data.percentageChanges.activeMembers}%
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td><b><UserPlus size={14} style={{ marginRight: 6 }} />Nouveaux Membres</b></td>
                        <td style={{ textAlign: 'right' }}>{data.previousMonth.newMembers.toLocaleString('fr-FR')}</td>
                        <td style={{ textAlign: 'right' }}>{data.currentMonth.newMembers.toLocaleString('fr-FR')}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span style={{
                            color: data.percentageChanges.newMembers > 0 ? '#10b981' :
                              data.percentageChanges.newMembers < 0 ? '#ef4444' : '#6b7280',
                            fontWeight: 600,
                          }}>
                            {data.percentageChanges.newMembers > 0 ? '+' : ''}{data.percentageChanges.newMembers}%
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td><b><TrendingUp size={14} style={{ marginRight: 6 }} />Taux d'Engagement</b></td>
                        <td style={{ textAlign: 'right' }}>{data.previousMonth.engagementRate}%</td>
                        <td style={{ textAlign: 'right' }}>{data.currentMonth.engagementRate}%</td>
                        <td style={{ textAlign: 'right' }}>
                          <span style={{
                            color: data.percentageChanges.engagementRate > 0 ? '#10b981' :
                              data.percentageChanges.engagementRate < 0 ? '#ef4444' : '#6b7280',
                            fontWeight: 600,
                          }}>
                            {data.percentageChanges.engagementRate > 0 ? '+' : ''}{data.percentageChanges.engagementRate}%
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{
                marginTop: 24,
                padding: 16,
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
                <TrendingUp size={20} style={{ color: 'var(--primary)' }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    Synthèse du mois
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                    {(() => {
                      const changes = data.percentageChanges;
                      const positive = Object.values(changes).filter((v) => v > 0).length;
                      const negative = Object.values(changes).filter((v) => v < 0).length;
                      if (positive > negative) return `Tendance positive avec ${positive} indicateur(s) en hausse.`;
                      if (negative > positive) return `Tendance négative avec ${negative} indicateur(s) en baisse.`;
                      return `Stabilité globale des indicateurs ce mois-ci.`;
                    })()}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 24, textAlign: 'center' }}>
                <button
                  className="text-button"
                  onClick={() => router.push('/admin/analytics')}
                >
                  ← Retour aux analytics
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
