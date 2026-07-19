import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { Icon, Chip, Bar, Countdown, Spinner, Avatar, useToast } from '../../components/ui.jsx';
import { useAuth } from '../../AuthContext.jsx';
import { useGuestGate } from '../../GuestGate.jsx';
import { useT } from '../../i18n.jsx';

const MOTIVE = {
  needs_now: { tone: 'amber', icon: 'bolt', labelKey: 'motive.needs_now' },
  scouting: { tone: 'blue', icon: 'users', labelKey: 'motive.scouting' },
};

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { guest } = useAuth();
  const { gate } = useGuestGate();
  const { t } = useT();
  const [task, setTask] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.get(`/tasks/${id}`).then((d) => setTask(d.task));
  useEffect(() => { load(); }, [id]);

  if (!task) return <div className="content"><Spinner /></div>;
  const m = MOTIVE[task.motive];
  const applied = !!task.myStage;

  const cdLabel = (cd) => (!cd ? '' : cd.overdue ? t('time.overdue') : cd.days === 0 ? t('time.today') : t('time.inDays', { n: cd.days }));

  const apply = async () => {
    setBusy(true);
    try {
      await api.post(`/applications/tasks/${id}/apply`);
      toast.success(t('td.grabbedSlot'));
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
      <span style={{ fontSize: 12, fontWeight: 500, color: cd?.overdue || (cd?.days <= 2) ? 'var(--amber-700)' : 'var(--text-secondary)' }}>{cdLabel(cd)}</span>
    </div>
  );

  return (
    <div className="content">
      <button className="link" onClick={() => navigate(task.isInternship ? '/student/internships' : '/student/tasks')} style={{ marginBottom: 16, color: 'var(--text-muted)', fontSize: 12.5 }}>
        <Icon name="arrow-left" size={14} /> {t('td.backToTasks')}
      </button>

      <div style={{ display: 'flex', gap: 26, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              {task.isInternship && <Chip tone="amber" icon="school">{t('tasks.internshipBadge')}</Chip>}
              <Chip tone={m.tone} icon={m.icon}>{t(m.labelKey)}</Chip>
              {task.sampleData && <Chip tone="teal" icon="database">{t('tasks.sampleData')}</Chip>}
              <Chip tone="neutral">{t(`field.${task.vertical}`)}</Chip>
            </div>
            <h2 style={{ fontSize: 23 }}>{task.title}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 9 }}>
              <Avatar initials={task.company?.initials} role="company" size={24} />
              <span className="secondary" style={{ fontSize: 13.5 }}>{task.company?.name}</span>
              {task.company?.verified && <Chip tone="blue" icon="rosette-discount-check">{t('tasks.verified')}{task.company.rating ? ` · ${task.company.rating}` : ''}</Chip>}
            </div>
          </div>

          {/* Outcome banner — the one thing that differs between the two types */}
          {task.isInternship ? (
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'var(--amber-50)', border: '0.5px solid var(--amber)', borderRadius: 12, padding: '14px 16px' }}>
              <Icon name="school" size={20} color="var(--amber-700)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 13.5, color: 'var(--amber-900)', lineHeight: 1.6 }}>
                <b>{t('td.internshipLead')}</b> {t('td.internshipBannerBody')}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'var(--surface-1)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
              <Icon name="briefcase" size={20} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <b style={{ color: 'var(--text-primary)' }}>{t('td.standaloneLead')}</b> {t('td.standaloneBannerBody')}
              </div>
            </div>
          )}

          <div><h3 style={{ fontSize: 14.5, marginBottom: 6 }}>{t('td.theTask')}</h3><p className="secondary" style={{ fontSize: 13.5, lineHeight: 1.7 }}>{task.description}</p></div>
          <div><h3 style={{ fontSize: 14.5, marginBottom: 6 }}>{t('td.doneLooks')}</h3><p className="secondary" style={{ fontSize: 13.5, lineHeight: 1.7 }}>{task.doneLooksLike}</p></div>

          <div>
            <h3 style={{ fontSize: 14.5, marginBottom: 9 }}>{t('td.skillsWanted')}</h3>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {(task.skillMatch || task.skills.map((s) => ({ name: s }))).map((s) =>
                s.have && s.verified ? (
                  <Chip key={s.name} tone="teal" icon="check">{s.name} · {t('td.youHaveThis')}</Chip>
                ) : (
                  <Chip key={s.name} tone="neutral">{s.name}</Chip>
                )
              )}
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: 14.5, marginBottom: 6 }}>{t('td.reward')}</h3>
            <p className="secondary" style={{ fontSize: 13.5 }}>
              {task.compensationType === 'stipend'
                ? <>{t('td.rewardBase')} <b>{t('td.rewardStipendBold', { amount: task.stipendAmount })}</b></>
                : <>{t('td.rewardBase')} <span className="muted">{t('td.noStipendNote')}</span></>}
            </p>
          </div>

          <div style={{ background: 'var(--surface-1)', borderRadius: 12, padding: '16px 18px' }}>
            <h3 style={{ fontSize: 14.5, marginBottom: 12 }}>{t('td.whatApplying')}</h3>
            <div className="col" style={{ gap: 11, fontSize: 13.5, color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Icon name="forms" size={17} color="var(--amber-600)" /> {t('td.involve1')}</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Icon name="star" size={17} color="var(--amber-600)" /> {t('td.involve2')}</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Icon name="microphone" size={17} color="var(--amber-600)" /> {t('td.involve3')}</div>
              {task.isInternship ? (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--amber-900)', fontWeight: 500 }}><Icon name="school" size={17} color="var(--amber-700)" /> {t('td.involveHired')}</div>
              ) : (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Icon name="rosette-discount-check" size={17} color="var(--teal-700)" /> {t('td.involveProfile')}</div>
              )}
            </div>
          </div>
        </div>

        {/* right status rail */}
        <div style={{ width: 262, flexShrink: 0, border: '0.5px solid var(--border)', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 18, background: 'var(--surface-2)' }}>
          <div>
            <div className="spread" style={{ fontSize: 12.5, marginBottom: 6 }}><span className="secondary">{t('td.appliedLabel')}</span><span style={{ fontWeight: 600 }}>{task.counts.applied} / {task.appliedCap}</span></div>
            <Bar value={task.counts.applied} max={task.appliedCap} color="var(--amber)" />
          </div>
          <div>
            <div className="spread" style={{ fontSize: 12.5, marginBottom: 6 }}><span className="secondary">{t('td.screeningSlots')}</span><span style={{ fontWeight: 600 }}>{task.counts.screened} / {task.screeningCap}</span></div>
            <Bar value={task.counts.screened} max={task.screeningCap} color="var(--teal-700)" />
            <div className="muted" style={{ fontSize: 11, marginTop: 6, lineHeight: 1.4 }}>{t('td.fillsNote', { n: task.newcomerSlots })}</div>
          </div>
          <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 12 }}>
            <D n={1} label={t('tasks.applicationsClose')} cd={task.countdowns.apply} />
            <D n={2} label={t('td.screeningDue')} cd={task.countdowns.screening} />
            <D n={3} label={t('td.taskDueFinalists')} cd={task.countdowns.task} />
            <D n={4} label={t('td.companyDecides')} cd={task.countdowns.decision} amber />
          </div>
          {applied ? (
            <div>
              <button className="primary-teal" style={{ width: '100%', height: 44 }} onClick={() => navigate(task.myStage === 'interested' ? `/student/screening/${id}` : '/student/applications')}>
                {task.myStage === 'interested' ? t('td.continueScreening') : t('td.viewApplication')}
              </button>
              <div className="muted" style={{ fontSize: 11, marginTop: 8, textAlign: 'center' }}>{t('td.youreIn')} {t(`stage.${task.myStage}`)}</div>
            </div>
          ) : (
            <div>
              <button
                className="primary-amber"
                style={{ width: '100%', height: 44 }}
                onClick={guest ? () => gate() : apply}
                disabled={guest ? false : busy || task.countdowns.apply?.overdue}
              >
                {guest ? t('td.signUpToApply') : t('td.expressInterest')}
              </button>
              <div className="muted" style={{ fontSize: 11, marginTop: 8, textAlign: 'center' }}>
                {guest ? t('td.guestApplyNote') : t('td.grabsSlot', { n: task.appliedCap })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
