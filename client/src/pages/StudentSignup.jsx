import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { api } from '../api.js';
import { useToast, Icon, Chip, PasswordInput } from '../components/ui.jsx';
import { isValidEmail } from '../validate.js';
import { useT, LanguageToggle } from '../i18n.jsx';
import { roleHome } from '../roleHome.js';

const STEP_KEYS = ['ss.step.account', 'ss.step.basic', 'ss.step.skills', 'ss.step.done'];

export default function StudentSignup() {
  const { signupStudent } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useT();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({ email: '', password: '', name: '', vertical: 'data', bio: '' });
  const [skills, setSkills] = useState([]); // {name, evidenceType, evidenceNote}
  const [skillDraft, setSkillDraft] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const createAccount = async () => {
    if (!form.email || !form.password || !form.name) return toast.error(t('ss.fillError'));
    setBusy(true);
    try {
      await signupStudent(form);
      setStep(2);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const addSkill = () => {
    const name = skillDraft.trim();
    if (!name) return;
    setSkills((s) => [...s, { name, evidenceType: 'none', evidenceNote: '' }]);
    setSkillDraft('');
  };

  const setEvidence = (i, evidenceType, evidenceNote = '') =>
    setSkills((s) => s.map((sk, idx) => (idx === i ? { ...sk, evidenceType, evidenceNote } : sk)));

  const finish = async () => {
    setBusy(true);
    try {
      for (const sk of skills) {
        await api.post('/students/me/skills', sk);
      }
      await api.post('/auth/onboarded');
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
        {/* progress */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 14 }}><LanguageToggle /></div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 22 }}>
          {STEP_KEYS.map((s, i) => (
            <div key={s} style={{ flex: 1 }}>
              <div className="bar"><span style={{ width: i <= step ? '100%' : '0%', background: 'var(--amber)' }} /></div>
              <div style={{ fontSize: 10.5, color: i <= step ? 'var(--amber-700)' : 'var(--text-muted)', marginTop: 5 }}>{t(s)}</div>
            </div>
          ))}
        </div>

        {step === 0 && (
          <>
            <h1 style={{ fontSize: 20, marginBottom: 4 }}>{t('ss.title')}</h1>
            <p className="secondary" style={{ marginBottom: 18 }}>{t('ss.subtitle')}</p>
            <div className="field"><label>{t('ss.fullName')}</label><input value={form.name} onChange={set('name')} placeholder="Nino Kapanadze" /></div>
            <div className="field">
              <label>{t('common.email')}</label>
              <input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" />
              {form.email && !isValidEmail(form.email) && (
                <span style={{ fontSize: 12, color: 'var(--bad)' }}>{t('common.emailInvalid')}</span>
              )}
            </div>
            <div className="field"><label>{t('common.password')}</label><PasswordInput value={form.password} onChange={set('password')} placeholder={t('common.passwordMin')} autoComplete="new-password" /></div>
            <button
              className="primary-amber"
              style={{ width: '100%', height: 42 }}
              onClick={() => {
                if (!isValidEmail(form.email)) return toast.error(t('common.emailInvalid'));
                setStep(1);
              }}
              disabled={!form.name || !form.email || !form.password || !isValidEmail(form.email)}
            >
              {t('common.continue')}
            </button>
            <div style={{ marginTop: 14, textAlign: 'center', fontSize: 13 }}>{t('common.haveAccount')} <Link to="/login">{t('common.login')}</Link></div>
          </>
        )}

        {step === 1 && (
          <>
            <h1 style={{ fontSize: 20, marginBottom: 14 }}>{t('ss.basicTitle')}</h1>
            <div className="field">
              <label>{t('ss.fieldLabel')}</label>
              <select value={form.vertical} onChange={set('vertical')}>
                <option value="data">{t('field.data')}</option>
                <option value="software">{t('field.software')}</option>
                <option value="design">{t('field.design')}</option>
              </select>
            </div>
            <div className="field"><label>{t('ss.bio')}</label><input value={form.bio} onChange={set('bio')} placeholder={t('ss.bioPlaceholder')} /></div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="ghost" onClick={() => setStep(0)}>{t('common.back')}</button>
              <button className="primary-amber" style={{ flex: 1 }} onClick={createAccount} disabled={busy}>{busy ? t('ss.creating') : t('ss.createAccount')}</button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 style={{ fontSize: 20, marginBottom: 4 }}>{t('ss.skillsTitle')}</h1>
            <div style={{ background: 'var(--amber-50)', color: 'var(--amber-900)', borderRadius: 10, padding: '11px 14px', fontSize: 12.5, lineHeight: 1.55, marginBottom: 16, display: 'flex', gap: 8 }}>
              <Icon name="info-circle" size={16} color="var(--amber-700)" />
              <span>{t('ss.skillsInfo')}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input value={skillDraft} onChange={(e) => setSkillDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addSkill()} placeholder={t('ss.skillPlaceholder')} />
              <button className="ghost" onClick={addSkill}><Icon name="plus" size={15} /> {t('ss.add')}</button>
            </div>
            <div className="col" style={{ gap: 8, marginBottom: 18 }}>
              {skills.map((sk, i) => {
                const verified = sk.evidenceType === 'certificate' || sk.evidenceType === 'course';
                return (
                  <div key={i} style={{ border: `0.5px ${verified ? 'solid var(--border)' : 'dashed var(--border-strong)'}`, borderRadius: 8, padding: '10px 12px' }}>
                    <div className="spread">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 14 }}>{sk.name}</span>
                        {verified ? <Chip tone="teal" icon="rosette-discount-check">{t('ss.verified')}</Chip> : <Chip tone="outline">{t('ss.unverified')}</Chip>}
                      </div>
                      <button className="link" onClick={() => setSkills((s) => s.filter((_, idx) => idx !== i))}><Icon name="x" size={15} color="var(--text-muted)" /></button>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      <button className={`sm ${sk.evidenceType === 'certificate' ? 'primary-teal' : 'ghost'}`} onClick={() => setEvidence(i, 'certificate', 'Certificate')}>{t('ss.certificate')}</button>
                      <button className={`sm ${sk.evidenceType === 'course' ? 'primary-teal' : 'ghost'}`} onClick={() => setEvidence(i, 'course', 'Course')}>{t('ss.courseLink')}</button>
                      <button className={`sm ${sk.evidenceType === 'none' ? 'ghost' : 'ghost'}`} onClick={() => setEvidence(i, 'none')} style={sk.evidenceType === 'none' ? { borderColor: 'var(--amber)' } : {}}>{t('ss.earnByTask')}</button>
                    </div>
                  </div>
                );
              })}
              {!skills.length && <div className="empty" style={{ padding: 20 }}>{t('ss.noSkills')}</div>}
            </div>
            <button className="primary-amber" style={{ width: '100%', height: 42 }} onClick={finish} disabled={busy}>{busy ? t('ss.saving') : t('ss.finish')}</button>
          </>
        )}

        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Icon name="circle-check" size={44} color="var(--teal-700)" />
            <h1 style={{ fontSize: 22, margin: '14px 0 8px' }}>{t('ss.doneTitle')}</h1>
            <p className="secondary" style={{ marginBottom: 22 }}>{t('ss.doneText')}</p>
            <button className="primary-amber" style={{ height: 42, padding: '0 24px' }} onClick={() => navigate(roleHome('student'))}>{t('ss.browseTasks')} <Icon name="arrow-right" size={16} /></button>
          </div>
        )}
      </div>
    </div>
  );
}
