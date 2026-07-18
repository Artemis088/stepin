import { useNavigate, Link } from 'react-router-dom';
import { Icon } from '../components/ui.jsx';

export default function RoleSelect() {
  const navigate = useNavigate();
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
      <div style={{ maxWidth: 700, width: '100%' }}>
        <h1 style={{ fontSize: 26, textAlign: 'center', marginBottom: 8 }}>Choose how you'll use StepIn</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 26, fontSize: 14 }}>
          Your role determines your whole experience, so pick deliberately.
        </p>
        <div style={{ display: 'flex', gap: 16 }}>
          <Card role="student" color="var(--amber-900)" bg="var(--amber-50)" border="var(--amber)" icon="user" title="Student" blurb="Build a verified profile, apply to real tasks, and earn a track record that opens doors." />
          <Card role="company" color="var(--blue-800)" bg="var(--blue-50)" border="var(--blue)" icon="building" title="Company" blurb="Post small scoped tasks, get real work done, and see talent before any hiring commitment." />
        </div>
        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13 }}>
          Already have an account? <Link to="/login">Log in</Link>
        </div>
      </div>
    </div>
  );
}
