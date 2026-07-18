import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../components/ui.jsx';

export default function Landing() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#eaece7' }}>
      <div style={{ maxWidth: 640, width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div className="logo-mark" style={{ width: 44, height: 44, fontSize: 24, borderRadius: 12 }}>S</div>
          <span style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em' }}>StepIn</span>
        </div>
        <h1 style={{ fontSize: 34, lineHeight: 1.15, letterSpacing: '-0.02em' }}>Get your first step in.</h1>
        <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 520 }}>
          Companies post small, real, sample-data tasks. Students do them to earn a verified track record and a foot in the door.
          It's an exchange — real work for real experience, fair and safe for both sides.
        </p>

        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
          <button className="primary-amber" style={{ height: 46, padding: '0 26px', fontSize: 15 }} onClick={() => navigate('/signup/student')}>
            <Icon name="user" size={18} /> I'm a student
          </button>
          <button className="primary-blue" style={{ height: 46, padding: '0 26px', fontSize: 15 }} onClick={() => navigate('/signup/company')}>
            <Icon name="building" size={18} /> I'm a company
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { icon: 'briefcase', text: 'Real tasks' },
            { icon: 'arrow-right', text: '', arrow: true },
            { icon: 'sparkles', text: 'Real experience' },
            { icon: 'arrow-right', text: '', arrow: true },
            { icon: 'rosette-discount-check', text: 'Verified track record' },
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
          Returning user? <Link to="/login">Log in</Link>
        </div>
      </div>
      <div style={{ marginTop: 40, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.7 }}>
        Demo logins (password <b>password</b>): nino@student.ge · careers@tbcbank.com.ge · admin@stepin.ge
      </div>
    </div>
  );
}
