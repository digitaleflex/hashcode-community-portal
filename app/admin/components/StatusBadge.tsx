'use client';

import React from 'react';

export type MemberStatus = 'imported' | 'claimed' | 'verified' | 'updated' | 'active' | 'inactive';

type StatusConfig = {
  label: string;
  className: string;
};

const STATUS_MAP: Record<MemberStatus, StatusConfig> = {
  imported:  { label: 'Importé',   className: 'status-gray' },
  claimed:   { label: 'Réclamé',   className: 'status-orange' },
  verified:  { label: 'Vérifié',   className: 'status-blue' },
  updated:   { label: 'À jour',    className: 'status-purple' },
  active:    { label: 'Actif',     className: 'status-green' },
  inactive:  { label: 'Inactif',   className: 'status-darkgray' },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const config = STATUS_MAP[status as MemberStatus] ?? {
    label: status,
    className: 'status-gray',
  };

  return (
    <span className={`status-badge ${config.className}${className ? ` ${className}` : ''}`}>
      {config.label}
    </span>
  );
}

export default StatusBadge;
