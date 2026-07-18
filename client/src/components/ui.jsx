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

/* StepIn logo mark — a door (you "step in" through it) on the brand teal tile. */
export function LogoMark({ size = 30, radius = 8 }) {
  return (
    <span
      className="logo-mark"
      style={{ width: size, height: size, borderRadius: radius, fontSize: 0 }}
      aria-label="StepIn"
    >
      <Icon name="door-enter" size={Math.round(size * 0.6)} color="#fff" />
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
export function Countdown({ deadline, prefix, urgentDays = 2 }) {
  const { t } = useT();
  const cd = deadline;
  if (!cd) return null;
  let tone = 'neutral';
  if (cd.overdue) tone = 'amber';
  else if (cd.days <= urgentDays) tone = 'amber';
  // Build the label client-side so it follows the selected language.
  const label = cd.overdue ? t('time.overdue') : cd.days === 0 ? t('time.today') : t('time.inDays', { n: cd.days });
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
