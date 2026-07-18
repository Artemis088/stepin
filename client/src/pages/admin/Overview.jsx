import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { Icon, Stat, Spinner, useToast } from '../../components/ui.jsx';
import { useT } from '../../i18n.jsx';

const LINKS = [
  { to: '/admin/companies', icon: 'building-bank', labelKey: 'ao.companyVetting' },
  { to: '/admin/tasks', icon: 'shield-check', labelKey: 'ao.taskSensitivity' },
  { to: '/admin/templates', icon: 'forms', labelKey: 'ao.screeningTemplates' },
  { to: '/admin/shortlist', icon: 'adjustments', labelKey: 'ao.scoringSlots' },
  { to: '/admin/incidents', icon: 'alert-triangle', labelKey: 'ao.disputes' },
];

export default function Overview() {
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useT();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/admin/overview').then((d) => setStats(d.stats)).catch((e) => toast.error(e.message));
  }, []);

  if (!stats) return <div className="content"><Spinner /></div>;

  const cards = [
    { key: 'companies', label: t('ao.companies'), icon: 'building' },
    { key: 'students', label: t('ao.students'), icon: 'users' },
    { key: 'tasks', label: t('ao.tasks'), icon: 'briefcase' },
    { key: 'probation', label: t('ao.onProbation'), icon: 'shield-half', accent: stats.probation > 0 ? 'var(--amber-700)' : undefined },
    { key: 'openIncidents', label: t('ao.openIncidents'), icon: 'alert-triangle', accent: stats.openIncidents > 0 ? 'var(--bad)' : undefined },
    { key: 'flagged', label: t('ao.flaggedCompanies'), icon: 'flag', accent: stats.flagged > 0 ? 'var(--bad)' : undefined },
  ];

  return (
    <div className="content">
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20 }}>{t('ao.title')}</h2>
        <p className="secondary" style={{ marginTop: 3 }}>
          {t('ao.subtitle')}
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

      <h3 style={{ fontSize: 14.5, marginBottom: 12 }}>{t('ao.goTo')}</h3>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {LINKS.map((l) => (
          <button key={l.to} className="ghost" onClick={() => navigate(l.to)} style={{ height: 40, padding: '0 16px' }}>
            <Icon name={l.icon} size={16} color="var(--teal-700)" /> {t(l.labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}
