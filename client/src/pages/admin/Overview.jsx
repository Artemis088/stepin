import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { Icon, Stat, Spinner, useToast } from '../../components/ui.jsx';

const LINKS = [
  { to: '/admin/companies', icon: 'building-bank', label: 'Company vetting' },
  { to: '/admin/tasks', icon: 'shield-check', label: 'Task sensitivity' },
  { to: '/admin/templates', icon: 'forms', label: 'Screening templates' },
  { to: '/admin/shortlist', icon: 'adjustments', label: 'Scoring & slots' },
  { to: '/admin/incidents', icon: 'alert-triangle', label: 'Disputes & no-shows' },
];

export default function Overview() {
  const navigate = useNavigate();
  const toast = useToast();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/admin/overview').then((d) => setStats(d.stats)).catch((e) => toast.error(e.message));
  }, []);

  if (!stats) return <div className="content"><Spinner /></div>;

  const cards = [
    { key: 'companies', label: 'Companies', icon: 'building' },
    { key: 'students', label: 'Students', icon: 'users' },
    { key: 'tasks', label: 'Tasks', icon: 'briefcase' },
    { key: 'probation', label: 'On probation', icon: 'shield-half', accent: stats.probation > 0 ? 'var(--amber-700)' : undefined },
    { key: 'openIncidents', label: 'Open incidents', icon: 'alert-triangle', accent: stats.openIncidents > 0 ? 'var(--bad)' : undefined },
    { key: 'flagged', label: 'Flagged companies', icon: 'flag', accent: stats.flagged > 0 ? 'var(--bad)' : undefined },
  ];

  return (
    <div className="content">
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20 }}>Overview</h2>
        <p className="secondary" style={{ marginTop: 3 }}>
          Platform operations — vetting, sensitivity, templates, scoring and disputes.
        </p>
      </div>

      <div className="grid-3" style={{ marginBottom: 26 }}>
        {cards.map((c) => (
          <div key={c.key} className="stat" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Icon name={c.icon} size={20} color={c.accent || 'var(--teal-700)'} />
            <div>
              <div className="k">{c.label}</div>
              <div className="v" style={{ color: c.accent }}>{stats[c.key]}</div>
            </div>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: 14.5, marginBottom: 12 }}>Go to</h3>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {LINKS.map((l) => (
          <button key={l.to} className="ghost" onClick={() => navigate(l.to)} style={{ height: 40, padding: '0 16px' }}>
            <Icon name={l.icon} size={16} color="var(--teal-700)" /> {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}
