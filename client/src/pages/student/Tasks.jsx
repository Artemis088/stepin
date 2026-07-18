import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { Icon, Chip, Countdown, Spinner, EmptyState } from '../../components/ui.jsx';

const MOTIVE = {
  needs_now: { tone: 'amber', icon: 'bolt', label: 'Needs it now' },
  scouting: { tone: 'blue', icon: 'users', label: 'Scouting talent' },
};

export default function Tasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState(null);
  const [filters, setFilters] = useState({ vertical: '', motive: '', paid: '', q: '' });

  const load = () => {
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && qs.set(k, v));
    api.get(`/tasks?${qs}`).then((d) => setTasks(d.tasks));
  };
  useEffect(load, [filters]);

  return (
    <div className="content">
      <div className="spread" style={{ marginBottom: 18 }}>
        <div>
          <h2 style={{ fontSize: 20 }}>Tasks</h2>
          <p className="secondary" style={{ marginTop: 3 }}>Real, small, sample-data tasks in your field.</p>
        </div>
      </div>

      {/* filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Icon name="search" size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 11, top: 11 }} />
          <input value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} placeholder="Search tasks" style={{ paddingLeft: 32 }} />
        </div>
        <select value={filters.vertical} onChange={(e) => setFilters((f) => ({ ...f, vertical: e.target.value }))} style={{ width: 'auto' }}>
          <option value="">All fields</option>
          <option value="data">Data</option>
          <option value="software">Software</option>
          <option value="design">Design</option>
        </select>
        <select value={filters.motive} onChange={(e) => setFilters((f) => ({ ...f, motive: e.target.value }))} style={{ width: 'auto' }}>
          <option value="">Any motive</option>
          <option value="needs_now">Needs it now</option>
          <option value="scouting">Scouting talent</option>
        </select>
        <select value={filters.paid} onChange={(e) => setFilters((f) => ({ ...f, paid: e.target.value }))} style={{ width: 'auto' }}>
          <option value="">Paid or unpaid</option>
          <option value="true">Stipend only</option>
        </select>
      </div>

      {!tasks && <Spinner />}
      {tasks && tasks.length === 0 && <EmptyState icon="briefcase-off" title="No tasks match your filters" />}

      <div className="col" style={{ gap: 12 }}>
        {tasks?.map((t) => {
          const m = MOTIVE[t.motive];
          return (
            <div
              key={t.id}
              className="card"
              style={{ cursor: 'pointer', background: 'var(--surface-0)', ...(t.compensationType === 'stipend' || t.motive === 'needs_now' ? { borderColor: 'var(--border-strong)' } : {}) }}
              onClick={() => navigate(`/student/tasks/${t.id}`)}
            >
              <div className="spread" style={{ alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 9 }}>
                    <Chip tone={m.tone} icon={m.icon}>{m.label}</Chip>
                    {t.sampleData && <Chip tone="teal" icon="database">Sample data</Chip>}
                    {t.compensationType === 'stipend' ? <Chip tone="amber" icon="coin">${t.stipendAmount} stipend</Chip> : <Chip tone="neutral" icon="rosette-discount-check">Credential</Chip>}
                    <Chip tone="neutral">{t.vertical}</Chip>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{t.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 6 }}>
                    <Icon name="building" size={13} color="var(--blue)" />
                    <span className="secondary" style={{ fontSize: 12.5 }}>{t.company?.name}</span>
                    {t.company?.verified && <Chip tone="blue" icon="rosette-discount-check">Verified{t.company.rating ? ` · ${t.company.rating}` : ''}</Chip>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                    {t.skills.map((s) => <Chip key={s} tone="neutral">{s}</Chip>)}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                  <Countdown deadline={t.countdowns.apply} prefix="Applications close" />
                  <div className="muted" style={{ fontSize: 11.5, marginTop: 8 }}>{t.counts.applied} / {t.appliedCap} applied</div>
                  {t.myStage && <div style={{ marginTop: 6 }}><Chip tone="teal" icon="check">Applied</Chip></div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
