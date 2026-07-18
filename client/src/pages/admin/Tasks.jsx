import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Icon, Chip, Modal, Spinner, EmptyState, useToast } from '../../components/ui.jsx';

const RED = { background: 'var(--bad-50)', color: 'var(--bad)', fontWeight: 500 };

function statusChip(status) {
  if (status === 'blocked') return <Chip tone="neutral" icon="shield-x" style={RED}>Blocked</Chip>;
  if (status === 'live' || status === 'open') return <Chip tone="teal" icon="broadcast">{status}</Chip>;
  return <Chip tone="neutral">{status}</Chip>;
}

export default function Tasks() {
  const toast = useToast();
  const [tasks, setTasks] = useState(null);
  const [filter, setFilter] = useState('all'); // all | live | blocked
  const [block, setBlock] = useState(null); // { id, title, reason }
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/admin/tasks').then((d) => setTasks(d.tasks)).catch((e) => toast.error(e.message));
  useEffect(() => { load(); }, []);

  const doBlock = async () => {
    setBusy(true);
    try {
      await api.post(`/admin/tasks/${block.id}/block`, { reason: block.reason });
      toast.success('Task blocked');
      setBlock(null);
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const clear = async (id) => {
    try {
      await api.post(`/admin/tasks/${id}/clear`);
      toast.success('Task cleared / restored');
      await load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (!tasks) return <div className="content"><Spinner /></div>;

  const shown = tasks.filter((t) => {
    if (filter === 'live') return t.status !== 'blocked';
    if (filter === 'blocked') return t.status === 'blocked';
    return true;
  });

  return (
    <div className="content">
      <div className="spread" style={{ alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <h2 style={{ fontSize: 20 }}>Task sensitivity moderation</h2>
          <p className="secondary" style={{ marginTop: 3 }}>Review task descriptions and block anything using real or sensitive data.</p>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: 'auto' }}>
          <option value="all">All tasks</option>
          <option value="live">Unreviewed / live</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      {shown.length === 0 ? (
        <EmptyState icon="shield-check" title="No tasks to moderate" />
      ) : (
        <div className="col" style={{ gap: 12 }}>
          {shown.map((t) => (
            <div key={t.id} className="card" style={{ background: t.status === 'blocked' ? 'var(--surface-1)' : 'var(--surface-2)' }}>
              <div className="spread" style={{ alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 8 }}>
                    {statusChip(t.status)}
                    <Chip tone="neutral">{t.vertical}</Chip>
                    {t.sampleDataConfirmed
                      ? <Chip tone="teal" icon="database">Sample data confirmed</Chip>
                      : <Chip tone="amber" icon="database-off">Sample data not confirmed</Chip>}
                    {!t.sensitivityOk && t.status !== 'blocked' && <Chip tone="neutral" icon="alert-triangle" style={RED}>Flagged</Chip>}
                  </div>
                  <div style={{ fontSize: 15.5, fontWeight: 600 }}>{t.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <Icon name="building" size={13} color="var(--text-muted)" />
                    <span className="secondary" style={{ fontSize: 12.5 }}>{t.company}</span>
                  </div>
                  <p className="secondary" style={{ fontSize: 13, lineHeight: 1.6, marginTop: 10 }}>{t.description}</p>
                </div>
                <div style={{ flexShrink: 0 }}>
                  {t.status === 'blocked' ? (
                    <button className="ghost sm" onClick={() => clear(t.id)}>
                      <Icon name="restore" size={14} /> Clear / restore
                    </button>
                  ) : t.sensitivityOk ? (
                    <button
                      className="sm"
                      style={{ background: 'var(--bad)', color: '#fff', borderColor: 'var(--bad)' }}
                      onClick={() => setBlock({ id: t.id, title: t.title, reason: '' })}
                    >
                      <Icon name="shield-x" size={14} /> Block
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!block}
        onClose={() => setBlock(null)}
        title={block ? `Block "${block.title}"` : ''}
        footer={
          <>
            <button className="ghost" onClick={() => setBlock(null)}>Cancel</button>
            <button className="sm" style={{ height: 36, padding: '0 14px', background: 'var(--bad)', color: '#fff', borderColor: 'var(--bad)' }} onClick={doBlock} disabled={busy}>Block task</button>
          </>
        }
      >
        {block && (
          <div className="field">
            <label>Reason (shown to the company)</label>
            <textarea
              rows={4}
              value={block.reason}
              onChange={(e) => setBlock((b) => ({ ...b, reason: e.target.value }))}
              placeholder="Task appears to use real/sensitive data."
              style={{ resize: 'none' }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
