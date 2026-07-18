import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { Icon, Chip, Countdown, Spinner, useToast } from '../../components/ui.jsx';

export default function Workspace() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: '', summary: '', link: '', text: '' });

  const load = () =>
    api.get(`/applications/tasks/${taskId}/workspace`)
      .then((d) => { setData(d); setForm({
        name: d.application.deliverable?.name || '',
        summary: d.application.deliverable?.summary || '',
        link: d.application.deliverable?.link || '',
        text: d.application.deliverable?.text || '',
      }); })
      .catch((e) => toast.error(e.message));
  useEffect(() => { load(); }, [taskId]);

  if (!data) return <div className="content"><Spinner /></div>;

  const { task, application, terms, taskCountdown } = data;
  const submitted = !!application.submittedAt;
  const termsAccepted = application.termsAccepted;

  const acceptTerms = async () => {
    setBusy(true);
    try {
      await api.post(`/applications/tasks/${taskId}/accept-terms`);
      toast.success('Terms accepted — you can submit now');
      load();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  const submit = async () => {
    if (!form.name && !form.link && !form.text) { toast.error('Provide a file name, a link, or text for your deliverable.'); return; }
    setBusy(true);
    try {
      await api.post(`/applications/tasks/${taskId}/submit`, form);
      toast.success('Submitted — next up is a short live defense');
      load();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="content" style={{ maxWidth: 780 }}>
      <button className="link" onClick={() => navigate('/student/applications')} style={{ marginBottom: 16, color: 'var(--text-muted)', fontSize: 12.5 }}>
        <Icon name="arrow-left" size={14} /> Back to applications
      </button>

      <div className="spread" style={{ alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ minWidth: 0 }}>
          <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Task workspace</div>
          <h2 style={{ fontSize: 21 }}>{task.title}</h2>
        </div>
        <Countdown deadline={taskCountdown} prefix="Task due" />
      </div>

      {/* Prominent task-due banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 10, marginTop: 12, marginBottom: 22, background: taskCountdown?.overdue || taskCountdown?.days <= 2 ? 'var(--amber-50)' : 'var(--surface-1)' }}>
        <Icon name={taskCountdown?.overdue ? 'alert-triangle' : 'clock'} size={18} color={taskCountdown?.overdue || taskCountdown?.days <= 2 ? 'var(--amber-700)' : 'var(--text-secondary)'} />
        <span style={{ fontSize: 13, color: taskCountdown?.overdue || taskCountdown?.days <= 2 ? 'var(--amber-900)' : 'var(--text-secondary)' }}>
          {taskCountdown?.overdue ? 'This task is overdue.' : <>Your deliverable is due <b>{taskCountdown?.label}</b>. Submit before the clock runs out.</>}
        </span>
      </div>

      {/* Brief */}
      <div className="col" style={{ gap: 18 }}>
        <div><h3 style={{ fontSize: 14.5, marginBottom: 6 }}>The task</h3><p className="secondary" style={{ fontSize: 13.5, lineHeight: 1.7 }}>{task.description}</p></div>
        <div><h3 style={{ fontSize: 14.5, marginBottom: 6 }}>What "done" looks like</h3><p className="secondary" style={{ fontSize: 13.5, lineHeight: 1.7 }}>{task.doneLooksLike}</p></div>
      </div>

      {/* Per-task terms */}
      <div style={{ border: '0.5px solid var(--border)', borderRadius: 12, padding: '16px 18px', background: 'var(--surface-2)', marginTop: 22 }}>
        <div className="spread" style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 14.5 }}>Before you submit — the terms</h3>
          {termsAccepted && <Chip tone="teal" icon="check">Accepted</Chip>}
        </div>
        <div className="col" style={{ gap: 11, fontSize: 13, color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', gap: 10 }}><Icon name="file-description" size={17} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 1 }} /> {terms.transfers}</div>
          <div style={{ display: 'flex', gap: 10 }}><Icon name="briefcase" size={17} color="var(--teal-700)" style={{ flexShrink: 0, marginTop: 1 }} /> <span style={{ color: 'var(--teal-900)' }}>{terms.portfolioCarveout}</span></div>
          <div style={{ display: 'flex', gap: 10 }}><Icon name="coin" size={17} color="var(--amber-600)" style={{ flexShrink: 0, marginTop: 1 }} /> {terms.payment}</div>
        </div>
        {!termsAccepted && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)' }}>
            <input type="checkbox" checked={false} onChange={acceptTerms} disabled={busy} style={{ width: 16, height: 16, flexShrink: 0 }} />
            I understand and accept these terms for this task.
          </label>
        )}
      </div>

      {/* Submission */}
      <div style={{ marginTop: 22, opacity: termsAccepted ? 1 : 0.55, pointerEvents: termsAccepted ? 'auto' : 'none' }}>
        <h3 style={{ fontSize: 14.5, marginBottom: 4 }}>Your submission</h3>
        <p className="muted" style={{ fontSize: 12, marginBottom: 14 }}>{termsAccepted ? 'Add a file name, a link and/or a short write-up.' : 'Accept the terms above to unlock submission.'}</p>
        {submitted && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--teal-50)', borderRadius: 8, marginBottom: 14 }}>
            <Icon name="circle-check" size={18} color="var(--teal-700)" />
            <span style={{ fontSize: 13, color: 'var(--teal-900)' }}>Submitted. You can update it until the deadline.</span>
          </div>
        )}
        <div className="field"><label>File name</label><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. churn_report.pdf" /></div>
        <div className="field"><label>One-line summary</label><input value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} placeholder="What you built, in a sentence" /></div>
        <div className="field"><label>Link</label><input value={form.link} onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))} placeholder="https://…" /></div>
        <div className="field"><label>Or paste your write-up</label><textarea rows={5} value={form.text} onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))} style={{ resize: 'none' }} placeholder="Your approach, decisions, results…" /></div>
        <button className="primary-amber" style={{ height: 42, padding: '0 22px' }} onClick={submit} disabled={busy || !termsAccepted}>
          {submitted ? 'Update submission' : 'Submit deliverable'}
        </button>
      </div>

      {/* Live defense note */}
      <div style={{ marginTop: 24, border: '0.5px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Icon name="microphone" size={18} color="var(--amber-600)" />
          <h3 style={{ fontSize: 14.5 }}>Live defense</h3>
        </div>
        <p className="secondary" style={{ fontSize: 13, lineHeight: 1.6 }}>
          After submitting, you'll do a short live defense — walk us through your choices.
        </p>
        <button
          className="primary-teal"
          style={{ marginTop: 14, height: 38 }}
          disabled={!submitted}
          onClick={() => navigate(`/student/defense/${taskId}`)}
        >
          {submitted ? 'Go to live defense' : 'Submit first to unlock defense'}
        </button>
      </div>
    </div>
  );
}
