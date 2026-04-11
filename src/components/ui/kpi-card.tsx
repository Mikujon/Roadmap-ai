export type KpiIntent = 'default' | 'danger' | 'warn' | 'ok' | 'info';

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  intent: KpiIntent;
  accent?: string; // large background icon/char
}

const BG: Record<KpiIntent, string> = {
  default: 'var(--surface)',
  danger:  'var(--red-bg)',
  warn:    'var(--amber-bg)',
  ok:      'var(--green-bg)',
  info:    'var(--blue-bg)',
};
const BORDER: Record<KpiIntent, string> = {
  default: 'var(--border)',
  danger:  'var(--red-border)',
  warn:    'var(--amber-border)',
  ok:      'var(--green-border)',
  info:    'var(--blue-border)',
};
const VALUE_COLOR: Record<KpiIntent, string> = {
  default: 'var(--text)',
  danger:  'var(--red-text)',
  warn:    'var(--amber-text)',
  ok:      'var(--green-text)',
  info:    'var(--blue-text)',
};

export function KpiCard({ label, value, sub, intent, accent }: KpiCardProps) {
  return (
    <div style={{
      background: BG[intent],
      border: `1px solid ${BORDER[intent]}`,
      borderRadius: 'var(--radius-lg)',
      padding: '13px 15px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>
        {label}
      </p>
      <p style={{ fontSize: 24, fontWeight: 700, lineHeight: 1, letterSpacing: '-.5px', color: VALUE_COLOR[intent] }}>
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: 10, marginTop: 4, color: VALUE_COLOR[intent], opacity: .7 }}>{sub}</p>
      )}
      {accent && (
        <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', opacity: .12, fontSize: 36, fontWeight: 900, color: VALUE_COLOR[intent], pointerEvents: 'none' }}>
          {accent}
        </span>
      )}
    </div>
  );
}
