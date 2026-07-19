import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { Icon, Chip, Modal, useToast } from '../../components/ui.jsx';

const VERTICALS = [
  { value: 'data', label: 'Data' },
  { value: 'software', label: 'Software' },
  { value: 'design', label: 'Design' },
];

const TEMPLATE_QUESTIONS = {
  data: [
    'Multiple choice: pick the correct interpretation of a summary statistic.',
    'Numeric: compute a simple churn / conversion rate from a small sample table.',
    'Reasoning (~150 words): outline how you would approach the analysis.',
  ],
  software: [
    'Multiple choice: identify the bug in a short code snippet.',
    'Numeric: give the time complexity of a described routine.',
    'Reasoning (~150 words): describe how you would structure the solution.',
  ],
  design: [
    'Multiple choice: choose the strongest layout for a stated goal.',
    'Numeric: estimate a spacing / contrast value from a sample.',
    'Reasoning (~150 words): explain your approach to the brief.',
  ],
};

const H3 = ({ children }) => (
  <h3 style={{ fontSize: 15, color: 'var(--blue-800)', margin: '0 0 12px' }}>{children}</h3>
);

const Section = ({ children, first }) => (
  <div style={first ? {} : { borderTop: '0.5px solid var(--border)', paddingTop: 18 }}>{children}</div>
);

export default function PostTask() {
  const navigate = useNavigate();
  const toast = useToast();

  const [slots, setSlots] = useState(null); // { openCount, concurrentCap }
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [skillDraft, setSkillDraft] = useState('');
  const skillRef = useRef(null);

  const [form, setForm] = useState({
    isInternship: true,
    title: '',
    description: '',
    doneLooksLike: '',
    vertical: 'data',
    skills: [],
    motive: 'needs_now',
    sampleDataConfirmed: false,
    compensationType: 'credential',
    stipendAmount: 500,
    appliedCap: 20,
    screeningCap: 10,
    applyInDays: 3,
    screeningInDays: 5,
    taskInDays: 10,
    decisionInDays: 13,
  });
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  useEffect(() => {
    api.get('/company/dashboard').then((d) => setSlots({ openCount: d.company.openCount, concurrentCap: d.company.concurrentCap }));
  }, []);

  const verticalLabel = VERTICALS.find((v) => v.value === form.vertical)?.label || 'Data';

  const addSkill = () => {
    const s = skillDraft.trim();
    if (s && !form.skills.includes(s)) set({ skills: [...form.skills, s] });
    setSkillDraft('');
  };
  const removeSkill = (s) => set({ skills: form.skills.filter((x) => x !== s) });

  const requiredFilled = form.title.trim() && form.description.trim() && form.doneLooksLike.trim();
  const canPublish = requiredFilled && form.sampleDataConfirmed;

  const submit = async (publish) => {
    if (publish && !canPublish) return;
    setBusy(true);
    try {
      await api.post('/tasks', {
        isInternship: form.isInternship,
        title: form.title,
        description: form.description,
        doneLooksLike: form.doneLooksLike,
        vertical: form.vertical,
        skills: form.skills,
        motive: form.motive,
        sampleDataConfirmed: form.sampleDataConfirmed,
        compensationType: form.compensationType,
        stipendAmount: form.compensationType === 'stipend' ? Number(form.stipendAmount) || 0 : 0,
        appliedCap: Number(form.appliedCap),
        screeningCap: Number(form.screeningCap),
        newcomerSlots: 2,
        meritSlots: 3,
        applyInDays: Number(form.applyInDays),
        screeningInDays: Number(form.screeningInDays),
        taskInDays: Number(form.taskInDays),
        decisionInDays: Number(form.decisionInDays),
        publish,
      });
      toast.success(publish ? 'Task published' : 'Draft saved');
      navigate('/company/dashboard');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const numInput = { width: 88, textAlign: 'center' };

  const Deadline = ({ n, label, hint, field, amber }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: n < 4 ? '0.5px solid var(--border)' : 'none' }}>
      <span style={{ width: 22, height: 22, borderRadius: '50%', background: amber ? 'var(--amber-50)' : 'var(--blue-50)', color: amber ? 'var(--amber-700)' : 'var(--blue-800)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</span>
      <span style={{ flex: 1, fontSize: 13 }}>{label} {hint && <span className="muted">({hint})</span>}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="secondary" style={{ fontSize: 12.5 }}>in</span>
        <input type="number" min={1} value={form[field]} onChange={(e) => set({ [field]: e.target.value })} style={numInput} />
        <span className="secondary" style={{ fontSize: 12.5 }}>days</span>
      </span>
    </div>
  );

  return (
    <div className="content" style={{ maxWidth: 760 }}>
      <button className="link" onClick={() => navigate('/company/dashboard')} style={{ marginBottom: 16, color: 'var(--text-muted)', fontSize: 12.5 }}>
        <Icon name="arrow-left" size={14} /> Back to dashboard
      </button>
      <div className="spread" style={{ alignItems: 'baseline', marginBottom: 22 }}>
        <h2 style={{ fontSize: 20, color: 'var(--blue-800)' }}>Post a task</h2>
        {slots && (
          <Chip tone="neutral">{slots.openCount} of {slots.concurrentCap} task slots used</Chip>
        )}
      </div>

      <div className="col" style={{ gap: 22 }}>
        {/* Opportunity type — the single flag that defines the outcome */}
        <Section first>
          <H3>Opportunity type</H3>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { on: true, icon: 'school', title: 'Internship', caption: 'Entered via this trial task. The winning finalist is hired into the internship — a guaranteed outcome.' },
              { on: false, icon: 'briefcase', title: 'Standalone task', caption: 'A one-off task. No guaranteed internship — you may reach out to strong performers later.' },
            ].map((o) => {
              const active = form.isInternship === o.on;
              return (
                <button
                  key={String(o.on)}
                  type="button"
                  onClick={() => set({ isInternship: o.on })}
                  style={{ flex: 1, textAlign: 'left', height: 'auto', display: 'block', padding: '14px 16px', borderRadius: 12, border: active ? '2px solid var(--blue)' : '0.5px solid var(--border)', background: active ? 'var(--blue-50)' : 'var(--surface-0)' }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, color: active ? 'var(--blue-800)' : 'var(--text-primary)' }}>
                    <Icon name={o.icon} size={16} /> {o.title}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4, lineHeight: 1.5, color: active ? 'var(--blue)' : 'var(--text-secondary)' }}>{o.caption}</div>
                </button>
              );
            })}
          </div>
        </Section>

        {/* Task basics */}
        <Section>
          <H3>Task basics</H3>
          <div className="field">
            <label>Title</label>
            <input value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="Customer churn report (sample data)" />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea rows={3} style={{ resize: 'none' }} value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="What the task involves and what data is provided." />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>What does "done" look like?</label>
            <textarea rows={2} style={{ resize: 'none' }} value={form.doneLooksLike} onChange={(e) => set({ doneLooksLike: e.target.value })} placeholder="The concrete deliverable a finalist hands in." />
          </div>
        </Section>

        {/* Field and skills */}
        <Section>
          <H3>Field and skills</H3>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 5 }}>Vertical</label>
              <select value={form.vertical} onChange={(e) => set({ vertical: e.target.value })}>
                {VERTICALS.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>
            <div style={{ flex: 2 }}>
              <label style={{ display: 'block', marginBottom: 5 }}>Required skills</label>
              <div
                onClick={() => skillRef.current?.focus()}
                style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', minHeight: 36, padding: '5px 10px', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius)', cursor: 'text' }}
              >
                {form.skills.map((s) => (
                  <Chip key={s} tone="blue">
                    {s}
                    <button className="link" onClick={(e) => { e.stopPropagation(); removeSkill(s); }} style={{ padding: 0, display: 'inline-flex' }} aria-label={`Remove ${s}`}>
                      <Icon name="x" size={12} color="var(--blue-800)" />
                    </button>
                  </Chip>
                ))}
                <input
                  ref={skillRef}
                  value={skillDraft}
                  onChange={(e) => setSkillDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addSkill(); }
                    else if (e.key === 'Backspace' && !skillDraft && form.skills.length) removeSkill(form.skills[form.skills.length - 1]);
                  }}
                  placeholder={form.skills.length ? 'Add more…' : 'Type a skill and press Enter'}
                  style={{ flex: 1, minWidth: 120, border: 'none', padding: 0, height: 24, boxShadow: 'none' }}
                />
              </div>
            </div>
          </div>
        </Section>

        {/* Motive */}
        <Section>
          <H3>Why are you posting this?</H3>
          <p className="muted" style={{ margin: '0 0 12px', fontSize: 12 }}>Affects suggested deadline lengths.</p>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { key: 'needs_now', icon: 'bolt', title: 'Needs it now', caption: 'Real work, short deadlines' },
              { key: 'scouting', icon: 'users', title: 'Scouting talent', caption: 'Evaluation, relaxed deadlines' },
            ].map((o) => {
              const on = form.motive === o.key;
              return (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => set({ motive: o.key })}
                  style={{ flex: 1, textAlign: 'left', height: 'auto', display: 'block', padding: '12px 14px', borderRadius: 12, border: on ? '2px solid var(--blue)' : '0.5px solid var(--border)', background: on ? 'var(--blue-50)' : 'var(--surface-0)' }}
                >
                  <div style={{ fontSize: 14, fontWeight: 500, color: on ? 'var(--blue-800)' : 'var(--text-primary)' }}>
                    <Icon name={o.icon} size={16} /> {o.title}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 3, color: on ? 'var(--blue)' : 'var(--text-secondary)' }}>{o.caption}</div>
                </button>
              );
            })}
          </div>
        </Section>

        {/* Data sensitivity — the one amber gate */}
        <Section>
          <H3>Data sensitivity</H3>
          <div style={{ border: '0.5px solid var(--amber)', background: 'var(--amber-50)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <Icon name="shield-check" size={20} color="var(--amber-700)" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--amber-900)', lineHeight: 1.6 }}>
                  Tasks must use sample or synthetic data — never real client records. This is required to publish.
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 13, color: 'var(--amber-900)', cursor: 'pointer' }}>
                  <span style={{ width: 18, height: 18, borderRadius: 5, background: form.sampleDataConfirmed ? 'var(--teal-700)' : 'var(--surface-0)', border: form.sampleDataConfirmed ? 'none' : '1.5px solid var(--border-strong)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {form.sampleDataConfirmed && <Icon name="check" size={13} color="#fff" />}
                  </span>
                  <input type="checkbox" checked={form.sampleDataConfirmed} onChange={(e) => set({ sampleDataConfirmed: e.target.checked })} style={{ display: 'none' }} />
                  I confirm this task uses sample data only, no real client data
                </label>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
            Students will see a <Chip tone="teal" icon="database">Sample data</Chip> tag on this task.
          </div>
        </Section>

        {/* Compensation */}
        <Section>
          <H3>Compensation</H3>
          <div className="col" style={{ gap: 8 }}>
            {[
              { key: 'credential', title: 'Credential only', caption: 'student earns reputation, badge and a portfolio piece' },
              { key: 'stipend', title: 'Add a stipend', caption: 'optional, raises visibility of your task' },
            ].map((o) => {
              const on = form.compensationType === o.key;
              return (
                <label key={o.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', border: on ? '2px solid var(--blue)' : '0.5px solid var(--border)', borderRadius: 8, background: on ? 'var(--blue-50)' : 'transparent', cursor: 'pointer' }}>
                  <span style={{ width: 16, height: 16, borderRadius: '50%', border: on ? '4px solid var(--blue)' : '1.5px solid var(--border-strong)', flexShrink: 0 }} />
                  <input type="radio" name="compensation" checked={on} onChange={() => set({ compensationType: o.key })} style={{ display: 'none' }} />
                  <span style={{ fontSize: 13, color: on ? 'var(--blue-800)' : 'var(--text-primary)' }}>
                    <span style={{ fontWeight: 500 }}>{o.title}</span> — {o.caption}
                  </span>
                </label>
              );
            })}
            {form.compensationType === 'stipend' && (
              <div className="field" style={{ marginBottom: 0, marginTop: 4, maxWidth: 240 }}>
                <label>Stipend amount (USD)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="secondary">$</span>
                  <input type="number" min={0} value={form.stipendAmount} onChange={(e) => set({ stipendAmount: e.target.value })} />
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* Applicant limits */}
        <Section>
          <H3>Applicant limits</H3>
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="field" style={{ flex: 1, marginBottom: 0 }}>
              <label>Max who can apply</label>
              <input type="number" min={1} value={form.appliedCap} onChange={(e) => set({ appliedCap: e.target.value })} />
            </div>
            <div className="field" style={{ flex: 1, marginBottom: 0 }}>
              <label>Max who reach screening</label>
              <input type="number" min={1} value={form.screeningCap} onChange={(e) => set({ screeningCap: e.target.value })} />
            </div>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
            <Icon name="info-circle" size={13} /> Screening fills by who <b>completes</b> first, not who clicks first. 2 slots are held for newcomers.
          </div>
        </Section>

        {/* Deadlines */}
        <Section>
          <H3>Deadlines</H3>
          <div>
            <Deadline n={1} label="Applications close" field="applyInDays" />
            <Deadline n={2} label="Screening due" field="screeningInDays" />
            <Deadline n={3} label="Task due" hint="finalists" field="taskInDays" />
            <Deadline n={4} label="You decide by" hint="commitment" field="decisionInDays" amber />
          </div>
        </Section>

        {/* Screening step */}
        <Section>
          <H3>Screening step</H3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 14px', border: '0.5px solid var(--border)', borderRadius: 8, background: 'var(--surface-1)' }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Using StepIn's standard <b style={{ color: 'var(--text-primary)' }}>{verticalLabel} screening template</b> · ~30 min
            </div>
            <button className="sm" onClick={() => setPreview(true)}>
              <Icon name="eye" size={14} /> Preview
            </button>
          </div>
        </Section>

        {/* Footer */}
        <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 18, display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="primary-blue" style={{ height: 40, padding: '0 20px' }} disabled={!canPublish || busy} onClick={() => submit(true)}>
            Publish task
          </button>
          <button className="ghost" style={{ height: 40, padding: '0 18px' }} disabled={busy} onClick={() => submit(false)}>
            Save draft
          </button>
          {canPublish && (
            <span style={{ fontSize: 12, color: 'var(--teal-700)', marginLeft: 'auto' }}>
              <Icon name="check" size={14} /> Ready to publish
            </span>
          )}
        </div>
      </div>

      <Modal open={preview} onClose={() => setPreview(false)} title={`${verticalLabel} screening template`}>
        <p className="secondary" style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 14 }}>
          This screening step is platform-provided and standardised across StepIn. Students complete it blind, in about 30 minutes.
        </p>
        <div className="col" style={{ gap: 10 }}>
          {(TEMPLATE_QUESTIONS[form.vertical] || []).map((q, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: 'var(--text-secondary)' }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--blue-50)', color: 'var(--blue-800)', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
              <span style={{ lineHeight: 1.5 }}>{q}</span>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
