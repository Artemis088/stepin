import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { Icon, Chip, Countdown, Spinner, EmptyState } from '../../components/ui.jsx';

const MOTIVE = {
  needs_now: { tone: 'amber', icon: 'bolt', label: 'Needs it now' },
  scouting: { tone: 'blue', icon: 'users', label: 'Scouting talent' },
};

const STATUS = {
  draft: { tone: 'neutral', label: 'Draft' },
  live: { tone: 'blue', label: 'Live' },
  screening: { tone: 'blue', label: 'Screening' },
  finalists_working: { tone: 'amber', label: 'Finalists working' },
  decided: { tone: 'teal', label: 'Decided' },
  closed: { tone: 'neutral', label: 'Closed' },
  blocked: { tone: 'bad', label: 'Blocked' },
};

// Stage progression shown as a horizontal rail.
const STAGES = [
  { key: 'live', label: 'Live', countKey: 'applied' },
  { key: 'screening', label: 'Screening', countKey: 'screened' },
  { key: 'shortlist', label: 'Shortlist ready', countKey: 'shortlisted' },
  { key: 'finalists', label: 'Finalists working', countKey: 'shortlisted' },
  { key: 'decision', label: 'Decision', countKey: null },
];

// Map a task status to the index of the current stage in STAGES.
const STAGE_INDEX = {
  draft: -1,
  live: 0,
  screening: 1,
  finalists_working: 3,
  decided: 4,
  closed: 4,
  blocked: -1,
};

function nextDeadline(t) {
  if (t.status === 'live') return { cd: t.countdowns.apply, prefix: 'Applications close' };
  if (t.status === 'screening') return { cd: t.countdowns.screening, prefix: 'Screening due' };
  if (t.status === 'finalists_working') return { cd: t.countdowns.decision, prefix: 'You decide by' };
  return null;
}

function action(t, navigate) {
  if (t.status === 'screening') return { label: 'Review & build shortlist', cls: 'primary-blue', to: `/company/tasks/${t.id}` };
  if (t.status === 'finalists_working') return { label: 'Review shortlist', cls: 'primary-blue', to: `/company/shortlist/${t.id}` };
  if (t.status === 'decided') return { label: 'Rate finalists', cls: 'primary-teal', to: `/company/rate/${t.id}` };
  return null;
}

export default function MyTasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState(null);

  useEffect(() => {
    api.get('/company/tasks').then((d) => setTasks(d.tasks));
  }, []);

  if (!tasks) return <div className="content"><Spinner /></div>;

  return (
    <div className="content">
      <div className="spread" style={{ marginBottom: 20, alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: 20, color: 'var(--blue-800)' }}>My tasks</h2>
          <p className="secondary" style={{ marginTop: 3 }}>Every task you've posted and where it sits in the funnel.</p>
        </div>
        <button className="primary-blue" style={{ height: 40, padding: '0 18px' }} onClick={() => navigate('/company/post')}>
          <Icon name="plus" size={16} /> Post a task
        </button>
      </div>

      {tasks.length === 0 && (
        <EmptyState icon="briefcase-off" title="You haven't posted any tasks yet">
          <button className="primary-blue sm" style={{ marginTop: 14 }} onClick={() => navigate('/company/post')}>Post your first task</button>
        </EmptyState>
      )}

      <div className="col" style={{ gap: 12 }}>
        {tasks.map((t) => {
          const st = STATUS[t.status] || STATUS.draft;
          const m = MOTIVE[t.motive];
          const currentIdx = STAGE_INDEX[t.status] ?? -1;
          const nd = nextDeadline(t);
          const act = action(t, navigate);
          return (
            <div key={t.id} className="card" style={{ background: 'var(--surface-0)' }}>
              <div className="spread" style={{ alignItems: 'flex-start', gap: 14 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 8 }}>
                    <Chip tone={st.tone === 'bad' ? 'amber' : st.tone}>{st.label}</Chip>
                    {m && <Chip tone={m.tone} icon={m.icon}>{m.label}</Chip>}
                    <Chip tone="neutral">{t.vertical}</Chip>
                    {t.compensationType === 'stipend' ? <Chip tone="amber" icon="coin">${t.stipendAmount} stipend</Chip> : <Chip tone="neutral" icon="rosette-discount-check">Credential</Chip>}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{t.title}</div>
                </div>
                {nd && (
                  <div style={{ flexShrink: 0 }}>
                    <Countdown deadline={nd.cd} prefix={nd.prefix} />
                  </div>
                )}
              </div>

              {/* Stage rail */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, marginTop: 16, marginBottom: 4 }}>
                {STAGES.map((s, i) => {
                  const done = i < currentIdx;
                  const active = i === currentIdx;
                  const color = active ? 'var(--blue)' : done ? 'var(--teal-700)' : 'var(--border-strong)';
                  const count = s.countKey ? t.counts[s.countKey] : null;
                  const cap = s.countKey === 'applied' ? t.appliedCap : s.countKey === 'screened' ? t.screeningCap : null;
                  return (
                    <div key={s.key} style={{ flex: 1, position: 'relative', textAlign: 'center' }}>
                      {i < STAGES.length - 1 && (
                        <div style={{ position: 'absolute', top: 8, left: '50%', width: '100%', height: 2, background: i < currentIdx ? 'var(--teal-700)' : 'var(--border)' }} />
                      )}
                      <div style={{ position: 'relative', zIndex: 1, width: 18, height: 18, borderRadius: '50%', margin: '0 auto', background: active ? 'var(--blue)' : done ? 'var(--teal-700)' : 'var(--surface-0)', border: active || done ? 'none' : `1.5px solid var(--border-strong)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {done && <Icon name="check" size={11} color="#fff" />}
                      </div>
                      <div style={{ fontSize: 11, marginTop: 6, color, fontWeight: active ? 600 : 400, lineHeight: 1.3 }}>{s.label}</div>
                      {count != null && (active || done) && (
                        <div className="muted" style={{ fontSize: 10.5, marginTop: 2 }}>{count}{cap != null ? `/${cap}` : ''}</div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
                {act && (
                  <button className={`${act.cls} sm`} onClick={() => navigate(act.to)}>{act.label}</button>
                )}
                <button className="ghost sm" onClick={() => navigate(`/company/tasks/${t.id}`)}>Manage</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
