import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { Icon, useToast } from '../components/ui.jsx';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return toast.error('Passwords do not match');
    setBusy(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
      toast.success('Password updated');
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
          <div className="logo-mark">S</div>
          <span style={{ fontSize: 18, fontWeight: 600 }}>StepIn</span>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <Icon name="circle-check" size={40} color="var(--teal-700)" />
            <h1 style={{ fontSize: 20, margin: '12px 0 6px' }}>Password updated</h1>
            <p className="secondary" style={{ marginBottom: 20 }}>You can now log in with your new password.</p>
            <button className="primary-amber" style={{ height: 42, padding: '0 24px' }} onClick={() => navigate('/login')}>Go to log in</button>
          </div>
        ) : !token ? (
          <div>
            <h1 style={{ fontSize: 20, marginBottom: 8 }}>Invalid reset link</h1>
            <p className="secondary" style={{ marginBottom: 18 }}>This link is missing its token. Request a new reset link.</p>
            <Link to="/forgot-password">Request a new link</Link>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h1 style={{ fontSize: 20, marginBottom: 6 }}>Set a new password</h1>
            <p className="secondary" style={{ marginBottom: 18 }}>Choose a new password for your account.</p>
            <div className="field">
              <label>New password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" required autoFocus />
            </div>
            <div className="field">
              <label>Confirm password</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password" required />
            </div>
            <button className="primary-amber" type="submit" disabled={busy} style={{ width: '100%', height: 42, marginTop: 6 }}>
              {busy ? 'Updating…' : 'Update password'}
            </button>
            <div style={{ marginTop: 16, fontSize: 13, textAlign: 'center' }}>
              <Link to="/login">Back to log in</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
