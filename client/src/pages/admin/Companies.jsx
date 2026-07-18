import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Icon, Chip, Modal, Spinner, EmptyState, useToast } from '../../components/ui.jsx';

const RED = { background: 'var(--bad-50)', color: 'var(--bad)', fontWeight: 500 };
const th = {
  textAlign: 'left', padding: '10px 12px', fontSize: 12, letterSpacing: '0.02em',
  textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 500,
  borderBottom: '0.5px solid var(--border)', whiteSpace: 'nowrap',
};
const td = { padding: '12px', borderBottom: '0.5px solid var(--border)', verticalAlign: 'middle', fontSize: 13 };

function statusChip(status) {
  if (status === 'trusted') return <Chip tone="teal" icon="rosette-discount-check">Trusted</Chip>;
  if (status === 'probation') return <Chip tone="amber" icon="shield-half">Probation</Chip>;
  if (status === 'flagged') return <Chip tone="neutral" icon="flag" style={RED}>Flagged</Chip>;
  return <Chip tone="neutral">{status}</Chip>;
}

export default function Companies() {
  const toast = useToast();
  const [companies, setCompanies] = useState(null);
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState(null); // { id, name, status, cap }

  const load = () => api.get('/admin/companies').then((d) => setCompanies(d.companies)).catch((e) => toast.error(e.message));
  useEffect(() => { load(); }, []);

  const saveStatus = async () => {
    setBusy(true);
    try {
      await api.post(`/admin/companies/${edit.id}/status`, { status: edit.status, cap: Number(edit.cap) });
      toast.success('Company standing updated');
      setEdit(null);
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const reReview = async (id) => {
    try {
      await api.post(`/admin/companies/${id}/review`);
      toast.success('Standing recomputed');
      await load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (!companies) return <div className="content"><Spinner /></div>;

  return (
    <div className="content">
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 20 }}>Company vetting & probation</h2>
        <p className="secondary" style={{ marginTop: 3 }}>Review standing, set concurrent-task caps, and watch for harvest signals.</p>
      </div>

      {companies.length === 0 ? (
        <EmptyState icon="building-bank" title="No companies registered yet" />
      ) : (
        <div style={{ border: '0.5px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: 'var(--surface-2)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr>
                  <th style={th}>Company</th>
                  <th style={th}>Registration ID</th>
                  <th style={th}>Contact</th>
                  <th style={th}>Status</th>
                  <th style={{ ...th, textAlign: 'right' }}>Posted</th>
                  <th style={{ ...th, textAlign: 'right' }}>Selections</th>
                  <th style={{ ...th, textAlign: 'right' }}>Missed</th>
                  <th style={{ ...th, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id}>
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600 }}>{c.name}</span>
                        {c.harvestSignal && (
                          <Chip tone="neutral" icon="alert-triangle" style={RED}>Harvest signal</Chip>
                        )}
                      </div>
                      <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>Cap: {c.concurrentCap} · {c.agreementSigned ? 'agreement signed' : 'no agreement'}</div>
                    </td>
                    <td style={{ ...td, color: 'var(--text-secondary)' }}>{c.registrationId || '—'}</td>
                    <td style={{ ...td, color: 'var(--text-secondary)' }}>{c.contactEmail || '—'}</td>
                    <td style={td}>{statusChip(c.status)}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{c.tasksPosted}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{c.selections}</td>
                    <td style={{ ...td, textAlign: 'right', color: c.missedDecisions > 0 ? 'var(--bad)' : undefined }}>{c.missedDecisions}</td>
                    <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="sm ghost" onClick={() => setEdit({ id: c.id, name: c.name, status: c.status, cap: c.concurrentCap })}>Set status</button>
                      <button className="sm ghost" style={{ marginLeft: 6 }} onClick={() => reReview(c.id)}>Re-review</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit ? `Set standing — ${edit.name}` : ''}
        footer={
          <>
            <button className="ghost" onClick={() => setEdit(null)}>Cancel</button>
            <button className="primary-teal" onClick={saveStatus} disabled={busy}>Save</button>
          </>
        }
      >
        {edit && (
          <>
            <div className="field">
              <label>Status</label>
              <select value={edit.status} onChange={(e) => setEdit((s) => ({ ...s, status: e.target.value }))}>
                <option value="probation">Probation</option>
                <option value="trusted">Trusted</option>
                <option value="flagged">Flagged</option>
              </select>
            </div>
            <div className="field">
              <label>Concurrent task cap</label>
              <input type="number" min={0} value={edit.cap} onChange={(e) => setEdit((s) => ({ ...s, cap: e.target.value }))} />
            </div>
            <p className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
              <Icon name="info-circle" size={13} /> Setting status to trusted also marks the company verified.
            </p>
          </>
        )}
      </Modal>
    </div>
  );
}
