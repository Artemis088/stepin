import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { Icon, Chip, useToast } from '../../components/ui.jsx';

const SLOTS = [
  'Tomorrow · 10:00',
  'Tomorrow · 14:00',
  'Tomorrow · 17:00',
  'In 2 days · 11:00',
  'In 2 days · 15:00',
];

export default function LiveDefense() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [mode, setMode] = useState('slot'); // 'slot' | 'async'
  const [slot, setSlot] = useState('');
  const [link, setLink] = useState('');
  const [minutes, setMinutes] = useState(12);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (mode === 'slot' && !slot) { toast.error('Pick a time slot first.'); return; }
    if (mode === 'async' && !link.trim()) { toast.error('Paste your recording link first.'); return; }
    setBusy(true);
    try {
      await api.post(`/applications/tasks/${taskId}/defense`, {
        slot: mode === 'slot' ? slot : '',
        link: mode === 'async' ? link : '',
        minutes: Number(minutes) || 12,
      });
      toast.success('Live defense scheduled — good luck!');
      navigate('/student/applications');
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="content" style={{ maxWidth: 660 }}>
      <button className="link" onClick={() => navigate(`/student/workspace/${taskId}`)} style={{ marginBottom: 16, color: 'var(--text-muted)', fontSize: 12.5 }}>
        <Icon name="arrow-left" size={14} /> Back to workspace
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <Icon name="microphone" size={22} color="var(--amber-600)" />
        <h2 style={{ fontSize: 21 }}>Live defense</h2>
      </div>
      <p className="secondary" style={{ fontSize: 13.5, lineHeight: 1.7, marginBottom: 20 }}>
        A short (~15 min) conversation, finalists only. It mirrors a real hiring chat — be ready to explain your choices and the trade-offs you made. There are no trick questions.
      </p>

      {/* Prompt card */}
      <div style={{ border: '0.5px solid var(--border)', borderRadius: 12, padding: '16px 18px', background: 'var(--surface-2)', marginBottom: 22 }}>
        <h3 style={{ fontSize: 14.5, marginBottom: 12 }}>Be ready to explain</h3>
        <div className="col" style={{ gap: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Icon name="route" size={17} color="var(--amber-600)" /> Your approach — how you got to the answer.</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Icon name="arrows-split" size={17} color="var(--amber-600)" /> Your trade-offs — what you chose and why.</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Icon name="clock-plus" size={17} color="var(--amber-600)" /> What you'd do with more time.</div>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="segment" style={{ marginBottom: 18, width: 'fit-content' }}>
        <button className={mode === 'slot' ? 'on' : ''} onClick={() => setMode('slot')}>Pick a time slot</button>
        <button className={mode === 'async' ? 'on' : ''} onClick={() => setMode('async')}>Paste a recording</button>
      </div>

      {mode === 'slot' ? (
        <div>
          <label style={{ marginBottom: 8, display: 'block' }}>Choose a slot</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
            {SLOTS.map((s) => (
              <button
                key={s}
                onClick={() => setSlot(s)}
                style={s === slot ? { borderColor: 'var(--amber-600)', background: 'var(--amber-50)', color: 'var(--amber-900)', width: 'auto', padding: '0 14px' } : { width: 'auto', padding: '0 14px' }}
              >
                {s === slot && <Icon name="check" size={14} />} {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="field">
          <label>Recording link</label>
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://… (Loom, Drive, etc.)" />
          <span className="muted" style={{ fontSize: 11.5 }}>A 10–15 min screen recording walking through your work.</span>
        </div>
      )}

      <div className="field" style={{ maxWidth: 180 }}>
        <label>Length (minutes)</label>
        <input type="text" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/[^0-9]/g, ''))} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8 }}>
        <button className="primary-amber" style={{ height: 42, padding: '0 22px' }} onClick={submit} disabled={busy}>Confirm live defense</button>
        <Chip tone="neutral" icon="info-circle">Finalists only</Chip>
      </div>
    </div>
  );
}
