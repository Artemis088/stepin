import { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Icon, Avatar } from './ui.jsx';
import { useAuth } from '../AuthContext.jsx';
import { api } from '../api.js';
import { useT, LanguageToggle } from '../i18n.jsx';

const NAV = {
  student: [
    { to: '/student/tasks', icon: 'home', label: 'nav.tasks' },
    { to: '/student/applications', icon: 'list-check', label: 'nav.myApplications' },
    { to: '/student/profile', icon: 'user', label: 'nav.profile' },
    { to: '/student/notifications', icon: 'bell', label: 'common.notifications' },
  ],
  company: [
    { to: '/company/dashboard', icon: 'layout-dashboard', label: 'nav.dashboard' },
    { to: '/company/post', icon: 'plus', label: 'nav.postTask' },
    { to: '/company/tasks', icon: 'briefcase', label: 'nav.myTasks' },
    { to: '/company/profile', icon: 'building', label: 'nav.companyProfile' },
    { to: '/company/notifications', icon: 'bell', label: 'common.notifications' },
  ],
  admin: [
    { to: '/admin', icon: 'layout-dashboard', label: 'nav.overview', end: true },
    { to: '/admin/companies', icon: 'building-bank', label: 'nav.companyVetting' },
    { to: '/admin/tasks', icon: 'shield-check', label: 'nav.sensitivity' },
    { to: '/admin/templates', icon: 'forms', label: 'nav.templates' },
    { to: '/admin/shortlist', icon: 'adjustments', label: 'nav.scoringSlots' },
    { to: '/admin/incidents', icon: 'alert-triangle', label: 'nav.disputes' },
  ],
};

const ACTIVE_CLASS = { student: 'active-amber', company: 'active-blue', admin: 'active-teal' };

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useT();
  const [unread, setUnread] = useState(0);

  const role = user?.role || 'student';
  const items = NAV[role];
  const activeClass = ACTIVE_CLASS[role];

  useEffect(() => {
    if (role === 'admin') return;
    api.get('/notifications').then((d) => setUnread(d.unread)).catch(() => {});
  }, [role, location.pathname]);

  const profileName = user?.profile?.name || user?.email || '';
  const initials = user?.profile?.initials || (profileName ? profileName.slice(0, 2).toUpperCase() : '?');
  const roleLabel = { student: t('role.student'), company: t('role.company'), admin: t('role.admin') }[role];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 8px 20px' }}>
          <div className="logo-mark">S</div>
          <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em' }}>StepIn</span>
        </div>
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            className={({ isActive }) => `nav-item ${isActive ? activeClass : ''}`}
          >
            <Icon name={it.icon} size={18} />
            <span style={{ flex: 1 }}>{t(it.label)}</span>
            {it.icon === 'bell' && unread > 0 && (
              <span
                style={{
                  fontSize: 11,
                  background: 'var(--amber-600)',
                  color: '#fff',
                  borderRadius: 20,
                  padding: '1px 7px',
                  fontWeight: 600,
                }}
              >
                {unread}
              </span>
            )}
          </NavLink>
        ))}
        <div
          style={{
            marginTop: 'auto',
            padding: '12px 10px 4px',
            fontSize: 11,
            color: 'var(--text-muted)',
            lineHeight: 1.5,
            borderTop: '0.5px solid var(--border)',
          }}
        >
          {t('shell.footer1')}
          <br />
          {t('shell.footer2')}
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <LanguageToggle />
            <NavLink to={role === 'admin' ? '/admin/incidents' : `/${role}/notifications`} title={t('common.notifications')}>
              <Icon name="bell" size={19} color="var(--text-secondary)" />
            </NavLink>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <Avatar initials={initials} role={role === 'company' ? 'company' : 'student'} size={32} />
              <div style={{ lineHeight: 1.25 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>{profileName}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{roleLabel}</div>
              </div>
            </div>
            <button className="link" onClick={() => { logout(); navigate('/'); }} title={t('common.logout')} style={{ marginLeft: 4 }}>
              <Icon name="logout" size={18} color="var(--text-muted)" />
            </button>
          </div>
        </div>
        <div className="scroll">{children}</div>
      </main>
    </div>
  );
}
