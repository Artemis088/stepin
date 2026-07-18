import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../AuthContext.jsx';
import { Icon, Chip, Avatar, Spinner, Modal, useToast } from '../../components/ui.jsx';

const EVIDENCE = {
  stepin_task: { icon: 'brand-stackshare', label: 'StepIn task' },
  certificate: { icon: 'certificate', label: 'Certificate' },
  course: { icon: 'school', label: 'Course' },
};

function evidenceMeta(skill) {
  const e = EVIDENCE[skill.evidenceType] || { icon: 'rosette-discount-check', label: 'Verified' };
  return { icon: e.icon, label: skill.evidenceNote || e.label };
}

export default function Profile() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [skillOpen, setSkillOpen] = useState(false);
  const [evidenceFor, setEvidenceFor] = useState(null);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({ name: '', bio: '', about: '', vertical: 'data' });
  const [newSkill, setNewSkill] = useState({ name: '', evidenceType: 'certificate', evidenceNote: '' });
  const [evidence, setEvidence] = useState({ evidenceType: 'certificate', evidenceNote: '' });

  const load = () => api.get(`/students/${user.id}`).then((d) => setProfile(d.profile)).catch((e) => toast.error(e.message));
  useEffect(() => { load(); }, [user.id]);

  if (!profile) return <div className="content"><Spinner /></div>;

  const openEdit = () => {
    setForm({ name: profile.name || '', bio: profile.bio || '', about: profile.about || '', vertical: profile.vertical || 'data' });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    setBusy(true);
    try {
      const { profile: p } = await api.patch('/students/me', form);
      setProfile(p);
      setEditOpen(false);
      refresh();
      toast.success('Profile updated');
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  const addSkill = async () => {
    if (!newSkill.name.trim()) { toast.error('Skill name is required'); return; }
    setBusy(true);
    try {
      const { profile: p } = await api.post('/students/me/skills', newSkill);
      setProfile(p);
      setSkillOpen(false);
      setNewSkill({ name: '', evidenceType: 'certificate', evidenceNote: '' });
      toast.success('Skill added');
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  const addEvidence = async () => {
    setBusy(true);
    try {
      const { profile: p } = await api.post(`/students/me/skills/${evidenceFor.id}/evidence`, evidence);
      setProfile(p);
      setEvidenceFor(null);
      setEvidence({ evidenceType: 'certificate', evidenceNote: '' });
      toast.success('Evidence added — skill verified');
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="content" style={{ maxWidth: 820 }}>
      <div className="col" style={{ gap: 20 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <Avatar initials={profile.initials} role="student" size={60} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ fontSize: 18 }}>{profile.name}</h2>
              <Chip tone="amber">{profile.vertical}</Chip>
            </div>
            <p className="secondary" style={{ marginTop: 3, fontSize: 13 }}>{profile.bio}</p>
          </div>
          <button style={{ width: 'auto', padding: '0 14px' }} onClick={openEdit}>
            <Icon name="edit" size={15} /> Edit
          </button>
        </div>

        {/* Stats */}
        <div className="grid-3">
          <div className="stat">
            <div className="k">Reputation score</div>
            <div className="v" style={{ color: 'var(--teal-700)' }}>{profile.reputation}</div>
          </div>
          <div className="stat">
            <div className="k">Rating</div>
            <div className="v">
              <Icon name="star" size={18} color="var(--amber)" /> {profile.rating ?? '—'}
            </div>
          </div>
          <div className="stat">
            <div className="k">Tasks completed</div>
            <div className="v">{profile.tasksCompleted}</div>
          </div>
        </div>

        {/* Badges */}
        {profile.badges?.length > 0 && (
          <div>
            <div className="secondary" style={{ fontSize: 13, marginBottom: 8 }}>Badges</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {profile.badges.map((b) => (
                <Chip key={b.id} tone="teal" icon={b.icon}>{b.label}{b.count > 1 ? ` ×${b.count}` : ''}</Chip>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 18 }}>
          <div className="spread" style={{ alignItems: 'baseline', marginBottom: 12 }}>
            <h3 style={{ fontSize: 16 }}>Skills</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="muted" style={{ fontSize: 12 }}>Only verified skills affect ranking</span>
              <button className="sm" onClick={() => setSkillOpen(true)}><Icon name="plus" size={13} /> Add skill</button>
            </div>
          </div>
          <div className="col" style={{ gap: 8 }}>
            {profile.skills.map((s) => {
              const verified = s.status === 'verified';
              const meta = evidenceMeta(s);
              return (
                <div
                  key={s.id}
                  className="spread"
                  style={{ padding: '10px 12px', borderRadius: 8, border: verified ? '0.5px solid var(--border)' : '0.5px dashed var(--border-strong)', opacity: verified ? 1 : 0.85 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 14, color: verified ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{s.name}</span>
                    {verified
                      ? <Chip tone="teal" icon="rosette-discount-check">Verified</Chip>
                      : <Chip tone="outline">Unverified</Chip>}
                  </div>
                  {verified ? (
                    <span className="secondary" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Icon name={meta.icon} size={14} /> {meta.label}
                    </span>
                  ) : (
                    <button className="sm" onClick={() => { setEvidenceFor(s); setEvidence({ evidenceType: 'certificate', evidenceNote: '' }); }}>Add evidence</button>
                  )}
                </div>
              );
            })}
            {profile.skills.length === 0 && <p className="muted" style={{ fontSize: 12.5 }}>No skills yet — add one, or earn a verified mark by completing a task.</p>}
          </div>
        </div>

        {/* About */}
        <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 18 }}>
          <div className="spread" style={{ alignItems: 'baseline', marginBottom: 8 }}>
            <h3 style={{ fontSize: 16 }}>About</h3>
            <span className="muted" style={{ fontSize: 12 }}>Free text — never affects ranking</span>
          </div>
          <p className="secondary" style={{ fontSize: 13, lineHeight: 1.7 }}>{profile.about || 'Nothing here yet.'}</p>
        </div>

        {/* Portfolio */}
        <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 18 }}>
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>Portfolio</h3>
          {profile.portfolio?.length > 0 ? (
            <div className="grid-2">
              {profile.portfolio.map((p) => (
                <div key={p.id} style={{ border: '0.5px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{p.title}</div>
                  <div className="secondary" style={{ fontSize: 12, marginTop: 2, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {p.confidential
                      ? <><Icon name="lock" size={13} /> Confidential client · {p.role}</>
                      : <><Icon name="building" size={13} color="var(--blue)" /> {p.companyName} · {p.role}</>}
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="muted" style={{ fontSize: 12.5 }}>Completed tasks will show up here as portfolio pieces.</p>}
        </div>

        {/* Ratings & history */}
        <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 18 }}>
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>Ratings & history</h3>
          {profile.ratingsProtected ? (
            <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
              Ratings are hidden until a few exist (protects you from a single early review).
            </p>
          ) : (
            <div className="col" style={{ gap: 10 }}>
              {profile.ratings.map((r, i) => (
                <div key={i} style={{ border: '0.5px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12.5 }}>
                    <span className="secondary"><b style={{ color: 'var(--text-primary)' }}>{r.quality}</b> quality</span>
                    <span className="secondary"><b style={{ color: 'var(--text-primary)' }}>{r.communication}</b> communication</span>
                    <span className="secondary"><b style={{ color: 'var(--text-primary)' }}>{r.metDeadline}</b> met deadline</span>
                  </div>
                  {r.note && <p className="secondary" style={{ fontSize: 12.5, marginTop: 8, lineHeight: 1.6 }}>{r.note}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit profile"
        footer={<>
          <button className="ghost" onClick={() => setEditOpen(false)}>Cancel</button>
          <button className="primary-amber" onClick={saveEdit} disabled={busy}>Save</button>
        </>}
      >
        <div className="field"><label>Name</label><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
        <div className="field"><label>Field</label>
          <select value={form.vertical} onChange={(e) => setForm((f) => ({ ...f, vertical: e.target.value }))}>
            <option value="data">Data</option>
            <option value="software">Software</option>
            <option value="design">Design</option>
          </select>
        </div>
        <div className="field"><label>Bio (one line)</label><input value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} /></div>
        <div className="field"><label>About</label><textarea rows={4} value={form.about} onChange={(e) => setForm((f) => ({ ...f, about: e.target.value }))} style={{ resize: 'none' }} /></div>
      </Modal>

      {/* Add skill modal */}
      <Modal open={skillOpen} onClose={() => setSkillOpen(false)} title="Add skill"
        footer={<>
          <button className="ghost" onClick={() => setSkillOpen(false)}>Cancel</button>
          <button className="primary-amber" onClick={addSkill} disabled={busy}>Add skill</button>
        </>}
      >
        <p className="muted" style={{ fontSize: 12.5, marginBottom: 14, lineHeight: 1.6 }}>
          Skills with a certificate or course become verified. StepIn-task verification is earned by completing a task, not added here.
        </p>
        <div className="field"><label>Skill</label><input value={newSkill.name} onChange={(e) => setNewSkill((s) => ({ ...s, name: e.target.value }))} placeholder="e.g. SQL" /></div>
        <div className="field"><label>Evidence type</label>
          <select value={newSkill.evidenceType} onChange={(e) => setNewSkill((s) => ({ ...s, evidenceType: e.target.value }))}>
            <option value="certificate">Certificate</option>
            <option value="course">Course</option>
            <option value="none">None (stays unverified)</option>
          </select>
        </div>
        <div className="field"><label>Evidence note</label><input value={newSkill.evidenceNote} onChange={(e) => setNewSkill((s) => ({ ...s, evidenceNote: e.target.value }))} placeholder="e.g. Microsoft cert" /></div>
      </Modal>

      {/* Add evidence modal */}
      <Modal open={!!evidenceFor} onClose={() => setEvidenceFor(null)} title={evidenceFor ? `Add evidence for ${evidenceFor.name}` : 'Add evidence'}
        footer={<>
          <button className="ghost" onClick={() => setEvidenceFor(null)}>Cancel</button>
          <button className="primary-teal" onClick={addEvidence} disabled={busy}>Verify skill</button>
        </>}
      >
        <div className="field"><label>Evidence type</label>
          <select value={evidence.evidenceType} onChange={(e) => setEvidence((s) => ({ ...s, evidenceType: e.target.value }))}>
            <option value="certificate">Certificate</option>
            <option value="course">Course</option>
          </select>
        </div>
        <div className="field"><label>Evidence note</label><input value={evidence.evidenceNote} onChange={(e) => setEvidence((s) => ({ ...s, evidenceNote: e.target.value }))} placeholder="e.g. Google Data Analytics" /></div>
      </Modal>
    </div>
  );
}
