import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { Icon, Chip, Countdown, Spinner, EmptyState } from '../../components/ui.jsx';
import { useT } from '../../i18n.jsx';

const MOTIVE = {
  needs_now: { tone: 'amber', icon: 'bolt', labelKey: 'motive.needs_now' },
  scouting: { tone: 'blue', icon: 'users', labelKey: 'motive.scouting' },
};

export default function Tasks() {
  const navigate = useNavigate();
  const { t } = useT();
  const [tasks, setTasks] = useState(null);
  const [tab, setTab] = useState('internship'); // 'internship' (primary) | 'standalone'
  const [filters, setFilters] = useState({ vertical: '', motive: '', paid: '', q: '' });

  const load = () => {
    setTasks(null);
    const qs = new URLSearchParams({ type: tab });
    Object.entries(filters).forEach(([k, v]) => v && qs.set(k, v));
    api.get(`/tasks?${qs}`).then((d) => setTasks(d.tasks));
  };
  useEffect(load, [filters, tab]);

  const TabButton = ({ value, label }) => {
    const on = tab === value;
    return (
      <button
        type="button"
        onClick={() => setTab(value)}
        style={{
          height: 38,
          padding: '0 18px',
          border: 'none',
          borderBottom: on ? '2px solid var(--amber)' : '2px solid transparent',
          background: 'none',
          fontSize: 14.5,
          fontWeight: on ? 600 : 500,
          color: on ? 'var(--text-primary)' : 'var(--text-muted)',
          cursor: 'pointer',
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="content">
      <div style={{ display: 'flex', gap: 4, borderBottom: '0.5px solid var(--border)', marginBottom: 16 }}>
        <TabButton value="internship" label={t('tasks.tabInternships')} />
        <TabButton value="standalone" label={t('tasks.tabStandalone')} />
      </div>
      <div className="spread" style={{ marginBottom: 18 }}>
        <div>
          <p className="secondary" style={{ marginTop: 0 }}>
            {tab === 'internship' ? t('tasks.internshipsSubtitle') : t('tasks.standaloneSubtitle')}
          </p>
        </div>
      </div>

      {/* filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Icon name="search" size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 11, top: 11 }} />
          <input value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} placeholder={t('tasks.search')} style={{ paddingLeft: 32 }} />
        </div>
        <select value={filters.vertical} onChange={(e) => setFilters((f) => ({ ...f, vertical: e.target.value }))} style={{ width: 'auto' }}>
          <option value="">{t('tasks.allFields')}</option>
          <option value="data">{t('field.data')}</option>
          <option value="software">{t('field.software')}</option>
          <option value="design">{t('field.design')}</option>
        </select>
        <select value={filters.motive} onChange={(e) => setFilters((f) => ({ ...f, motive: e.target.value }))} style={{ width: 'auto' }}>
          <option value="">{t('tasks.anyMotive')}</option>
          <option value="needs_now">{t('motive.needs_now')}</option>
          <option value="scouting">{t('motive.scouting')}</option>
        </select>
        <select value={filters.paid} onChange={(e) => setFilters((f) => ({ ...f, paid: e.target.value }))} style={{ width: 'auto' }}>
          <option value="">{t('tasks.paidOrUnpaid')}</option>
          <option value="true">{t('tasks.stipendOnly')}</option>
        </select>
      </div>

      {!tasks && <Spinner />}
      {tasks && tasks.length === 0 && <EmptyState icon="briefcase-off" title={tab === 'internship' ? t('tasks.noInternships') : t('tasks.noMatch')} />}

      <div className="col" style={{ gap: 12 }}>
        {tasks?.map((task) => {
          const m = MOTIVE[task.motive];
          return (
            <div
              key={task.id}
              className="card"
              style={{ cursor: 'pointer', background: 'var(--surface-0)', ...(task.compensationType === 'stipend' || task.motive === 'needs_now' ? { borderColor: 'var(--border-strong)' } : {}) }}
              onClick={() => navigate(`/student/tasks/${task.id}`)}
            >
              <div className="spread" style={{ alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 9 }}>
                    {task.isInternship && <Chip tone="amber" icon="school">{t('tasks.internshipBadge')} · {t('tasks.guaranteedHire')}</Chip>}
                    <Chip tone={m.tone} icon={m.icon}>{t(m.labelKey)}</Chip>
                    {task.sampleData && <Chip tone="teal" icon="database">{t('tasks.sampleData')}</Chip>}
                    {task.compensationType === 'stipend' ? <Chip tone="amber" icon="coin">${task.stipendAmount} {t('tasks.stipendSuffix')}</Chip> : <Chip tone="neutral" icon="rosette-discount-check">{t('tasks.credential')}</Chip>}
                    <Chip tone="neutral">{task.vertical}</Chip>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{task.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 6 }}>
                    <Icon name="building" size={13} color="var(--blue)" />
                    <span className="secondary" style={{ fontSize: 12.5 }}>{task.company?.name}</span>
                    {task.company?.verified && <Chip tone="blue" icon="rosette-discount-check">{t('tasks.verified')}{task.company.rating ? ` · ${task.company.rating}` : ''}</Chip>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                    {task.skills.map((s) => <Chip key={s} tone="neutral">{s}</Chip>)}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                  <Countdown deadline={task.countdowns.apply} prefix={t('tasks.applicationsClose')} />
                  <div className="muted" style={{ fontSize: 11.5, marginTop: 8 }}>{t('tasks.appliedOfCap', { n: task.counts.applied, m: task.appliedCap })}</div>
                  {task.myStage && <div style={{ marginTop: 6 }}><Chip tone="teal" icon="check">{t('tasks.applied')}</Chip></div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
