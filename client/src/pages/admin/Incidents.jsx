import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Icon, Chip, Spinner, EmptyState, useToast } from '../../components/ui.jsx';

const RED = { background: 'var(--bad-50)', color: 'var(--bad)', fontWeight: 500 };

const TYPE = {
  no_show: { label: 'No-show', icon: 'user-off', tone: 'amber' },
  decision_missed: { label: 'Decision missed', icon: 'clock-x', red: true },
  sensitivity: { label: 'Sensitivity', icon: 'shield-x', red: true },
  dispute: { label: 'Dispute', icon: 'gavel', tone: 'amber' },
  harvest: { label: 'Harvest', icon: 'alert-triangle', red: true },
};

function typeChip(type) {
  const t = TYPE[type] || { label: type, icon: 'point', tone: 'neutral' };
  if (t.red) return <Chip tone="neutral" icon={t.icon} style={RED}>{t.label}</Chip>;
  return <Chip tone={t.tone} icon={t.icon}>{t.label}</Chip>;
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleDateString();
}

export default function Incidents() {
  const toast = useToast();
  const [incidents, setIncidents] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = () => api.get('/admin/incidents').then((d) => setIncidents(d.incidents)).catch((e) => toast.error(e.message));
  useEffect(() => { load(); }, []);

  const resolve = async (id) => {
    setBusyId(id);
    try {
      await api.post(`/admin/incidents/${id}/resolve`);
      toast.success('Incident resolved');
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const promote = async (inc) => {
    setBusyId(inc.id);
    try {
      await api.post(`/admin/tasks/${inc.task_id}/promote-backup`);
      toast.success('Backup promoted from the shortlist');
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  };

  if (!incidents) return <div className="content"><Spinner /></div>;

  const sorted = [...incidents].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
    return 0;
  });

  return (
    <div className="content">
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 20 }}>Disputes & no-shows</h2>
        <p className="secondary" style={{ marginTop: 3 }}>Resolve incidents and promote backups when a finalist doesn't show.</p>
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon="circle-check" title="No incidents">Nothing needs attention right now.</EmptyState>
      ) : (
        <div className="col" style={{ gap: 12 }}>
          {sorted.map((inc) => {
            const resolved = inc.status === 'resolved';
            return (
              <div key={inc.id} className="card" style={{ background: resolved ? 'var(--surface-1)' : 'var(--surface-2)' }}>
                <div className="spread" style={{ alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                      {typeChip(inc.type)}
                      {resolved ? <Chip tone="teal" icon="check">Resolved</Chip> : <Chip tone="outline">Open</Chip>}
                      <span className="muted" style={{ fontSize: 11.5 }}>{fmtDate(inc.created_at)}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      {inc.subjectName || 'Unknown'}{inc.taskTitle ? <span className="secondary" style={{ fontWeight: 400 }}> · {inc.taskTitle}</span> : ''}
                    </div>
                    {inc.detail && <p className="secondary" style={{ fontSize: 13, lineHeight: 1.55, marginTop: 6 }}>{inc.detail}</p>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                    {inc.type === 'no_show' && inc.task_id && (
                      <button className="ghost sm" onClick={() => promote(inc)} disabled={busyId === inc.id}>
                        <Icon name="arrow-up" size={14} /> Promote backup
                      </button>
                    )}
                    {!resolved && (
                      <button className="primary-teal sm" onClick={() => resolve(inc.id)} disabled={busyId === inc.id}>Resolve</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
