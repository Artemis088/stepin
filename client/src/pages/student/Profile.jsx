import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../AuthContext.jsx';
import { Icon, Chip, Avatar, Spinner, Modal, useToast } from '../../components/ui.jsx';
import { isValidUrl } from '../../validate.js';

const EVIDENCE = {
  stepin_task: { icon: 'brand-stackshare', label: 'StepIn task' },
  certificate: { icon: 'certificate', label: 'Certificate' },
  course: { icon: 'school', label: 'Course' },
};

const MAX_MB = 10;
const ACCEPT = '.pdf,.jpg,.jpeg,.png';
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

// Evidence inputs that change with the selected type. Kept at module scope so
// the file/URL inputs keep focus across re-renders.
function EvidenceFields({ evidenceType, file, setFile, url, setUrl, allowNone, onError }) {
  const pick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return setFile(null);
    if (!ALLOWED_TYPES.includes(f.type)) { onError('Only PDF, JPG or PNG files are allowed.'); e.target.value = ''; return; }
    if (f.size > MAX_MB * 1024 * 1024) { onError('File is too large (max 10 MB).'); e.target.value = ''; return; }
    setFile(f);
  };
  const fileRow = file && (
    <div className="secondary" style={{ fontSize: 12, marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <Icon name="paperclip" size={13} /> {file.name}
    </div>
  );

  if (evidenceType === 'certificate') {
    return (
      <div className="field" style={{ marginBottom: 0 }}>
        <label>Certificate file (PDF, JPG or PNG · max {MAX_MB} MB)</label>
        <input type="file" accept={ACCEPT} onChange={pick} />
        {fileRow}
      </div>
    );
  }
  if (evidenceType === 'course') {
    return (
      <>
        <div className="field">
          <label>Upload course certificate (PDF, JPG or PNG · max {MAX_MB} MB)</label>
          <input type="file" accept={ACCEPT} onChange={pick} disabled={!!url.trim()} />
          {fileRow}
        </div>
        <div className="muted" style={{ textAlign: 'center', fontSize: 12, margin: '2px 0 10px' }}>— or —</div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Public link to your course completion</label>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://coursera.org/verify/…" disabled={!!file} />
          {url.trim() && !file && !isValidUrl(url) && (
            <span style={{ fontSize: 12, color: 'var(--bad)' }}>Enter a valid URL starting with http:// or https://</span>
          )}
        </div>
      </>
    );
  }
  // self-taught / none
  return allowNone ? (
    <div style={{ background: 'var(--surface-1)', border: '0.5px solid var(--border)', borderRadius: 8, padding: '11px 13px', fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
      Self-taught skills stay <b>unverified</b> until you prove them by completing a StepIn task. You can add it now and verify it later.
    </div>
  ) : null;
}

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
  const [newSkill, setNewSkill] = useState({ name: '', evidenceType: 'certificate' });
  const [skillFile, setSkillFile] = useState(null);
  const [skillUrl, setSkillUrl] = useState('');
  const [evidence, setEvidence] = useState({ evidenceType: 'certificate' });
  const [evFile, setEvFile] = useState(null);
  const [evUrl, setEvUrl] = useState('');

  const resetSkillForm = () => { setNewSkill({ name: '', evidenceType: 'certificate' }); setSkillFile(null); setSkillUrl(''); };
  const resetEvidenceForm = () => { setEvidence({ evidenceType: 'certificate' }); setEvFile(null); setEvUrl(''); };

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
    if (newSkill.evidenceType === 'course' && !skillFile && skillUrl.trim() && !isValidUrl(skillUrl)) {
      toast.error('Enter a valid course link (https://…) or upload a file'); return;
    }
    setBusy(true);
    try {
      let p;
      if (skillFile) {
        const fd = new FormData();
        fd.append('name', newSkill.name.trim());
        fd.append('evidenceType', newSkill.evidenceType);
        fd.append('evidence', skillFile);
        ({ profile: p } = await api.upload('/students/me/skills', fd));
      } else {
        ({ profile: p } = await api.post('/students/me/skills', {
          name: newSkill.name.trim(),
          evidenceType: newSkill.evidenceType,
          evidenceUrl: newSkill.evidenceType === 'course' ? skillUrl.trim() : '',
        }));
      }
      setProfile(p);
      setSkillOpen(false);
      resetSkillForm();
      toast.success('Skill added');
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  const addEvidence = async () => {
    if (evidence.evidenceType === 'certificate' && !evFile) { toast.error('Upload your certificate file to verify'); return; }
    if (evidence.evidenceType === 'course' && !evFile && !isValidUrl(evUrl)) { toast.error('Upload a file or paste a valid course link to verify'); return; }
    setBusy(true);
    try {
      let p;
      if (evFile) {
        const fd = new FormData();
        fd.append('evidenceType', evidence.evidenceType);
        fd.append('evidence', evFile);
        ({ profile: p } = await api.upload(`/students/me/skills/${evidenceFor.id}/evidence`, fd));
      } else {
        ({ profile: p } = await api.post(`/students/me/skills/${evidenceFor.id}/evidence`, {
          evidenceType: evidence.evidenceType,
          evidenceUrl: evidence.evidenceType === 'course' ? evUrl.trim() : '',
        }));
      }
      setProfile(p);
      setEvidenceFor(null);
      resetEvidenceForm();
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
                      <Icon name={meta.icon} size={14} />
                      {s.evidenceFile ? (
                        <a href={`/uploads/${s.evidenceFile}`} target="_blank" rel="noreferrer">{s.evidenceNote || 'View file'}</a>
                      ) : s.evidenceUrl ? (
                        <a href={s.evidenceUrl} target="_blank" rel="noreferrer">View link</a>
                      ) : (
                        meta.label
                      )}
                    </span>
                  ) : (
                    <button className="sm" onClick={() => { setEvidenceFor(s); resetEvidenceForm(); }}>Add evidence</button>
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
      <Modal open={skillOpen} onClose={() => { setSkillOpen(false); resetSkillForm(); }} title="Add skill"
        footer={<>
          <button className="ghost" onClick={() => { setSkillOpen(false); resetSkillForm(); }}>Cancel</button>
          <button className="primary-amber" onClick={addSkill} disabled={busy}>Add skill</button>
        </>}
      >
        <p className="muted" style={{ fontSize: 12.5, marginBottom: 14, lineHeight: 1.6 }}>
          The strongest verification is completing a StepIn task — that's the one we control and it can't be faked. A certificate or course link verifies a skill too, but must be backed by real proof.
        </p>
        <div className="field"><label>Skill</label><input value={newSkill.name} onChange={(e) => setNewSkill((s) => ({ ...s, name: e.target.value }))} placeholder="e.g. SQL" /></div>
        <div className="field"><label>Evidence type</label>
          <select value={newSkill.evidenceType} onChange={(e) => { setNewSkill((s) => ({ ...s, evidenceType: e.target.value })); setSkillFile(null); setSkillUrl(''); }}>
            <option value="certificate">Certificate</option>
            <option value="course">Course</option>
            <option value="none">Self-taught / other</option>
          </select>
        </div>
        <EvidenceFields
          evidenceType={newSkill.evidenceType}
          file={skillFile} setFile={setSkillFile}
          url={skillUrl} setUrl={setSkillUrl}
          allowNone
          onError={(m) => toast.error(m)}
        />
      </Modal>

      {/* Add evidence modal (verify an existing skill) */}
      <Modal open={!!evidenceFor} onClose={() => { setEvidenceFor(null); resetEvidenceForm(); }} title={evidenceFor ? `Verify ${evidenceFor.name}` : 'Add evidence'}
        footer={<>
          <button className="ghost" onClick={() => { setEvidenceFor(null); resetEvidenceForm(); }}>Cancel</button>
          <button className="primary-teal" onClick={addEvidence} disabled={busy}>Verify skill</button>
        </>}
      >
        <p className="muted" style={{ fontSize: 12.5, marginBottom: 14, lineHeight: 1.6 }}>
          Attach real proof to verify this skill. The strongest verification is completing a StepIn task, which can't be faked.
        </p>
        <div className="field"><label>Evidence type</label>
          <select value={evidence.evidenceType} onChange={(e) => { setEvidence({ evidenceType: e.target.value }); setEvFile(null); setEvUrl(''); }}>
            <option value="certificate">Certificate</option>
            <option value="course">Course</option>
          </select>
        </div>
        <EvidenceFields
          evidenceType={evidence.evidenceType}
          file={evFile} setFile={setEvFile}
          url={evUrl} setUrl={setEvUrl}
          onError={(m) => toast.error(m)}
        />
      </Modal>
    </div>
  );
}
