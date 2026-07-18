import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { Icon, Chip, Spinner, EmptyState, useToast } from '../../components/ui.jsx';

const ACTIVE = ['interested', 'screening_submitted', 'shortlisted', 'doing_task', 'live_defense', 'awaiting_decision'];
const CLOSED = ['won', 'lost', 'not_selected', 'no_show'];
const STEP_LABELS = ['Applied', 'Screening', 'Shortlist', 'Task', 'Defense', 'Result'];

// Short descriptor for the "next thing" per stage (the raw label is lost to timeLeft on the API)
const DEADLINE_DESC = {
  interested: 'Screening due',
  screening_submitted: 'Shortlist',
  shortlisted: 'Task due',
  doing_task: 'Task due',
  live_defense: 'Decision',
  awaiting_decision: 'Decision',
};

// Top-right status chip per stage
function statusChip(app) {
  const nd = app.nextDeadline;
  const when = nd ? (nd.overdue ? 'overdue' : nd.label) : '';
  switch (app.stage) {
    case 'interested':
      return { tone: nd?.overdue || nd?.days <= 2 ? 'amber' : 'neutral', icon: 'clock', text: `Screening due ${when}` };
    case 'screening_submitted':
      return { tone: 'neutral', icon: 'eye-check', text: 'Screening in — awaiting shortlist' };
    case 'shortlisted':
      return { tone: 'teal', icon: 'star', text: `Shortlisted · task due ${when}` };
    case 'doing_task':
      return { tone: nd?.overdue || nd?.days <= 2 ? 'amber' : 'teal', icon: 'checkbox', text: `Doing the task · due ${when}` };
    case 'live_defense':
      return { tone: 'amber', icon: 'microphone', text: 'Live defense next' };
    case 'awaiting_decision':
      return { tone: 'neutral', icon: 'clock', text: `Awaiting decision · ${when}` };
    case 'won':
      return { tone: 'teal', icon: 'trophy', text: 'Selected' };
    case 'no_show':
      return { tone: 'outline', icon: 'user-off', text: 'Missed the defense' };
    case 'not_selected':
    case 'lost':
    default:
      return { tone: 'outline', icon: null, text: 'Not this time' };
  }
}

// Colour for each of the 6 progress segments
function segColor(i, app) {
  const step = app.tracker?.step ?? 0;
  const isClosed = CLOSED.includes(app.stage);
  const isWon = app.stage === 'won';
  if (isWon) return i <= step ? 'var(--teal)' : 'var(--border)';
  if (isClosed) return i < step ? 'var(--border-strong)' : 'var(--border)';
  if (i < step) return 'var(--teal)';
  if (i === step) return 'var(--amber)';
  return 'var(--border)';
}

export default function Applications() {
  const navigate = useNavigate();
  const toast = useToast();
  const [apps, setApps] = useState(null);

  useEffect(() => {
    api.get('/applications/me').then((d) => setApps(d.applications)).catch((e) => toast.error(e.message));
  }, []);

  if (!apps) return <div className="content"><Spinner /></div>;

  const activeCount = apps.filter((a) => ACTIVE.includes(a.stage)).length;
  const closedCount = apps.filter((a) => CLOSED.includes(a.stage)).length;

  return (
    <div className="content" style={{ maxWidth: 820 }}>
      <div className="spread" style={{ alignItems: 'baseline', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 20 }}>My applications</h2>
          <p className="secondary" style={{ marginTop: 3 }}>Track where each task stands in the funnel.</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Chip tone="neutral">Active {activeCount}</Chip>
          <Chip tone="neutral">Closed {closedCount}</Chip>
        </div>
      </div>

      {apps.length === 0 && <EmptyState icon="list-check" title="No applications yet" >Express interest in a task to start tracking it here.</EmptyState>}

      <div className="col" style={{ gap: 14 }}>
        {apps.map((app) => {
          const chip = statusChip(app);
          const isClosed = CLOSED.includes(app.stage);
          const canOpenWorkspace = ['shortlisted', 'doing_task'].includes(app.stage);
          const clickable = ACTIVE.includes(app.stage);
          const step = app.tracker?.step ?? 0;
          const showRecognition = app.reputationAwarded > 0 && ['not_selected', 'lost', 'no_show'].includes(app.stage);

          const onCardClick = () => {
            if (!clickable) return;
            if (app.stage === 'interested') navigate(`/student/screening/${app.taskId}`);
            else if (canOpenWorkspace) navigate(`/student/workspace/${app.taskId}`);
            else navigate(`/student/tasks/${app.taskId}`);
          };

          return (
            <div
              key={app.id}
              className="card"
              style={{ background: isClosed ? 'var(--surface-1)' : 'var(--surface-2)', cursor: clickable ? 'pointer' : 'default' }}
              onClick={onCardClick}
            >
              <div className="spread" style={{ alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: isClosed ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{app.taskTitle}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                    <Icon name="building" size={13} color={isClosed ? 'var(--text-muted)' : 'var(--blue)'} />
                    <span style={{ fontSize: 12, color: isClosed ? 'var(--text-muted)' : 'var(--text-secondary)' }}>{app.company}</span>
                    {app.isNewcomerSlot && <Chip tone="teal" icon="seedling">Newcomer slot</Chip>}
                  </div>
                </div>
                <Chip tone={chip.tone} icon={chip.icon} style={{ whiteSpace: 'nowrap' }}>{chip.text}</Chip>
              </div>

              {/* 6-segment progress bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {app.steps.map((s, i) => (
                  <div key={s} style={{ flex: 1, height: 6, borderRadius: 3, background: segColor(i, app) }} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7, fontSize: 11, color: 'var(--text-muted)' }}>
                {app.steps.map((s, i) => (
                  <span key={s} style={i === step && !isClosed ? { color: app.stage === 'won' ? 'var(--teal-700)' : 'var(--amber-700)', fontWeight: 600 } : undefined}>
                    {STEP_LABELS[i]}
                  </span>
                ))}
              </div>

              {canOpenWorkspace && (
                <button
                  className="ghost"
                  style={{ width: 'auto', height: 32, padding: '0 14px', marginTop: 14, borderColor: 'var(--teal-700)', color: 'var(--teal-700)' }}
                  onClick={(e) => { e.stopPropagation(); navigate(`/student/workspace/${app.taskId}`); }}
                >
                  Open task workspace <Icon name="arrow-right" size={14} />
                </button>
              )}

              {showRecognition && (
                <div style={{ marginTop: 14, padding: '10px 12px', background: 'var(--teal-50)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="award" size={18} color="var(--teal-700)" />
                  <span style={{ fontSize: 13, color: 'var(--teal-900)', lineHeight: 1.5 }}>
                    You earned <b>+{app.reputationAwarded} reputation</b>{app.badgeAwarded ? <> and a "{app.badgeAwarded}" mark</> : ''} — it counts toward your next application.
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
