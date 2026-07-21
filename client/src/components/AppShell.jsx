import { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Icon, Avatar, Lockup } from './ui.jsx';
import { useAuth } from '../AuthContext.jsx';
import { api } from '../api.js';
import { useT, LanguageToggle } from '../i18n.jsx';

const NAV = {
  student: [
    { to: '/student/internships', icon: 'school', label: 'nav.internships' },
    { to: '/student/tasks', icon: 'checklist', label: 'nav.tasks' },
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

export default function AppShell({ children, guest = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useT();
  const [unread, setUnread] = useState(0);

  const role = user?.role || 'student';
  // Guests get a read-only student browse: just Internships + Tasks.
  const items = guest ? NAV.student.slice(0, 2) : NAV[role];
  const activeClass = ACTIVE_CLASS[role];

  useEffect(() => {
    if (guest || role === 'admin') return;
    api.get('/notifications').then((d) => setUnread(d.unread)).catch(() => {});
  }, [guest, role, location.pathname]);

  const profileName = user?.profile?.name || user?.email || '';
  const initials = user?.profile?.initials || (profileName ? profileName.slice(0, 2).toUpperCase() : '?');
  const roleLabel = { student: t('role.student'), company: t('role.company'), admin: t('role.admin') }[role];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div style={{ padding: '4px 4px 20px' }}>
          <div style={{ background: '#fdfdfd', border: '0.5px solid var(--border)', borderRadius: 18, padding: '10px 14px', display: 'flex', justifyContent: 'center' }}>
            <Lockup width={150} tagline={false} />
          </div>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <LanguageToggle />
            {guest ? (
              <>
                <button className="ghost" onClick={() => navigate('/login')} style={{ height: 34, padding: '0 14px' }}>{t('common.login')}</button>
                <button className="primary-amber" onClick={() => navigate('/get-started')} style={{ height: 34, padding: '0 16px' }}>{t('guest.signUp')}</button>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
        {guest && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 20px', background: 'var(--amber-50)', borderBottom: '0.5px solid var(--amber)', fontSize: 12.5, color: 'var(--amber-900)' }}>
            <Icon name="eye" size={15} color="var(--amber-700)" />
            <span>{t('guest.banner')}</span>
            <button className="sm primary-amber" style={{ marginLeft: 'auto' }} onClick={() => navigate('/get-started')}>{t('guest.signUp')}</button>
          </div>
        )}
        <div className="scroll">{children}</div>
      </main>
    </div>
  );
}
