'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface AlertItem {
  id: string;
  title: string;
  detail: string;
  level: string;
  requiresValidation: boolean;
  project?: { id: string; name: string } | null;
  createdAt: string;
}

export function ValidationInbox({ alerts }: { alerts: AlertItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(alerts);
  const [busy, setBusy]   = useState<string | null>(null);

  const validate = async (id: string, action: 'approve' | 'reject') => {
    setBusy(id);
    try {
      await fetch(`/api/alerts/${id}/validate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      setItems(p => p.filter(a => a.id !== id));
    } finally {
      setBusy(null);
    }
  };

  if (!items.length) {
    return (
      <div style={{ padding: '16px 13px', textAlign: 'center', fontSize: 11, color: 'var(--text3)' }}>
        Inbox clear
      </div>
    );
  }

  return (
    <div>
      {items.map(a => (
        <div key={a.id} style={{ padding: '12px 13px', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>{a.title}</p>
          <p style={{ fontSize: 10, color: 'var(--text2)', marginTop: 3, lineHeight: 1.4 }}>{a.detail}</p>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <button
              disabled={busy === a.id}
              onClick={() => validate(a.id, 'approve')}
              style={{ fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 5, background: 'var(--green-bg)', color: 'var(--green-text)', border: '1px solid var(--green-border)', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Approve ✓
            </button>
            <button
              disabled={busy === a.id}
              onClick={() => validate(a.id, 'reject')}
              style={{ fontSize: 10, padding: '4px 10px', borderRadius: 5, background: 'none', color: 'var(--red-text)', border: '1px solid var(--red-border)', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Reject
            </button>
            {a.project?.id && (
              <button
                onClick={() => router.push(`/projects/${a.project!.id}`)}
                style={{ fontSize: 10, padding: '4px 10px', borderRadius: 5, background: 'none', color: 'var(--text2)', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                View →
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
