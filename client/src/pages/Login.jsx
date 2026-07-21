import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { useToast, Icon, PasswordInput } from '../components/ui.jsx';
import { useT, LanguageToggle } from '../i18n.jsx';
import { roleHome } from '../roleHome.js';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const user = await login(email.trim(), password);
      toast.success(t('login.welcomeBack'));
      navigate(roleHome(user.role));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const quick = (em) => {
    setEmail(em);
    setPassword('password');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#eaece7' }}>
      <div style={{ position: 'absolute', top: 20, right: 20 }}><LanguageToggle /></div>
      <form onSubmit={submit} style={{ background: '#f4f6f3', border: '0.5px solid var(--border)', borderRadius: 16, padding: 30, width: '100%', maxWidth: 380 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
          <img src="/logo-lockup.png" alt="StepIn — your first step, your future" style={{ width: '100%', maxWidth: 300, height: 'auto', display: 'block' }} />
        </div>
        <h1 style={{ fontSize: 20, marginBottom: 18 }}>{t('login.title')}</h1>
        <div className="field">
          <label>{t('common.email')}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
        </div>
        <div className="field">
          <div className="spread">
            <label>{t('common.password')}</label>
            <Link to="/forgot-password" style={{ fontSize: 12 }}>{t('login.forgot')}</Link>
          </div>
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </div>
        <button className="primary-amber" type="submit" disabled={busy} style={{ width: '100%', height: 42, marginTop: 6 }}>
          {busy ? t('login.loggingIn') : t('login.title')}
        </button>
        <div style={{ marginTop: 16, fontSize: 13, textAlign: 'center', color: 'var(--text-secondary)' }}>
          {t('login.newHere')} <Link to="/get-started">{t('login.createAccount')}</Link>
        </div>
        <div style={{ marginTop: 20, borderTop: '0.5px solid var(--border)', paddingTop: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>{t('login.quickDemo')}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button type="button" className="sm ghost" onClick={() => quick('nino@student.ge')}>{t('role.student')}</button>
            <button type="button" className="sm ghost" onClick={() => quick('careers@tbcbank.com.ge')}>{t('role.company')}</button>
            <button type="button" className="sm ghost" onClick={() => quick('admin@stepin.ge')}>{t('role.admin')}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
