import { createContext, useContext, useState, useCallback } from 'react';
import { useT } from '../i18n.jsx';

/* Tabler icon (loaded via the webfont in index.html) */
export function Icon({ name, size = 18, color, style, className = '' }) {
  return (
    <i
      className={`ti ti-${name} ${className}`}
      style={{ fontSize: size, color, lineHeight: 1, ...style }}
      aria-hidden="true"
    />
  );
}

/* ---------------------------- StepIn logo ------------------------------- *
 * "In" drawn as a dark bar (the I) + an open door: darker-green frame,
 * lighter-green leaf, dark handle dot, pale floor spill. Exact brand colors. */
const LOGO = { dark: '#2B2B2B', greenDark: '#5F7566', greenLight: '#7C9482', floor: '#D5E0D5' };

export function DoorGlyph({ size = 32 }) {
  return (
    <svg width={size} height={(size * 64) / 60} viewBox="0 0 60 64" fill="none" role="img" aria-label="StepIn">
      {/* pale floor spilling from the open door */}
      <path d="M27 50 L46 48 L56 62 L16 62 Z" fill={LOGO.floor} />
      {/* doorframe (darker green) */}
      <rect x="37" y="10" width="13" height="42" rx="3" fill={LOGO.greenDark} />
      {/* open door leaf (lighter green), hinged right, ajar toward viewer */}
      <path d="M44 10 L27 15 V54 L44 52 Z" fill={LOGO.greenLight} />
      {/* the "I" bar */}
      <rect x="9" y="13" width="9" height="39" rx="4.5" fill={LOGO.dark} />
      {/* door handle */}
      <circle cx="32.5" cy="33" r="2.6" fill={LOGO.dark} />
    </svg>
  );
}

/* Icon-only mark: the glyph on a light rounded square (app-icon style). */
export function LogoMark({ size = 32, radius = 9 }) {
  return (
    <span
      style={{ width: size, height: size, borderRadius: radius, background: '#fff', border: '1px solid #e6e8e3', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
      aria-label="StepIn"
    >
      <DoorGlyph size={Math.round(size * 0.66)} />
    </span>
  );
}

/* Full lockup: "Step" (dark) + the door standing in for "In", optional tagline. */
export function Logo({ height = 40, tagline = false }) {
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: Math.round(height * 0.22) }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: Math.round(height * 0.02) }} aria-label="StepIn">
        <span style={{ fontSize: height, fontWeight: 600, letterSpacing: '-0.03em', color: LOGO.dark, lineHeight: 1 }}>Step</span>
        <DoorGlyph size={Math.round(height * 1.16)} />
      </span>
      {tagline && (
        <span style={{ fontSize: Math.max(9, Math.round(height * 0.24)), letterSpacing: '0.28em', textTransform: 'uppercase', color: LOGO.greenLight, whiteSpace: 'nowrap' }}>
          Your first step, your future
        </span>
      )}
    </span>
  );
}

/* Password input with a show/hide (eye) toggle. Drop-in for a password <input>;
   forwards the usual input props and manages its own reveal state. */
export function PasswordInput({
  value,
  onChange,
  placeholder = '••••••••',
  autoComplete = 'current-password',
  required,
  name,
  id,
  autoFocus,
  style,
}) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative', ...style }}>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        name={name}
        id={id}
        autoFocus={autoFocus}
        style={{ width: '100%', paddingRight: 38 }}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        title={show ? 'Hide password' : 'Show password'}
        tabIndex={-1}
        style={{
          position: 'absolute',
          right: 4,
          top: 0,
          bottom: 0,
          width: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          color: 'var(--text-muted)',
        }}
      >
        <Icon name={show ? 'eye-off' : 'eye'} size={17} />
      </button>
    </div>
  );
}

export function Chip({ tone = 'neutral', icon, children, style }) {
  return (
    <span className={`chip ${tone}`} style={style}>
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  );
}

export function Avatar({ initials, role = 'student', size = 34 }) {
  return (
    <div
      className={`avatar ${role}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  );
}

export function Bar({ value, max = 100, color = 'var(--amber)' }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="bar">
      <span style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function Stat({ label, children, valueColor }) {
  return (
    <div className="stat">
      <div className="k">{label}</div>
      <div className="v" style={{ color: valueColor }}>
        {children}
      </div>
    </div>
  );
}

/* Deadline countdown chip: amber if urgent (<=2d), bad if overdue */
export function Countdown({ deadline, prefix, urgentDays = 2, english = false }) {
  const { t, en } = useT();
  const cd = deadline;
  if (!cd) return null;
  let tone = 'neutral';
  if (cd.overdue) tone = 'amber';
  else if (cd.days <= urgentDays) tone = 'amber';
  // Build the label client-side. `english` keeps it in English regardless of toggle.
  const L = english ? en : t;
  const label = cd.overdue ? L('time.overdue') : cd.days === 0 ? L('time.today') : L('time.inDays', { n: cd.days });
  return (
    <Chip tone={tone} icon={cd.overdue ? 'alert-triangle' : 'clock'}>
      {prefix ? `${prefix} ` : ''}
      {label}
    </Chip>
  );
}

/* -------------------------- Toast system -------------------------------- */
const ToastCtx = createContext(null);
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, type = 'default') => {
    const idn = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id: idn, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== idn)), 3800);
  }, []);
  const toast = {
    show: (m) => push(m, 'default'),
    success: (m) => push(m, 'success'),
    error: (m) => push(m, 'error'),
  };
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/* ----------------------------- Modal ------------------------------------ */
export function Modal({ open, onClose, title, children, footer, width = 520 }) {
  if (!open) return null;
  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="spread" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 17 }}>{title}</h3>
            <button className="link" onClick={onClose} aria-label="Close">
              <Icon name="x" size={18} color="var(--text-muted)" />
            </button>
          </div>
        )}
        {children}
        {footer && <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>{footer}</div>}
      </div>
    </div>
  );
}

export function Spinner({ label = 'Loading…' }) {
  return <div className="empty">{label}</div>;
}

export function EmptyState({ icon = 'inbox', title, children }) {
  return (
    <div className="empty">
      <Icon name={icon} size={30} color="var(--text-muted)" />
      <div style={{ marginTop: 10, fontWeight: 500, color: 'var(--text-secondary)' }}>{title}</div>
      {children && <div style={{ marginTop: 4 }}>{children}</div>}
    </div>
  );
}

/* Structured star rating input */
export function StarPicker({ value = 0, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          className="link"
          onClick={() => onChange(n)}
          type="button"
          style={{ padding: 0 }}
        >
          <Icon name={n <= value ? 'star-filled' : 'star'} size={20} color={n <= value ? 'var(--amber)' : 'var(--border-strong)'} />
        </button>
      ))}
    </div>
  );
}
