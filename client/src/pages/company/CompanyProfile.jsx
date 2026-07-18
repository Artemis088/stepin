import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../AuthContext.jsx';
import { Icon, Chip, Avatar, Stat, Modal, Spinner, useToast } from '../../components/ui.jsx';

const STATUS = {
  trusted: { tone: 'teal', label: 'Trusted' },
  probation: { tone: 'amber', label: 'Probation' },
  flagged: { tone: 'bad', label: 'Flagged' },
};

export default function CompanyProfile() {
  const { user } = useAuth();
  const toast = useToast();
  const [company, setCompany] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', website: '', contactName: '' });
  const [busy, setBusy] = useState(false);

  const load = () =>
    api.get(`/company/profile/${user.id}`).then((d) => setCompany(d.company)).catch((e) => toast.error(e.message));

  useEffect(() => {
    if (user?.id) load();
  }, [user?.id]);

  if (!company) return <div className="content"><Spinner /></div>;

  const openEdit = () => {
    setForm({ name: company.name || '', website: company.website || '', contactName: '' });
    setEditing(true);
  };

  const save = async () => {
    setBusy(true);
    try {
      await api.patch('/company/profile', form);
      toast.success('Profile updated');
      setEditing(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const st = STATUS[company.status] || { tone: 'neutral', label: company.status };
  const statusChip =
    st.tone === 'bad' ? (
      <Chip style={{ background: 'var(--bad-50)', color: 'var(--bad)' }} icon="flag">{st.label}</Chip>
    ) : (
      <Chip tone={st.tone}>{st.label}</Chip>
    );

  return (
    <div className="content" style={{ maxWidth: 760 }}>
      {/* Header */}
      <div className="spread" style={{ alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <Avatar initials={company.initials} role="company" size={52} />
          <div>
            <h2 style={{ fontSize: 22 }}>{company.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              {company.website && (
                <a href={company.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5 }}>
                  <Icon name="link" size={13} /> {company.website.replace(/^https?:\/\//, '')}
                </a>
              )}
              {company.verified && <Chip tone="teal" icon="rosette-discount-check">Verified</Chip>}
              {statusChip}
            </div>
          </div>
        </div>
        <button className="ghost" onClick={openEdit}>
          <Icon name="edit" size={14} /> Edit
        </button>
      </div>

      <p className="muted" style={{ fontSize: 12, marginBottom: 22 }}>Students see this before applying.</p>

      {/* Stats */}
      <div className="grid-2" style={{ marginBottom: 12 }}>
        <Stat label="Rating from students">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon name="star-filled" size={18} color="var(--amber)" />
            {company.rating != null ? company.rating : '—'}
            <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
              ({company.ratingsCount})
            </span>
          </span>
        </Stat>
        <Stat label="Concurrent-task cap">{company.concurrentCap}</Stat>
        <Stat label="Tasks posted">{company.tasksPosted}</Stat>
        <Stat label="Selections made">{company.selections}</Stat>
      </div>

      {/* History */}
      <h3 style={{ fontSize: 15, margin: '26px 0 12px' }}>Tasks posted</h3>
      {company.tasks.length === 0 ? (
        <div className="muted" style={{ fontSize: 13 }}>No tasks posted yet.</div>
      ) : (
        <div className="col" style={{ gap: 8 }}>
          {company.tasks.map((t) => (
            <div
              key={t.id}
              className="spread"
              style={{ padding: '11px 14px', border: '0.5px solid var(--border)', borderRadius: 10, background: 'var(--surface-2)' }}
            >
              <span style={{ fontSize: 13.5 }}>{t.title}</span>
              <Chip tone="neutral">{t.status.replace(/_/g, ' ')}</Chip>
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Edit company profile"
        footer={
          <>
            <button className="ghost" onClick={() => setEditing(false)}>Cancel</button>
            <button className="primary-blue" onClick={save} disabled={busy}>Save</button>
          </>
        }
      >
        <div className="field">
          <label>Company name</label>
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="field">
          <label>Website</label>
          <input
            value={form.website}
            onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
            placeholder="https://…"
          />
        </div>
        <div className="field">
          <label>Contact name</label>
          <input value={form.contactName} onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
