import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { Icon, Chip, Bar, Countdown, Spinner, Avatar, useToast } from '../../components/ui.jsx';

const MOTIVE = {
  needs_now: { tone: 'amber', icon: 'bolt', label: 'Needs it now' },
  scouting: { tone: 'blue', icon: 'users', label: 'Scouting talent' },
};

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [task, setTask] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.get(`/tasks/${id}`).then((d) => setTask(d.task));
  useEffect(() => { load(); }, [id]);

  if (!task) return <div className="content"><Spinner /></div>;
  const m = MOTIVE[task.motive];
  const applied = !!task.myStage;

  const apply = async () => {
    setBusy(true);
    try {
      await api.post(`/applications/tasks/${id}/apply`);
      toast.success('You grabbed a slot — now do the screening step');
      navigate(`/student/screening/${id}`);
    } catch (err) {
      toast.error(err.message);
      load();
    } finally {
      setBusy(false);
    }
  };

  const D = ({ n, label, cd, amber }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: n < 4 ? '0.5px solid var(--border)' : 'none' }}>
      <span style={{ width: 20, height: 20, borderRadius: '50%', background: amber ? 'var(--amber-50)' : 'var(--blue-50)', color: amber ? 'var(--amber-700)' : 'var(--blue-800)', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</span>
      <span style={{ flex: 1, fontSize: 12.5 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 500, color: cd?.overdue || (cd?.days <= 2) ? 'var(--amber-700)' : 'var(--text-secondary)' }}>{cd?.label}</span>
    </div>
  );

  return (
    <div className="content">
      <button className="link" onClick={() => navigate('/student/tasks')} style={{ marginBottom: 16, color: 'var(--text-muted)', fontSize: 12.5 }}>
        <Icon name="arrow-left" size={14} /> Back to tasks
      </button>

      <div style={{ display: 'flex', gap: 26, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              {task.isInternship && <Chip tone="amber" icon="school">Internship</Chip>}
              <Chip tone={m.tone} icon={m.icon}>{m.label}</Chip>
              {task.sampleData && <Chip tone="teal" icon="database">Sample data</Chip>}
              <Chip tone="neutral">{task.vertical}</Chip>
            </div>
            <h2 style={{ fontSize: 23 }}>{task.title}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 9 }}>
              <Avatar initials={task.company?.initials} role="company" size={24} />
              <span className="secondary" style={{ fontSize: 13.5 }}>{task.company?.name}</span>
              {task.company?.verified && <Chip tone="blue" icon="rosette-discount-check">Verified{task.company.rating ? ` · ${task.company.rating}` : ''}</Chip>}
            </div>
          </div>

          {/* Outcome banner — the one thing that differs between the two types */}
          {task.isInternship ? (
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'var(--amber-50)', border: '0.5px solid var(--amber)', borderRadius: 12, padding: '14px 16px' }}>
              <Icon name="school" size={20} color="var(--amber-700)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 13.5, color: 'var(--amber-900)', lineHeight: 1.6 }}>
                <b>This is an internship.</b> You enter through the trial task below. The finalist who does best is <b>hired into the internship</b> — a guaranteed outcome for the winner.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'var(--surface-1)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
              <Icon name="briefcase" size={20} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <b style={{ color: 'var(--text-primary)' }}>One-off task.</b> It builds your verified profile — no internship is guaranteed, but a company that likes your work may reach out later.
              </div>
            </div>
          )}

          <div><h3 style={{ fontSize: 14.5, marginBottom: 6 }}>The task</h3><p className="secondary" style={{ fontSize: 13.5, lineHeight: 1.7 }}>{task.description}</p></div>
          <div><h3 style={{ fontSize: 14.5, marginBottom: 6 }}>What "done" looks like</h3><p className="secondary" style={{ fontSize: 13.5, lineHeight: 1.7 }}>{task.doneLooksLike}</p></div>

          <div>
            <h3 style={{ fontSize: 14.5, marginBottom: 9 }}>Skills wanted</h3>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {(task.skillMatch || task.skills.map((s) => ({ name: s }))).map((s) =>
                s.have && s.verified ? (
                  <Chip key={s.name} tone="teal" icon="check">{s.name} · you have this</Chip>
                ) : (
                  <Chip key={s.name} tone="neutral">{s.name}</Chip>
                )
              )}
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: 14.5, marginBottom: 6 }}>Reward</h3>
            <p className="secondary" style={{ fontSize: 13.5 }}>
              {task.compensationType === 'stipend'
                ? <>Reputation, a badge, a portfolio piece <b>and a ${task.stipendAmount} stipend</b></>
                : <>Reputation, a badge, and a portfolio piece <span className="muted">(no stipend on this task)</span></>}
            </p>
          </div>

          <div style={{ background: 'var(--surface-1)', borderRadius: 12, padding: '16px 18px' }}>
            <h3 style={{ fontSize: 14.5, marginBottom: 12 }}>What applying involves</h3>
            <div className="col" style={{ gap: 11, fontSize: 13.5, color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Icon name="forms" size={17} color="var(--amber-600)" /> Do a ~30 min screening step (not the full task yet)</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Icon name="star" size={17} color="var(--amber-600)" /> If shortlisted (best 3–5), you do the real task</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Icon name="microphone" size={17} color="var(--amber-600)" /> Finalists give a short walkthrough of their work</div>
              {task.isInternship ? (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--amber-900)', fontWeight: 500 }}><Icon name="school" size={17} color="var(--amber-700)" /> The best finalist is hired into the internship</div>
              ) : (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Icon name="rosette-discount-check" size={17} color="var(--teal-700)" /> Your score builds your verified profile — no task is wasted</div>
              )}
            </div>
          </div>
        </div>

        {/* right status rail */}
        <div style={{ width: 262, flexShrink: 0, border: '0.5px solid var(--border)', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 18, background: 'var(--surface-2)' }}>
          <div>
            <div className="spread" style={{ fontSize: 12.5, marginBottom: 6 }}><span className="secondary">Applied</span><span style={{ fontWeight: 600 }}>{task.counts.applied} / {task.appliedCap}</span></div>
            <Bar value={task.counts.applied} max={task.appliedCap} color="var(--amber)" />
          </div>
          <div>
            <div className="spread" style={{ fontSize: 12.5, marginBottom: 6 }}><span className="secondary">Screening slots</span><span style={{ fontWeight: 600 }}>{task.counts.screened} / {task.screeningCap}</span></div>
            <Bar value={task.counts.screened} max={task.screeningCap} color="var(--teal-700)" />
            <div className="muted" style={{ fontSize: 11, marginTop: 6, lineHeight: 1.4 }}>fills by who completes first · {task.newcomerSlots} held for newcomers</div>
          </div>
          <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 12 }}>
            <D n={1} label="Applications close" cd={task.countdowns.apply} />
            <D n={2} label="Screening due" cd={task.countdowns.screening} />
            <D n={3} label="Task due (finalists)" cd={task.countdowns.task} />
            <D n={4} label="Company decides" cd={task.countdowns.decision} amber />
          </div>
          {applied ? (
            <div>
              <button className="primary-teal" style={{ width: '100%', height: 44 }} onClick={() => navigate(task.myStage === 'interested' ? `/student/screening/${id}` : '/student/applications')}>
                {task.myStage === 'interested' ? 'Continue to screening' : 'View my application'}
              </button>
              <div className="muted" style={{ fontSize: 11, marginTop: 8, textAlign: 'center' }}>You're in — stage: {task.myStage}</div>
            </div>
          ) : (
            <div>
              <button className="primary-amber" style={{ width: '100%', height: 44 }} onClick={apply} disabled={busy || task.countdowns.apply?.overdue}>
                Express interest
              </button>
              <div className="muted" style={{ fontSize: 11, marginTop: 8, textAlign: 'center' }}>grabs 1 of the {task.appliedCap} applied slots</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
