import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { Icon, Chip, Countdown, Spinner, useToast } from '../../components/ui.jsx';

export default function Screening() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.get(`/applications/tasks/${taskId}/screening`).then(setData).catch((e) => toast.error(e.message));
  }, [taskId]);

  if (!data) return <div className="content"><Spinner /></div>;
  if (data.alreadySubmitted && !done) {
    return (
      <div className="content" style={{ maxWidth: 620 }}>
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <Icon name="circle-check" size={40} color="var(--teal-700)" />
          <h2 style={{ fontSize: 18, margin: '12px 0 6px' }}>Screening already submitted</h2>
          <p className="secondary">If you're shortlisted, you'll be invited to the full task.</p>
          <button className="ghost" style={{ marginTop: 16 }} onClick={() => navigate('/student/applications')}>View my applications</button>
        </div>
      </div>
    );
  }

  const set = (qid, val) => setAnswers((a) => ({ ...a, [qid]: val }));

  const submit = async () => {
    setBusy(true);
    try {
      const res = await api.post(`/applications/tasks/${taskId}/screening`, { answers });
      setDone(true);
      toast.success(`Submitted — you took screening slot ${res.slotTaken} / ${res.cap}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="content" style={{ maxWidth: 620 }}>
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <Icon name="circle-check" size={40} color="var(--teal-700)" />
          <h2 style={{ fontSize: 18, margin: '12px 0 6px' }}>Submitted</h2>
          <p className="secondary">If you're shortlisted, you'll be invited to the full task.</p>
          <button className="primary-teal" style={{ marginTop: 18 }} onClick={() => navigate('/student/applications')}>Track my application</button>
        </div>
      </div>
    );
  }

  return (
    <div className="content" style={{ maxWidth: 760 }}>
      <button className="link" onClick={() => navigate(`/student/tasks/${taskId}`)} style={{ marginBottom: 16, color: 'var(--text-muted)', fontSize: 12.5 }}>
        <Icon name="arrow-left" size={14} /> Back to task
      </button>

      <div className="spread" style={{ alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Screening step · {data.task.title}</div>
          <h2 style={{ fontSize: 18 }}>{data.template.name}</h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Chip tone="neutral" icon="clock">~{data.template.estMinutes} min</Chip>
          <Countdown deadline={data.countdown} prefix="Due" />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: 'var(--teal-50)', borderRadius: 10, marginBottom: 18 }}>
        <Icon name="eye-off" size={18} color="var(--teal-700)" />
        <span style={{ fontSize: 13, color: 'var(--teal-900)', lineHeight: 1.5 }}>
          Reviewed <b>blind</b> — your name, photo and past scores are hidden. Only your answers here decide if you're shortlisted.
        </span>
      </div>

      <div className="col" style={{ gap: 14 }}>
        {data.questions.map((q, i) => (
          <div key={q.id} style={{ border: '0.5px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span className="muted" style={{ fontSize: 12 }}>Question {i + 1} of {data.questions.length}</span>
              {q.reviewedBy === 'auto' ? <Chip tone="neutral">auto-checked</Chip> : <Chip tone="amber">reviewed by company</Chip>}
            </div>
            <p style={{ fontSize: 14, marginBottom: 12 }}>{q.prompt}</p>

            {q.type === 'mcq' && (
              <div className="col" style={{ gap: 8 }}>
                {q.options.map((opt) => {
                  const on = answers[q.id] === opt;
                  return (
                    <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: on ? '2px solid var(--blue)' : '0.5px solid var(--border)', borderRadius: 8, background: on ? 'var(--blue-50)' : 'transparent', cursor: 'pointer', fontSize: 13 }}>
                      <span style={{ width: 15, height: 15, borderRadius: '50%', border: on ? '4px solid var(--blue)' : '1.5px solid var(--border-strong)', flexShrink: 0 }} />
                      <input type="radio" name={q.id} style={{ display: 'none' }} onChange={() => set(q.id, opt)} />
                      {opt}
                    </label>
                  );
                })}
              </div>
            )}

            {q.type === 'numeric' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="text" value={answers[q.id] || ''} onChange={(e) => set(q.id, e.target.value)} style={{ width: 90, textAlign: 'center' }} placeholder="0" />
                {q.unit && <span className="secondary" style={{ fontSize: 14 }}>{q.unit}</span>}
              </div>
            )}

            {q.type === 'reasoning' && (
              <div>
                <textarea rows={4} maxLength={q.maxChars || 400} value={answers[q.id] || ''} onChange={(e) => set(q.id, e.target.value)} placeholder="Your approach…" style={{ resize: 'none' }} />
                <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{(answers[q.id] || '').length} / {q.maxChars || 400}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 16, marginTop: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
        <button className="primary-amber" style={{ height: 42, padding: '0 22px' }} onClick={submit} disabled={busy}>Submit screening</button>
        <span className="secondary" style={{ fontSize: 12 }}>
          <Icon name="info-circle" size={13} /> Submitting takes screening slot <b>{data.slot.next} / {data.slot.cap}</b> — the slot is taken on completion, not on start.
        </span>
      </div>
    </div>
  );
}
