import { useNavigate, Link } from 'react-router-dom';
import { Icon } from '../components/ui.jsx';
import { useT, LanguageToggle } from '../i18n.jsx';

export default function RoleSelect() {
  const navigate = useNavigate();
  const { t } = useT();
  const Card = ({ role, color, bg, border, icon, title, blurb }) => (
    <button
      onClick={() => navigate(`/signup/${role}`)}
      style={{
        flex: 1,
        height: 'auto',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 10,
        padding: 24,
        border: `1.5px solid ${border}`,
        background: bg,
        borderRadius: 14,
        textAlign: 'left',
      }}
    >
      <Icon name={icon} size={26} color={color} />
      <div style={{ fontSize: 18, fontWeight: 600, color }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, fontWeight: 400, whiteSpace: 'normal' }}>{blurb}</div>
    </button>
  );
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#eaece7' }}>
      <div style={{ position: 'absolute', top: 20, right: 20 }}><LanguageToggle /></div>
      <div style={{ maxWidth: 700, width: '100%' }}>
        <h1 style={{ fontSize: 26, textAlign: 'center', marginBottom: 8 }}>{t('role.title')}</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 26, fontSize: 14 }}>
          {t('role.subtitle')}
        </p>
        <div style={{ display: 'flex', gap: 16 }}>
          <Card role="student" color="var(--amber-900)" bg="var(--amber-50)" border="var(--amber)" icon="user" title={t('role.student')} blurb={t('role.studentBlurb')} />
          <Card role="company" color="var(--blue-800)" bg="var(--blue-50)" border="var(--blue)" icon="building" title={t('role.company')} blurb={t('role.companyBlurb')} />
        </div>
        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13 }}>
          {t('common.haveAccount')} <Link to="/login">{t('common.login')}</Link>
        </div>
      </div>
    </div>
  );
}
