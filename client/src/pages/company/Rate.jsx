import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { Icon, Chip, Avatar, Spinner, StarPicker, EmptyState, useToast } from '../../components/ui.jsx';

function RateCard({ finalist, taskId, onRated }) {
  const toast = useToast();
  const [quality, setQuality] = useState(0);
  const [communication, setCommunication] = useState(0);
  const [metDeadline, setMetDeadline] = useState(0);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(finalist.rated);

  const submit = async () => {
    if (!quality || !communication || !metDeadline) {
      toast.error('Set all three ratings before submitting.');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/company/tasks/${taskId}/rate`, {
        studentId: finalist.studentId,
        quality,
        communication,
        metDeadline,
        note,
      });
      setDone(true);
      toast.success(`Rated ${finalist.name}`);
      onRated?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const Row = ({ label, value, onChange }) => (
    <div className="spread" style={{ padding: '4px 0' }}>
      <span className="secondary" style={{ fontSize: 13 }}>{label}</span>
      <StarPicker value={value} onChange={onChange} />
    </div>
  );

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <Avatar initials={finalist.initials} role="student" size={34} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{finalist.name}</div>
        </div>
        {finalist.won && <Chip tone="teal" icon="trophy">Winner</Chip>}
        {done && <Chip tone="neutral" icon="check">Rated</Chip>}
      </div>

      {done ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--teal-700)' }}>
          <Icon name="circle-check" size={16} color="var(--teal-700)" />
          Rating submitted — the platform issued badges and scores from it.
        </div>
      ) : (
        <div className="col" style={{ gap: 4 }}>
          <Row label="Quality" value={quality} onChange={setQuality} />
          <Row label="Communication" value={communication} onChange={setCommunication} />
          <Row label="Met deadline" value={metDeadline} onChange={setMetDeadline} />
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note"
            style={{ resize: 'none', marginTop: 8 }}
          />
          <div style={{ marginTop: 10 }}>
            <button className="primary-blue sm" onClick={submit} disabled={busy}>
              Submit rating
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Rate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);

  const load = () =>
    api.get(`/company/tasks/${id}/rate`).then(setData).catch((e) => toast.error(e.message));

  useEffect(() => {
    load();
  }, [id]);

  if (!data) return <div className="content"><Spinner /></div>;
  const { task, finalists } = data;
  // Winner first, then the rest.
  const ordered = [...finalists].sort((a, b) => (b.won ? 1 : 0) - (a.won ? 1 : 0));

  return (
    <div className="content" style={{ maxWidth: 640 }}>
      <button
        className="link"
        onClick={() => navigate(`/company/shortlist/${id}`)}
        style={{ marginBottom: 16, color: 'var(--text-muted)', fontSize: 12.5 }}
      >
        <Icon name="arrow-left" size={14} /> Back to shortlist
      </button>

      <div style={{ marginBottom: 8 }}>
        <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Rate finalists · {task.title}</div>
        <h2 style={{ fontSize: 22 }}>Structured ratings</h2>
      </div>

      <p className="secondary" style={{ fontSize: 13, marginBottom: 20 }}>
        The platform auto-issues badges and scores from these — you don't need to write a summary. Rating
        non-winners is encouraged too.
      </p>

      {finalists.length === 0 ? (
        <EmptyState icon="star" title="No finalists to rate" />
      ) : (
        <div className="col" style={{ gap: 16 }}>
          {ordered.map((f) => (
            <RateCard key={f.applicationId} finalist={f} taskId={id} onRated={load} />
          ))}
        </div>
      )}
    </div>
  );
}
