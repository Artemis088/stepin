import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { Icon, Chip, Spinner, EmptyState } from '../../components/ui.jsx';

const STANDING = {
  probation: {
    tone: 'amber',
    bg: 'var(--amber-50)',
    border: 'var(--amber)',
    fg: 'var(--amber-900)',
    accent: 'var(--amber-700)',
    icon: 'shield-half',
    label: 'Probation — limited posting rights',
  },
  trusted: {
    tone: 'teal',
    bg: 'var(--teal-50)',
    border: 'var(--teal)',
    fg: 'var(--teal-900)',
    accent: 'var(--teal-700)',
    icon: 'rosette-discount-check',
    label: 'Trusted company',
  },
  flagged: {
    tone: 'bad',
    bg: 'var(--bad-50)',
    border: 'var(--bad)',
    fg: 'var(--bad)',
    accent: 'var(--bad)',
    icon: 'alert-triangle',
    label: 'Flagged — posting restricted',
  },
};

function DeadlineChip({ status, nextDeadline }) {
  if (!nextDeadline) return null;
  const critical = nextDeadline.critical;
  const prefix =
    status === 'finalists_working'
      ? 'You decide by'
      : status === 'screening'
      ? 'Screening due'
      : status === 'live'
      ? 'Applications close'
      : '';
  const urgent = critical || nextDeadline.overdue || nextDeadline.days <= 2;
  return (
    <Chip tone={urgent ? 'amber' : 'neutral'} icon={nextDeadline.overdue ? 'alert-triangle' : 'clock'}>
      {prefix} {nextDeadline.overdue ? 'overdue' : nextDeadline.label}
    </Chip>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/company/dashboard').then(setData);
  }, []);

  if (!data) return <div className="content"><Spinner /></div>;
  const { company, tasks } = data;
  const s = STANDING[company.status] || STANDING.probation;

  return (
    <div className="content">
      <div className="spread" style={{ marginBottom: 20, alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: 20, color: 'var(--blue-800)' }}>{company.name}</h2>
          <p className="secondary" style={{ marginTop: 3 }}>Your live tasks and where each one stands.</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <button
            className="primary-blue"
            style={{ height: 40, padding: '0 18px' }}
            disabled={!company.canPost}
            onClick={() => company.canPost && navigate('/company/post')}
          >
            <Icon name="plus" size={16} /> Post a task
          </button>
          {!company.canPost && (
            <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>
              At your concurrent-task cap ({company.concurrentCap}).
            </div>
          )}
        </div>
      </div>

      {/* Standing banner */}
      <div
        style={{
          border: `0.5px solid ${s.border}`,
          background: s.bg,
          borderRadius: 12,
          padding: '16px 18px',
          marginBottom: 22,
          display: 'flex',
          gap: 14,
          alignItems: 'flex-start',
        }}
      >
        <Icon name={s.icon} size={22} color={s.accent} style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14.5, fontWeight: 600, color: s.fg }}>{s.label}</span>
            <span style={{ fontSize: 12, color: s.accent }}>
              {company.openCount} of {company.concurrentCap} tasks used
            </span>
          </div>
          {company.status === 'probation' && (
            <div style={{ fontSize: 12.5, color: s.fg, lineHeight: 1.6, marginTop: 6 }}>
              You can post up to your cap while on probation. Unlock full posting rights by staying engaged:
              give screening feedback, select winners, and meet your decision deadlines.
            </div>
          )}
          {company.status === 'trusted' && (
            <div style={{ fontSize: 12.5, color: s.fg, lineHeight: 1.6, marginTop: 6 }}>
              Full posting rights. Keep meeting decision deadlines to stay trusted.
            </div>
          )}
          {company.status === 'flagged' && (
            <div style={{ fontSize: 12.5, color: s.fg, lineHeight: 1.6, marginTop: 6 }}>
              Posting is restricted while your standing is under review. Resolve open decisions to recover.
            </div>
          )}
        </div>
      </div>

      {/* Active tasks */}
      <h3 style={{ fontSize: 14.5, color: 'var(--blue-800)', marginBottom: 12 }}>Active tasks</h3>
      {tasks.length === 0 && (
        <EmptyState icon="briefcase-off" title="No tasks yet">
          <button className="primary-blue sm" style={{ marginTop: 14 }} onClick={() => navigate('/company/post')} disabled={!company.canPost}>
            Post your first task
          </button>
        </EmptyState>
      )}

      <div className="col" style={{ gap: 10 }}>
        {tasks.map((t) => {
          const funnel = `${t.counts.applied}/${t.appliedCap} applied · ${t.counts.screened}/${t.screeningCap} screened${
            t.shortlistReady ? ' · shortlist ready' : ''
          }`;
          return (
            <div
              key={t.id}
              className="card"
              style={{ background: 'var(--surface-0)', cursor: t.shortlistReady ? 'default' : 'pointer' }}
              onClick={() => !t.shortlistReady && navigate(`/company/tasks/${t.id}`)}
            >
              <div className="spread" style={{ alignItems: 'flex-start', gap: 14 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{t.title}</div>
                  <div className="secondary" style={{ fontSize: 12.5, marginTop: 6 }}>{funnel}</div>
                  <div style={{ marginTop: 10 }}>
                    <DeadlineChip status={t.status} nextDeadline={t.nextDeadline} />
                  </div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  {t.shortlistReady ? (
                    <button className="primary-blue sm" onClick={() => navigate(`/company/shortlist/${t.id}`)}>
                      <Icon name="star" size={14} /> Review shortlist
                    </button>
                  ) : (
                    <Icon name="chevron-right" size={18} color="var(--text-muted)" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
