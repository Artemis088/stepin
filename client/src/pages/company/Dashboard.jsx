import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { Icon, Chip, Spinner, EmptyState } from '../../components/ui.jsx';
import { useT } from '../../i18n.jsx';

const STANDING = {
  probation: {
    tone: 'amber',
    bg: 'var(--amber-50)',
    border: 'var(--amber)',
    fg: 'var(--amber-900)',
    accent: 'var(--amber-700)',
    icon: 'shield-half',
    labelKey: 'cd.probationLabel',
  },
  trusted: {
    tone: 'teal',
    bg: 'var(--teal-50)',
    border: 'var(--teal)',
    fg: 'var(--teal-900)',
    accent: 'var(--teal-700)',
    icon: 'rosette-discount-check',
    labelKey: 'cd.trustedLabel',
  },
  flagged: {
    tone: 'bad',
    bg: 'var(--bad-50)',
    border: 'var(--bad)',
    fg: 'var(--bad)',
    accent: 'var(--bad)',
    icon: 'alert-triangle',
    labelKey: 'cd.flaggedLabel',
  },
};

function DeadlineChip({ status, nextDeadline }) {
  const { t } = useT();
  if (!nextDeadline) return null;
  const critical = nextDeadline.critical;
  const prefix =
    status === 'finalists_working'
      ? t('cd.decideBy')
      : status === 'screening'
      ? t('cd.screeningDue')
      : status === 'live'
      ? t('cd.applicationsClose')
      : '';
  const urgent = critical || nextDeadline.overdue || nextDeadline.days <= 2;
  return (
    <Chip tone={urgent ? 'amber' : 'neutral'} icon={nextDeadline.overdue ? 'alert-triangle' : 'clock'}>
      {prefix} {nextDeadline.overdue ? t('cd.overdue') : nextDeadline.label}
    </Chip>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useT();
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
          <p className="secondary" style={{ marginTop: 3 }}>{t('cd.subtitle')}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <button
            className="primary-blue"
            style={{ height: 40, padding: '0 18px' }}
            disabled={!company.canPost}
            onClick={() => company.canPost && navigate('/company/post')}
          >
            <Icon name="plus" size={16} /> {t('cd.postTask')}
          </button>
          {!company.canPost && (
            <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>
              {t('cd.atCap', { n: company.concurrentCap })}
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
            <span style={{ fontSize: 14.5, fontWeight: 600, color: s.fg }}>{t(s.labelKey)}</span>
            <span style={{ fontSize: 12, color: s.accent }}>
              {t('cd.tasksUsed', { open: company.openCount, cap: company.concurrentCap })}
            </span>
          </div>
          {company.status === 'probation' && (
            <div style={{ fontSize: 12.5, color: s.fg, lineHeight: 1.6, marginTop: 6 }}>
              {t('cd.probationText')}
            </div>
          )}
          {company.status === 'trusted' && (
            <div style={{ fontSize: 12.5, color: s.fg, lineHeight: 1.6, marginTop: 6 }}>
              {t('cd.trustedText')}
            </div>
          )}
          {company.status === 'flagged' && (
            <div style={{ fontSize: 12.5, color: s.fg, lineHeight: 1.6, marginTop: 6 }}>
              {t('cd.flaggedText')}
            </div>
          )}
        </div>
      </div>

      {/* Active tasks */}
      <h3 style={{ fontSize: 14.5, color: 'var(--blue-800)', marginBottom: 12 }}>{t('cd.activeTasks')}</h3>
      {tasks.length === 0 && (
        <EmptyState icon="briefcase-off" title={t('cd.noTasks')}>
          <button className="primary-blue sm" style={{ marginTop: 14 }} onClick={() => navigate('/company/post')} disabled={!company.canPost}>
            {t('cd.postFirst')}
          </button>
        </EmptyState>
      )}

      <div className="col" style={{ gap: 10 }}>
        {tasks.map((task) => {
          const funnel = `${task.counts.applied}/${task.appliedCap} ${t('cd.applied')} · ${task.counts.screened}/${task.screeningCap} ${t('cd.screened')}${
            task.shortlistReady ? ` · ${t('cd.shortlistReady')}` : ''
          }`;
          return (
            <div
              key={task.id}
              className="card"
              style={{ background: 'var(--surface-0)', cursor: task.shortlistReady ? 'default' : 'pointer' }}
              onClick={() => !task.shortlistReady && navigate(`/company/tasks/${task.id}`)}
            >
              <div className="spread" style={{ alignItems: 'flex-start', gap: 14 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{task.title}</div>
                  <div className="secondary" style={{ fontSize: 12.5, marginTop: 6 }}>{funnel}</div>
                  <div style={{ marginTop: 10 }}>
                    <DeadlineChip status={task.status} nextDeadline={task.nextDeadline} />
                  </div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  {task.shortlistReady ? (
                    <button className="primary-blue sm" onClick={() => navigate(`/company/shortlist/${task.id}`)}>
                      <Icon name="star" size={14} /> {t('cd.reviewShortlist')}
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
