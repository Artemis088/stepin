import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { Icon, useToast, LogoMark } from '../components/ui.jsx';

export default function ForgotPassword() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(null); // { message, demoResetPath }

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim() });
      setSent(res);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#eaece7' }}>
      <div style={{ background: 'var(--surface-0)', border: '0.5px solid var(--border)', borderRadius: 16, padding: 30, width: '100%', maxWidth: 400 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 22 }}>
          <LogoMark />
          <span style={{ fontSize: 18, fontWeight: 600 }}>StepIn</span>
        </div>

        {!sent ? (
          <form onSubmit={submit}>
            <h1 style={{ fontSize: 20, marginBottom: 6 }}>Reset your password</h1>
            <p className="secondary" style={{ marginBottom: 18, lineHeight: 1.55 }}>
              Enter your account email and we'll send a link to set a new password.
            </p>
            <div className="field">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus />
            </div>
            <button className="primary-amber" type="submit" disabled={busy} style={{ width: '100%', height: 42, marginTop: 6 }}>
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
            <div style={{ marginTop: 16, fontSize: 13, textAlign: 'center' }}>
              <Link to="/login">Back to log in</Link>
            </div>
          </form>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--teal-50)', color: 'var(--teal-900)', borderRadius: 10, padding: '12px 14px', fontSize: 13, lineHeight: 1.5 }}>
              <Icon name="mail-check" size={18} color="var(--teal-700)" />
              <span>{sent.message}</span>
            </div>

            {sent.demoResetPath && (
              <div style={{ marginTop: 16, border: '0.5px dashed var(--border-strong)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="flask" size={13} /> Demo — this link would normally arrive by email
                </div>
                <Link to={sent.demoResetPath} style={{ fontSize: 13, wordBreak: 'break-all' }}>
                  Open reset link →
                </Link>
              </div>
            )}

            <div style={{ marginTop: 18, fontSize: 13, textAlign: 'center' }}>
              <Link to="/login">Back to log in</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
