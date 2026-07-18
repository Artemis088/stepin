import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Icon, Chip, Spinner, EmptyState, useToast } from '../../components/ui.jsx';

const th = {
  textAlign: 'left', padding: '10px 12px', fontSize: 12, letterSpacing: '0.02em',
  textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 500,
  borderBottom: '0.5px solid var(--border)', whiteSpace: 'nowrap',
};
const td = { padding: '10px 12px', borderBottom: '0.5px solid var(--border)', verticalAlign: 'middle', fontSize: 13 };

export default function ShortlistConfig() {
  const toast = useToast();
  const [tasks, setTasks] = useState(null);
  const [edits, setEdits] = useState({}); // id -> { meritSlots, newcomerSlots }
  const [busyId, setBusyId] = useState(null);

  const load = () =>
    api.get('/admin/shortlist-config').then((d) => {
      setTasks(d.tasks);
      const e = {};
      d.tasks.forEach((t) => { e[t.id] = { meritSlots: t.merit_slots ?? 0, newcomerSlots: t.newcomer_slots ?? 0 }; });
      setEdits(e);
    }).catch((err) => toast.error(err.message));
  useEffect(() => { load(); }, []);

  const setField = (id, field, val) => setEdits((s) => ({ ...s, [id]: { ...s[id], [field]: val } }));

  const save = async (id) => {
    setBusyId(id);
    try {
      await api.patch(`/admin/tasks/${id}/slots`, {
        meritSlots: Number(edits[id].meritSlots),
        newcomerSlots: Number(edits[id].newcomerSlots),
      });
      toast.success('Slots updated');
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  };

  if (!tasks) return <div className="content"><Spinner /></div>;

  return (
    <div className="content">
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 20 }}>Blind scoring & shortlist configuration</h2>
        <p className="secondary" style={{ marginTop: 3 }}>Set how many merit and reserved newcomer slots each task's shortlist holds.</p>
      </div>

      <div style={{ display: 'flex', gap: 10, padding: '13px 16px', background: 'var(--teal-50)', borderRadius: 10, marginBottom: 20 }}>
        <Icon name="eye-off" size={18} color="var(--teal-700)" style={{ flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontSize: 13, color: 'var(--teal-900)', lineHeight: 1.55 }}>
          The shortlist = merit slots (highest blind score, any history) + reserved newcomer slots (best newcomers who cleared screening). Lifetime reputation is only a tiebreaker/context, never the gate.
        </span>
      </div>

      {tasks.length === 0 ? (
        <EmptyState icon="adjustments" title="No tasks to configure" />
      ) : (
        <div style={{ border: '0.5px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: 'var(--surface-2)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
              <thead>
                <tr>
                  <th style={th}>Task</th>
                  <th style={th}>Status</th>
                  <th style={{ ...th, textAlign: 'center' }}>Merit slots</th>
                  <th style={{ ...th, textAlign: 'center' }}>Newcomer slots</th>
                  <th style={{ ...th, textAlign: 'right' }}>Screening cap</th>
                  <th style={{ ...th, textAlign: 'right' }}>Applied cap</th>
                  <th style={{ ...th, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => {
                  const e = edits[t.id] || {};
                  const dirty = Number(e.meritSlots) !== (t.merit_slots ?? 0) || Number(e.newcomerSlots) !== (t.newcomer_slots ?? 0);
                  return (
                    <tr key={t.id}>
                      <td style={{ ...td, fontWeight: 600 }}>{t.title}</td>
                      <td style={td}><Chip tone="neutral">{t.status}</Chip></td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        <input type="number" min={0} value={e.meritSlots} onChange={(ev) => setField(t.id, 'meritSlots', ev.target.value)} style={{ width: 72, textAlign: 'center' }} />
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        <input type="number" min={0} value={e.newcomerSlots} onChange={(ev) => setField(t.id, 'newcomerSlots', ev.target.value)} style={{ width: 72, textAlign: 'center' }} />
                      </td>
                      <td style={{ ...td, textAlign: 'right', color: 'var(--text-secondary)' }}>{t.screening_cap}</td>
                      <td style={{ ...td, textAlign: 'right', color: 'var(--text-secondary)' }}>{t.applied_cap}</td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        <button className="primary-teal sm" onClick={() => save(t.id)} disabled={!dirty || busyId === t.id}>Save</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
