export type DecisionPriority = 'urgent' | 'watch' | 'good';

interface DecisionItemProps {
  priority: DecisionPriority;
  text: string;
  meta?: string;
  action?: string;
  onAction?: () => void;
  href?: string;
  onDismiss?: () => void;
}

const CONFIG: Record<DecisionPriority, { wrap: React.CSSProperties; label: React.CSSProperties; labelText: string }> = {
  urgent: {
    wrap:  { background: 'var(--urgent-glow)', borderLeft: '3px solid var(--red)', paddingLeft: 10 },
    label: { background: 'var(--red)', color: '#fff' },
    labelText: 'URGENT',
  },
  watch: {
    wrap:  { background: 'var(--warn-glow)', borderLeft: '3px solid var(--amber)', paddingLeft: 10 },
    label: { background: 'var(--amber)', color: '#fff' },
    labelText: 'WATCH',
  },
  good: {
    wrap:  { background: 'var(--ok-glow)', borderLeft: '3px solid var(--green)', paddingLeft: 10 },
    label: { background: 'var(--green)', color: '#fff' },
    labelText: 'GOOD',
  },
};

export function DecisionItem({ priority, text, meta, action, onAction, href, onDismiss }: DecisionItemProps) {
  const c = CONFIG[priority];
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '11px 13px', borderBottom: '1px solid var(--border)',
      ...c.wrap,
    }}>
      <span style={{
        fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
        whiteSpace: 'nowrap', flexShrink: 0, marginTop: 2, letterSpacing: '.04em',
        ...c.label,
      }}>
        {c.labelText}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', lineHeight: 1.4 }}>{text}</p>
        {meta && <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{meta}</p>}
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
        {action && (onAction || href) && (
          href ? (
            <a href={href} style={{ fontSize: 11, padding: '5px 11px', border: '1px solid var(--border2)', borderRadius: 6, background: 'var(--surface)', color: 'var(--text2)', cursor: 'pointer', whiteSpace: 'nowrap', textDecoration: 'none' }}>
              {action}
            </a>
          ) : (
            <button onClick={onAction} style={{ fontSize: 11, padding: '5px 11px', border: '1px solid var(--border2)', borderRadius: 6, background: 'var(--surface)', color: 'var(--text2)', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
              {action}
            </button>
          )
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            title="Dismiss"
            style={{ fontSize: 13, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, padding: '2px 4px', fontFamily: 'inherit' }}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
