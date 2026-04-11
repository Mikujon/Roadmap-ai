export type StatusLevel = 'critical' | 'at-risk' | 'on-track' | 'paused' | 'done' | 'blocked' | 'not-started' | 'pending';

const STATUS_CONFIG: Record<StatusLevel, { label: string; color: string; bg: string; border: string }> = {
  critical:    { label: 'Critical',    color: 'var(--red-text)',    bg: 'var(--red-bg)',    border: 'var(--red-border)'    },
  'at-risk':   { label: 'At risk',     color: 'var(--amber-text)',  bg: 'var(--amber-bg)',  border: 'var(--amber-border)'  },
  'on-track':  { label: 'On track',    color: 'var(--green-text)',  bg: 'var(--green-bg)',  border: 'var(--green-border)'  },
  blocked:     { label: 'Blocked',     color: 'var(--red-text)',    bg: 'var(--red-bg)',    border: 'var(--red-border)'    },
  paused:      { label: 'Paused',      color: 'var(--text2)',       bg: 'var(--surface2)',  border: 'var(--border)'        },
  done:        { label: 'Done',        color: 'var(--green-text)',  bg: 'var(--green-bg)',  border: 'var(--green-border)'  },
  'not-started':{ label: 'Not started', color: 'var(--text2)',      bg: 'var(--surface2)', border: 'var(--border)'        },
  pending:     { label: 'Pending',     color: 'var(--amber-text)',  bg: 'var(--amber-bg)',  border: 'var(--amber-border)'  },
};

export function StatusBadge({ status }: { status: StatusLevel }) {
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG['not-started'];
  return (
    <span style={{
      fontSize: 10, fontWeight: 600,
      padding: '2px 7px', borderRadius: 4,
      color: c.color, background: c.bg,
      border: `1px solid ${c.border}`,
      whiteSpace: 'nowrap',
    }}>
      {c.label}
    </span>
  );
}

/** Map health status strings → StatusLevel */
export function healthToStatus(s: string): StatusLevel {
  if (s === 'OFF_TRACK')   return 'critical';
  if (s === 'AT_RISK')     return 'at-risk';
  if (s === 'ON_TRACK')    return 'on-track';
  if (s === 'COMPLETED')   return 'done';
  if (s === 'NOT_STARTED') return 'not-started';
  return 'not-started';
}
