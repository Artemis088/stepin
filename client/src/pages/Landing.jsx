import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../components/ui.jsx';
import { useT, LanguageToggle } from '../i18n.jsx';

export default function Landing() {
  const navigate = useNavigate();
  const { t } = useT();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#eaece7' }}>
      <div style={{ position: 'absolute', top: 20, right: 20 }}><LanguageToggle /></div>
      <div style={{ maxWidth: 640, width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div className="logo-mark" style={{ width: 44, height: 44, fontSize: 24, borderRadius: 12 }}>S</div>
          <span style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em' }}>StepIn</span>
        </div>
        <h1 style={{ fontSize: 34, lineHeight: 1.15, letterSpacing: '-0.02em' }}>{t('landing.tagline')}</h1>
        <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 520 }}>
          {t('landing.subtitle')}
        </p>

        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
          <button className="primary-amber" style={{ height: 46, padding: '0 26px', fontSize: 15 }} onClick={() => navigate('/signup/student')}>
            <Icon name="user" size={18} /> {t('landing.imStudent')}
          </button>
          <button className="primary-blue" style={{ height: 46, padding: '0 26px', fontSize: 15 }} onClick={() => navigate('/signup/company')}>
            <Icon name="building" size={18} /> {t('landing.imCompany')}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { icon: 'briefcase', text: t('landing.realTasks') },
            { icon: 'arrow-right', text: '', arrow: true },
            { icon: 'sparkles', text: t('landing.realExperience') },
            { icon: 'arrow-right', text: '', arrow: true },
            { icon: 'rosette-discount-check', text: t('landing.verifiedRecord') },
          ].map((s, i) =>
            s.arrow ? (
              <Icon key={i} name="arrow-right" size={16} color="var(--text-muted)" style={{ alignSelf: 'center' }} />
            ) : (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--surface-0)', border: '0.5px solid var(--border)', borderRadius: 20, padding: '8px 16px', fontSize: 13 }}>
                <Icon name={s.icon} size={15} color="var(--teal-700)" /> {s.text}
              </div>
            )
          )}
        </div>

        <div style={{ marginTop: 14, fontSize: 13, color: 'var(--text-secondary)' }}>
          {t('landing.returning')} <Link to="/login">{t('common.login')}</Link>
        </div>
      </div>
      <div style={{ marginTop: 40, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.7 }}>
        {t('landing.demoLogins')} <b>password</b>): nino@student.ge · careers@tbcbank.com.ge · admin@stepin.ge
      </div>
    </div>
  );
}
