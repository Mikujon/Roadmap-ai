'use client';
import { useState, useEffect } from 'react';

interface GuardianBarProps {
  projectId?: string;
  staticMessage?: string;
  action?: string;
  onAction?: () => void;
}

export function GuardianBar({ projectId, staticMessage, action, onAction }: GuardianBarProps) {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(!!projectId);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    fetch(`/api/guardian/${projectId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId]);

  const msg = staticMessage
    || (loading ? 'Analysing…' : data?.insight?.slice(0, 140) || data?.recommendation?.slice(0, 140) || 'No issues detected.');

  const age = data?.generatedAt ? (() => {
    const diff = Date.now() - new Date(data.generatedAt).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(m / 60);
    return h > 0 ? `${h}h ago` : m > 1 ? `${m}m ago` : 'just now';
  })() : null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 13px',
      background: 'linear-gradient(to right, rgba(5,150,105,.05), transparent)',
      borderTop: '1px solid var(--border)',
    }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--guardian)', flexShrink: 0 }} className="g-dot-pulse" />
      <p style={{ fontSize: 11, color: 'var(--text2)', flex: 1, lineHeight: 1.4 }}>
        <span style={{ fontWeight: 600, color: 'var(--guardian)' }}>Guardian AI</span>
        {' · '}{msg}
        {age && <span style={{ color: 'var(--text3)' }}> · {age}</span>}
      </p>
      {action && onAction && (
        <button onClick={onAction} style={{ fontSize: 10, padding: '4px 9px', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text2)', background: 'none', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
          {action}
        </button>
      )}
    </div>
  );
}
