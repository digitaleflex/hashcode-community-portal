'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Mail,
  Briefcase,
  ShieldCheck,
  Award,
  CheckCircle2,
  XCircle,
  Save,
  ArrowLeft,
  Star,
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

type Verification = {
  memberId: string;
  emailVerified: boolean;
  linkedinVerified: boolean;
  identityVerified: boolean;
  contributor: boolean;
  trustScore?: number;
  verifiedAt?: string | null;
};

type Member = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
};

const emptyVerification = (memberId: string): Verification => ({
  memberId,
  emailVerified: false,
  linkedinVerified: false,
  identityVerified: false,
  contributor: false,
});

export default function VerifyIdentityPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [member, setMember] = useState<Member | null>(null);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/session', { credentials: 'include' });
      if (!res.ok) {
        router.push('/auth/verify');
      }
    } catch {
      router.push('/auth/verify');
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;

    setSearching(true);
    setError(null);
    setMember(null);
    setVerification(null);
    setSavedAt(null);

    try {
      const res = await fetch(`/api/admin/verify-identity?q=${encodeURIComponent(q)}`, {
        credentials: 'include',
      });
      if (res.status === 401) {
        router.push('/auth/verify');
        return;
      }
      if (res.status === 403) {
        router.push('/profile');
        return;
      }
      if (res.status === 404) {
        setError('Aucun membre trouvé pour cette recherche.');
        return;
      }
      const data = await res.json();
      setMember(data.member);
      setVerification(data.verification ?? emptyVerification(data.member.id));
    } catch {
      setError('Erreur réseau lors de la recherche.');
    } finally {
      setSearching(false);
    }
  };

  const toggleFlag = (key: keyof Omit<Verification, 'memberId' | 'trustScore' | 'verifiedAt'>) => {
    setVerification((prev) => {
      if (!prev) return prev;
      return { ...prev, [key]: !prev[key] };
    });
  };

  const computedScore = verification
    ? Number(verification.emailVerified) +
      Number(verification.linkedinVerified) +
      Number(verification.identityVerified) +
      Number(verification.contributor)
    : 0;

  const scoreComment =
    computedScore === 0
      ? 'Aucune vérification — score nul.'
      : computedScore <= 2
        ? 'Confiance limitée — vérification partielle.'
        : computedScore <= 3
          ? 'Bonne confiance — vérifications principales validées.'
          : 'Confiance élevée — tous les critères validés.';

  const handleSave = async () => {
    if (!member || !verification) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/verify-identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          memberId: member.id,
          emailVerified: verification.emailVerified,
          linkedinVerified: verification.linkedinVerified,
          identityVerified: verification.identityVerified,
          contributor: verification.contributor,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur lors de l\'enregistrement.');
        return;
      }
      setVerification(data.verification);
      setSavedAt(new Date());
    } catch {
      setError('Erreur réseau lors de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  const fullName = member
    ? `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim() || member.email
    : '';

  return (
    <main className="admin">
      <header className="site-header">
        <div className="brand">
          <span className="brand-mark">H</span>
          <span>HASHCODE <small>ADMIN</small></span>
        </div>
        <div className="header-actions">
          <button className="text-button" onClick={() => router.push('/admin')}>
            <ArrowLeft size={14} style={{ marginRight: 6 }} />
            Retour au tableau de bord
          </button>
        </div>
      </header>

      <div className="admin-wrap">
        <div className="admin-heading">
          <div>
            <p className="eyebrow">
              <span className="eyebrow-dot" /> Vérification d&apos;identité
            </p>
            <h1>Badges de confiance</h1>
            <p>Validez manuellement les critères de confiance d&apos;un membre.</p>
          </div>
        </div>

        <div className="table-panel">
          <div className="table-head">
            <div>
              <h2>Rechercher un membre</h2>
              <span>Saisir un identifiant UUID ou une adresse email.</span>
            </div>
          </div>
          <form
            onSubmit={handleSearch}
            style={{ display: 'flex', gap: 12, padding: 16 }}
          >
            <div className="search-box" style={{ flex: 1 }}>
              <Search size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="email@exemple.com ou UUID"
                aria-label="Rechercher un membre"
              />
            </div>
            <button
              type="submit"
              className="button"
              disabled={searching || !query.trim()}
              style={{ padding: '10px 20px' }}
            >
              {searching ? 'Recherche...' : 'Rechercher'}
            </button>
          </form>
        </div>

        {error && (
          <div className="error-banner" style={{ marginTop: 24 }}>
            {error}
          </div>
        )}

        {member && verification && (
          <div className="table-panel" style={{ marginTop: 24 }}>
            <div className="table-head">
              <div>
                <h2>{fullName}</h2>
                <span>{member.email}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <StatusBadge status={member.status} />
              </div>
            </div>

            <div style={{ padding: 24, display: 'grid', gap: 16 }}>
              <FlagRow
                icon={<Mail size={18} />}
                label="Email vérifié"
                checked={verification.emailVerified}
                onChange={() => toggleFlag('emailVerified')}
                description="L'adresse email a été confirmée via OTP ou magic link."
              />
              <FlagRow
                icon={<Briefcase size={18} />}
                label="LinkedIn vérifié"
                checked={verification.linkedinVerified}
                onChange={() => toggleFlag('linkedinVerified')}
                description="Le profil LinkedIn a été contrôlé et correspond."
              />
              <FlagRow
                icon={<ShieldCheck size={18} />}
                label="Identité confirmée"
                checked={verification.identityVerified}
                onChange={() => toggleFlag('identityVerified')}
                description="Une pièce d'identité a été vérifiée manuellement."
              />
              <FlagRow
                icon={<Award size={18} />}
                label="Contributeur"
                checked={verification.contributor}
                onChange={() => toggleFlag('contributor')}
                description="Le membre contribue activement à la communauté."
              />
            </div>

            <div
              style={{
                margin: '0 24px 24px',
                padding: '16px 20px',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <Star size={22} style={{ color: '#eab308' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  Score de confiance : {computedScore}/4
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                  {scoreComment}
                </div>
                {verification.verifiedAt && (
                  <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 4 }}>
                    Dernière vérification : {new Date(verification.verifiedAt).toLocaleString('fr-FR')}
                  </div>
                )}
              </div>
              <button
                className="button"
                onClick={handleSave}
                disabled={saving}
                style={{ padding: '10px 20px' }}
              >
                <Save size={14} style={{ marginRight: 6 }} />
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>

            {savedAt && (
              <div
                style={{
                  margin: '0 24px 24px',
                  padding: '10px 16px',
                  background: 'var(--success, #10b981)',
                  color: 'white',
                  borderRadius: 8,
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <CheckCircle2 size={14} />
                Vérification enregistrée à {savedAt.toLocaleTimeString('fr-FR')}.
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function FlagRow({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '14px 16px',
        border: '1px solid var(--border)',
        borderRadius: 10,
        background: checked ? 'var(--primary-glow, #f0f9ff)' : 'var(--card)',
        cursor: 'pointer',
      }}
    >
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: checked ? 'var(--primary)' : 'var(--muted)',
          color: checked ? 'white' : 'var(--muted-foreground)',
        }}
      >
        {icon}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{description}</div>
      </div>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          fontWeight: 600,
          color: checked ? 'var(--success, #10b981)' : 'var(--muted-foreground)',
        }}
      >
        {checked ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
        {checked ? 'Activé' : 'Désactivé'}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ width: 18, height: 18, cursor: 'pointer' }}
      />
    </label>
  );
}
