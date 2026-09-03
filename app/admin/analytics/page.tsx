'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, TrendingUp, Activity, PieChart, Download, BarChart3, Users2 } from 'lucide-react';
import UserSidebar from '@/components/UserSidebar';
import { genderLabel, genderColor } from '@/lib/display';

interface AnalyticsData {
  summary: {
    totalMembers: number;
    activeMembers: number;
    engagementRate: number;
    importedFromExcel: number;
  };
  membersByMonth: Array<{
    year: number;
    month: number;
    label: string;
    count: number;
  }>;
  polesDistribution: Array<{
    name: string;
    slug: string;
    count: number;
    percentage: number;
  }>;
  statusBreakdown: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  genderBreakdown: Array<{
    gender: string;
    count: number;
    percentage: number;
  }>;
  importSource: {
    excel: number;
    other: number;
  };
}

const STATUS_LABELS: Record<string, string> = {
  imported: 'Importé',
  claimed: 'Réclamé',
  verified: 'Vérifié',
  updated: 'À jour',
  active: 'Actif',
  inactive: 'Inactif',
};

const STATUS_COLORS: Record<string, string> = {
  imported: '#6b7280',
  claimed: '#f59e0b',
  verified: '#3b82f6',
  updated: '#8b5cf6',
  active: '#10b981',
  inactive: '#ef4444',
};

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

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
      setData(result);
      setError(null);
    } catch (err) {
      setError('Erreur de chargement des analytics');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const rows = [
        ['Métrique', 'Valeur'],
        ['Total Membres', data.summary.totalMembers],
        ['Membres Actifs', data.summary.activeMembers],
        ['Taux d\'Engagement (%)', data.summary.engagementRate],
        ['Importés depuis Excel', data.summary.importedFromExcel],
        [],
        ['Distribution par Pôles'],
        ['Pôle', 'Membres', 'Pourcentage (%)'],
        ...data.polesDistribution.map((p) => [p.name, p.count, p.percentage]),
        [],
        ['Répartition par Statut'],
        ['Statut', 'Membres', 'Pourcentage (%)'],
        ...data.statusBreakdown.map((s) => [STATUS_LABELS[s.status] || s.status, s.count, s.percentage]),
        [],
        ['Répartition par Genre'],
        ['Genre', 'Membres', 'Pourcentage (%)'],
        ...data.genderBreakdown.map((g) => [genderLabel(g.gender), g.count, g.percentage]),
        [],
        ['Croissance par Mois'],
        ['Mois', 'Nouveaux Membres'],
        ...data.membersByMonth.map((m) => [m.label, m.count]),
      ];

      const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `hashcode-analytics-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Erreur lors de l\'export');
    } finally {
      setExporting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="page-with-sidebar">
        <UserSidebar />
        <main className="user-main">
          <div style={{ textAlign: 'center', padding: '120px 32px' }}>
            <div className="spinner spinner-lg" style={{ margin: '0 auto 16px' }} />
            <span style={{ color: 'var(--muted-foreground)' }}>Chargement des analytics...</span>
          </div>
        </main>
      </div>
    );
  }

  const maxPoleCount = Math.max(...(data?.polesDistribution.map((p) => p.count) || [1]));
  const maxMonthlyCount = Math.max(...(data?.membersByMonth.map((m) => m.count) || [1]));

  return (
    <div className="page-with-sidebar">
      <UserSidebar />
      <main className="user-main">
        <div className="admin-wrap">
          <div className="admin-heading">
            <div>
              <p className="eyebrow"><span className="eyebrow-dot" /> Rapports</p>
              <h1>Analytics & Reporting</h1>
              <p>Statistiques et insights de la communauté HASHCODE</p>
            </div>
            <button
              className="button"
              onClick={exportCSV}
              disabled={exporting || !data}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Download size={16} />
              {exporting ? 'Export...' : 'Export CSV'}
            </button>
          </div>

          {error && <div className="error-banner">{error}</div>}

          {data && (
            <>
              <div className="metric-grid">
                <div>
                  <span><Users size={16} style={{ marginRight: 6 }} />Total membres</span>
                  <b>{data.summary.totalMembers.toLocaleString('fr-FR')}</b>
                  <small className="up">Inscrits dans la plateforme</small>
                </div>
                <div>
                  <span><Activity size={16} style={{ marginRight: 6 }} />Membres actifs</span>
                  <b>{data.summary.activeMembers.toLocaleString('fr-FR')}</b>
                  <small className="up">{data.summary.activeMembers} avec statut actif</small>
                </div>
                <div>
                  <span><TrendingUp size={16} style={{ marginRight: 6 }} />Taux d&apos;engagement</span>
                  <b>{data.summary.engagementRate}%</b>
                  <small className={data.summary.engagementRate >= 30 ? 'up' : ''}>
                    {data.summary.engagementRate >= 30 ? 'Excellent' : 'À améliorer'}
                  </small>
                </div>
                <div>
                  <span><PieChart size={16} style={{ marginRight: 6 }} />Importés Excel</span>
                  <b>{data.summary.importedFromExcel.toLocaleString('fr-FR')}</b>
                  <small>Depuis fichier Excel</small>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
                <div className="table-panel">
                  <div className="table-head">
                    <h2><BarChart3 size={18} style={{ marginRight: 8 }} />Distribution par Pôles</h2>
                  </div>
                  <div style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {data.polesDistribution.map((pole) => (
                        <div key={pole.slug}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontWeight: 500 }}>{pole.name}</span>
                            <span style={{ color: 'var(--muted-foreground)' }}>
                              {pole.count} ({pole.percentage}%)
                            </span>
                          </div>
                          <div style={{
                            height: 8,
                            background: 'var(--border)',
                            borderRadius: 4,
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${(pole.count / maxPoleCount) * 100}%`,
                              height: '100%',
                              background: 'var(--primary)',
                              borderRadius: 4,
                              transition: 'width 0.3s ease',
                            }} />
                          </div>
                        </div>
                      ))}
                      {data.polesDistribution.length === 0 && (
                        <p style={{ color: 'var(--muted-foreground)', textAlign: 'center', padding: 20 }}>
                          Aucune donnée disponible
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="table-panel">
                  <div className="table-head">
                    <h2><PieChart size={18} style={{ marginRight: 8 }} />Statut des Membres</h2>
                  </div>
                  <div style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {data.statusBreakdown.map((status) => (
                        <div key={status.status} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 12,
                            height: 12,
                            borderRadius: 3,
                            background: STATUS_COLORS[status.status] || '#6b7280',
                            flexShrink: 0,
                          }} />
                          <span style={{ flex: 1, fontWeight: 500 }}>
                            {STATUS_LABELS[status.status] || status.status}
                          </span>
                          <span style={{ color: 'var(--muted-foreground)' }}>
                            {status.count}
                          </span>
                          <span style={{
                            background: 'var(--border)',
                            padding: '2px 8px',
                            borderRadius: 10,
                            fontSize: 12,
                            color: 'var(--muted-foreground)',
                          }}>
                            {status.percentage}%
                          </span>
                        </div>
                      ))}
                      {data.statusBreakdown.length === 0 && (
                        <p style={{ color: 'var(--muted-foreground)', textAlign: 'center', padding: 20 }}>
                          Aucune donnée disponible
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="table-panel">
                <div className="table-head">
                  <h2><Users2 size={18} style={{ marginRight: 8 }} />Distribution par Genre</h2>
                </div>
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {data.genderBreakdown.map((gender) => (
                      <div key={gender.gender}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontWeight: 500 }}>{genderLabel(gender.gender)}</span>
                          <span style={{ color: 'var(--muted-foreground)' }}>
                            {gender.count} ({gender.percentage}%)
                          </span>
                        </div>
                        <div style={{
                          height: 8,
                          background: 'var(--border)',
                          borderRadius: 4,
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${gender.percentage}%`,
                            height: '100%',
                            background: genderColor(gender.gender),
                            borderRadius: 4,
                            transition: 'width 0.3s ease',
                          }} />
                        </div>
                      </div>
                    ))}
                    {data.genderBreakdown.length === 0 && (
                      <p style={{ color: 'var(--muted-foreground)', textAlign: 'center', padding: 20 }}>
                        Aucune donnée disponible
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="table-panel">
                <div className="table-head">
                  <h2><TrendingUp size={18} style={{ marginRight: 8 }} />Croissance des Membres (12 derniers mois)</h2>
                </div>
                <div style={{ padding: '20px' }}>
                  {maxMonthlyCount > 0 ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: 8,
                      height: 200,
                      paddingBottom: 30,
                      position: 'relative',
                    }}>
                      {data.membersByMonth.map((month, index) => {
                        const height = (month.count / maxMonthlyCount) * 160;
                        return (
                          <div
                            key={`${month.year}-${month.month}`}
                            style={{
                              flex: 1,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              height: '100%',
                              justifyContent: 'flex-end',
                            }}
                          >
                            <div
                              style={{
                                width: '100%',
                                maxWidth: 40,
                                height: Math.max(height, 2),
                                background: index === data.membersByMonth.length - 1
                                  ? 'var(--primary)'
                                  : 'var(--primary-glow, #e0e7ff)',
                                borderRadius: '4px 4px 0 0',
                                transition: 'height 0.3s ease',
                                cursor: 'default',
                                position: 'relative',
                              }}
                              title={`${month.label}: ${month.count} nouveaux membres`}
                            >
                              {month.count > 0 && (
                                <div style={{
                                  position: 'absolute',
                                  top: -20,
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  fontSize: 11,
                                  color: 'var(--muted-foreground)',
                                  whiteSpace: 'nowrap',
                                }}>
                                  {month.count}
                                </div>
                              )}
                            </div>
                            <div
                              style={{
                                position: 'absolute',
                                bottom: -25,
                                fontSize: 10,
                                color: 'var(--muted-foreground)',
                                transform: 'rotate(-45deg)',
                                transformOrigin: 'top right',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {month.label}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--muted-foreground)', textAlign: 'center', padding: 40 }}>
                      Aucune donnée de croissance disponible
                    </p>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 24, textAlign: 'center' }}>
                <button
                  className="text-button"
                  onClick={() => router.push('/admin/trends')}
                >
                  Voir les tendances comparatives →
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
