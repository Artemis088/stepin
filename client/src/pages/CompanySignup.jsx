import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { useToast, Icon, PasswordInput } from '../components/ui.jsx';
import { isValidEmail } from '../validate.js';
import { useT, LanguageToggle } from '../i18n.jsx';

const STEP_KEYS = ['cs.step.identity', 'cs.step.contact', 'cs.step.agreement', 'cs.step.done'];

export default function CompanySignup() {
  const { signupCompany } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useT();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: '',
    registrationId: '',
    website: '',
    contactName: '',
    contactEmail: '',
    email: '',
    password: '',
    agreementSigned: false,
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setBusy(true);
    try {
      await signupCompany({ ...form, email: form.email || form.contactEmail });
      setStep(3);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#eaece7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'var(--surface-0)', border: '0.5px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 540, padding: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 14 }}><LanguageToggle /></div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 22 }}>
          {STEP_KEYS.map((s, i) => (
            <div key={s} style={{ flex: 1 }}>
              <div className="bar"><span style={{ width: i <= step ? '100%' : '0%', background: 'var(--blue)' }} /></div>
              <div style={{ fontSize: 10.5, color: i <= step ? 'var(--blue-800)' : 'var(--text-muted)', marginTop: 5 }}>{t(s)}</div>
            </div>
          ))}
        </div>

        {step === 0 && (
          <>
            <h1 style={{ fontSize: 20, marginBottom: 4 }}>{t('cs.title')}</h1>
            <p className="secondary" style={{ marginBottom: 18 }}>{t('cs.subtitle')}</p>
            <div className="field"><label>{t('cs.legalName')}</label><input value={form.name} onChange={set('name')} placeholder="TBC Retail" /></div>
            <div className="field"><label>{t('cs.regId')}</label><input value={form.registrationId} onChange={set('registrationId')} placeholder="GE-204512" /></div>
            <div className="field"><label>{t('cs.website')}</label><input value={form.website} onChange={set('website')} placeholder="company.ge" /></div>
            <button className="primary-blue" style={{ width: '100%', height: 42 }} onClick={() => setStep(1)} disabled={!form.name}>{t('common.continue')}</button>
            <div style={{ marginTop: 14, textAlign: 'center', fontSize: 13 }}>{t('cs.alreadyReg')} <Link to="/login">{t('common.login')}</Link></div>
          </>
        )}

        {step === 1 && (
          <>
            <h1 style={{ fontSize: 20, marginBottom: 4 }}>{t('cs.contactTitle')}</h1>
            <div style={{ background: 'var(--amber-50)', color: 'var(--amber-900)', borderRadius: 10, padding: '10px 13px', fontSize: 12.5, marginBottom: 16, display: 'flex', gap: 8 }}>
              <Icon name="shield-check" size={16} color="var(--amber-700)" />
              <span>{t('cs.domainInfo')}</span>
            </div>
            <div className="field"><label>{t('cs.contactName')}</label><input value={form.contactName} onChange={set('contactName')} placeholder="Data Lead" /></div>
            <div className="field">
              <label>{t('cs.domainEmail')}</label>
              <input type="email" value={form.contactEmail} onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value, email: e.target.value }))} placeholder="you@company.ge" />
              {form.contactEmail && !isValidEmail(form.contactEmail) && (
                <span style={{ fontSize: 12, color: 'var(--bad)' }}>{t('cs.emailInvalidCompany')}</span>
              )}
            </div>
            <div className="field"><label>{t('cs.accountPassword')}</label><PasswordInput value={form.password} onChange={set('password')} placeholder={t('common.passwordMin')} autoComplete="new-password" /></div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="ghost" onClick={() => setStep(0)}>{t('common.back')}</button>
              <button
                className="primary-blue"
                style={{ flex: 1 }}
                onClick={() => {
                  if (!isValidEmail(form.contactEmail)) return toast.error(t('cs.emailInvalidCompany'));
                  setStep(2);
                }}
                disabled={!form.contactEmail || !form.password || !isValidEmail(form.contactEmail)}
              >
                {t('common.continue')}
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 style={{ fontSize: 20, marginBottom: 14 }}>{t('cs.agreementTitle')}</h1>
            <div style={{ border: '0.5px solid var(--border)', borderRadius: 10, padding: 16, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 14, maxHeight: 200, overflow: 'auto' }}>
              <p style={{ marginBottom: 8 }}>{t('cs.agreementIntro')}</p>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>{t('cs.agreement1')}</li>
                <li>{t('cs.agreement2')}</li>
                <li>{t('cs.agreement3')}</li>
                <li>{t('cs.agreement4')}</li>
              </ul>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, marginBottom: 16 }}>
              <input type="checkbox" style={{ width: 18, height: 18 }} checked={form.agreementSigned} onChange={(e) => setForm((f) => ({ ...f, agreementSigned: e.target.checked }))} />
              {t('cs.accept')}
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="ghost" onClick={() => setStep(1)}>{t('common.back')}</button>
              <button className="primary-blue" style={{ flex: 1 }} onClick={submit} disabled={!form.agreementSigned || busy}>{busy ? t('cs.submitting') : t('cs.createCompany')}</button>
            </div>
          </>
        )}

        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ display: 'inline-flex', background: 'var(--amber-50)', color: 'var(--amber-700)', borderRadius: 20, padding: '5px 14px', fontSize: 12, marginBottom: 14 }}>
              <Icon name="clock" size={14} style={{ marginRight: 5 }} /> {t('cs.probationTag')}
            </div>
            <h1 style={{ fontSize: 22, margin: '4px 0 8px' }}>{t('cs.doneTitle')}</h1>
            <p className="secondary" style={{ marginBottom: 8, lineHeight: 1.6 }}>
              {t('cs.doneText')}
            </p>
            <button className="primary-blue" style={{ height: 42, padding: '0 24px', marginTop: 12 }} onClick={() => navigate('/company/dashboard')}>{t('cs.goDashboard')} <Icon name="arrow-right" size={16} /></button>
          </div>
        )}
      </div>
    </div>
  );
}
