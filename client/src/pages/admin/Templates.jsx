import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Icon, Chip, Modal, Spinner, EmptyState, useToast } from '../../components/ui.jsx';

const genId = () => 'q_' + Math.random().toString(36).slice(2, 9);

function typeChip(type) {
  if (type === 'reasoning') return <Chip tone="amber" icon="eye">reasoning · reviewed by company</Chip>;
  return <Chip tone="teal" icon="circle-check">{type} · auto-checked</Chip>;
}

// question object -> editor row
const toEditor = (q) => ({
  id: q.id || genId(),
  type: q.type || 'mcq',
  prompt: q.prompt || '',
  optionsText: (q.options || []).join('\n'),
  answer: q.answer != null ? String(q.answer) : '',
  unit: q.unit || '',
  tolerance: q.tolerance != null ? String(q.tolerance) : '',
  maxChars: q.maxChars != null ? String(q.maxChars) : '',
});

// editor row -> question object for the API
function fromEditor(e) {
  const q = { id: e.id, type: e.type, prompt: e.prompt.trim() };
  if (e.type === 'mcq') {
    q.options = e.optionsText.split(/[\n,]/).map((o) => o.trim()).filter(Boolean);
    if (e.answer.trim()) q.answer = e.answer.trim();
  } else if (e.type === 'numeric') {
    if (e.answer.trim() !== '') q.answer = Number(e.answer);
    if (e.tolerance.trim() !== '') q.tolerance = Number(e.tolerance);
    if (e.unit.trim()) q.unit = e.unit.trim();
  } else if (e.type === 'reasoning') {
    if (e.maxChars.trim() !== '') q.maxChars = Number(e.maxChars);
  }
  return q;
}

export default function Templates() {
  const toast = useToast();
  const [templates, setTemplates] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [editor, setEditor] = useState(null); // { id|null, vertical, name, estMinutes, questions:[editorRow] }
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/admin/templates').then((d) => setTemplates(d.templates)).catch((e) => toast.error(e.message));
  useEffect(() => { load(); }, []);

  const openNew = () => setEditor({ id: null, vertical: 'data', name: '', estMinutes: 30, questions: [] });
  const openEdit = (t) => setEditor({
    id: t.id, vertical: t.vertical, name: t.name, estMinutes: t.estMinutes,
    questions: (t.questions || []).map(toEditor),
  });

  const setQ = (idx, patch) => setEditor((s) => ({
    ...s,
    questions: s.questions.map((q, i) => (i === idx ? { ...q, ...patch } : q)),
  }));
  const addQ = () => setEditor((s) => ({ ...s, questions: [...s.questions, toEditor({})] }));
  const removeQ = (idx) => setEditor((s) => ({ ...s, questions: s.questions.filter((_, i) => i !== idx) }));

  const save = async () => {
    if (!editor.name.trim()) return toast.error('Name is required');
    setBusy(true);
    const questions = editor.questions.map(fromEditor);
    try {
      if (editor.id) {
        await api.patch(`/admin/templates/${editor.id}`, { name: editor.name.trim(), estMinutes: Number(editor.estMinutes), questions });
        toast.success('Template updated');
      } else {
        await api.post('/admin/templates', { vertical: editor.vertical, name: editor.name.trim(), estMinutes: Number(editor.estMinutes), questions });
        toast.success('Template created');
      }
      setEditor(null);
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!templates) return <div className="content"><Spinner /></div>;

  const byVertical = templates.reduce((acc, t) => {
    (acc[t.vertical] = acc[t.vertical] || []).push(t);
    return acc;
  }, {});

  return (
    <div className="content">
      <div className="spread" style={{ alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <h2 style={{ fontSize: 20 }}>Screening templates</h2>
          <p className="secondary" style={{ marginTop: 3 }}>Standard screening questions per vertical. mcq / numeric are auto-checked; reasoning is reviewed by the company.</p>
        </div>
        <button className="primary-teal" onClick={openNew}><Icon name="plus" size={15} /> New template</button>
      </div>

      {templates.length === 0 ? (
        <EmptyState icon="forms" title="No templates yet">Create one to standardise screening for a vertical.</EmptyState>
      ) : (
        Object.entries(byVertical).map(([vertical, list]) => (
          <div key={vertical} style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text-muted)', marginBottom: 10 }}>{vertical}</h3>
            <div className="col" style={{ gap: 12 }}>
              {list.map((t) => {
                const open = !!expanded[t.id];
                return (
                  <div key={t.id} className="card">
                    <div className="spread" style={{ alignItems: 'center' }}>
                      <button className="link" onClick={() => setExpanded((s) => ({ ...s, [t.id]: !open }))} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
                        <Icon name={open ? 'chevron-down' : 'chevron-right'} size={16} color="var(--text-muted)" />
                        <span style={{ fontSize: 15, fontWeight: 600 }}>{t.name}</span>
                      </button>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Chip tone="neutral" icon="clock">~{t.estMinutes} min</Chip>
                        <Chip tone="neutral">{(t.questions || []).length} questions</Chip>
                        <button className="ghost sm" onClick={() => openEdit(t)}><Icon name="edit" size={14} /> Edit</button>
                      </div>
                    </div>

                    {open && (
                      <div className="col" style={{ gap: 12, marginTop: 14, borderTop: '0.5px solid var(--border)', paddingTop: 14 }}>
                        {(t.questions || []).map((q, i) => (
                          <div key={q.id || i} style={{ border: '0.5px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <span className="muted" style={{ fontSize: 12 }}>Q{i + 1}</span>
                              {typeChip(q.type)}
                            </div>
                            <p style={{ fontSize: 13.5, marginBottom: q.type === 'mcq' || q.type === 'numeric' ? 10 : 0 }}>{q.prompt}</p>

                            {q.type === 'mcq' && (
                              <div className="col" style={{ gap: 6 }}>
                                {(q.options || []).map((opt) => {
                                  const correct = opt === q.answer;
                                  return (
                                    <div key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: correct ? 'var(--teal-900)' : 'var(--text-secondary)' }}>
                                      <Icon name={correct ? 'circle-check-filled' : 'circle'} size={15} color={correct ? 'var(--teal-700)' : 'var(--border-strong)'} />
                                      {opt}{correct && <span className="muted" style={{ fontSize: 11 }}>(answer)</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {q.type === 'numeric' && (
                              <div className="secondary" style={{ fontSize: 13 }}>
                                Answer key: <b>{q.answer}</b>{q.unit ? ` ${q.unit}` : ''}
                                {q.tolerance != null && <span className="muted"> · tolerance ±{q.tolerance}</span>}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      <Modal
        open={!!editor}
        onClose={() => setEditor(null)}
        title={editor?.id ? 'Edit template' : 'New template'}
        width={640}
        footer={
          <>
            <button className="ghost" onClick={() => setEditor(null)}>Cancel</button>
            <button className="primary-teal" onClick={save} disabled={busy}>Save template</button>
          </>
        }
      >
        {editor && (
          <>
            <div className="grid-2" style={{ marginBottom: 4 }}>
              {!editor.id && (
                <div className="field">
                  <label>Vertical</label>
                  <select value={editor.vertical} onChange={(e) => setEditor((s) => ({ ...s, vertical: e.target.value }))}>
                    <option value="data">data</option>
                    <option value="software">software</option>
                    <option value="design">design</option>
                  </select>
                </div>
              )}
              <div className="field">
                <label>Estimated minutes</label>
                <input type="number" min={1} value={editor.estMinutes} onChange={(e) => setEditor((s) => ({ ...s, estMinutes: e.target.value }))} />
              </div>
            </div>
            <div className="field">
              <label>Name</label>
              <input value={editor.name} onChange={(e) => setEditor((s) => ({ ...s, name: e.target.value }))} placeholder="e.g. Data analyst screening" />
            </div>

            <div className="spread" style={{ margin: '10px 0 8px' }}>
              <span style={{ fontWeight: 600, fontSize: 13.5 }}>Questions</span>
              <button className="ghost sm" onClick={addQ}><Icon name="plus" size={14} /> Add question</button>
            </div>

            <div className="col" style={{ gap: 12 }}>
              {editor.questions.length === 0 && <p className="muted" style={{ fontSize: 12.5 }}>No questions yet.</p>}
              {editor.questions.map((q, i) => (
                <div key={q.id} style={{ border: '0.5px solid var(--border)', borderRadius: 10, padding: 12 }}>
                  <div className="spread" style={{ marginBottom: 8 }}>
                    <select value={q.type} onChange={(e) => setQ(i, { type: e.target.value })} style={{ width: 'auto' }}>
                      <option value="mcq">mcq</option>
                      <option value="numeric">numeric</option>
                      <option value="reasoning">reasoning</option>
                    </select>
                    <button className="link" onClick={() => removeQ(i)} style={{ color: 'var(--bad)' }}><Icon name="trash" size={15} /> Remove</button>
                  </div>
                  <div className="field">
                    <label>Prompt</label>
                    <textarea rows={2} value={q.prompt} onChange={(e) => setQ(i, { prompt: e.target.value })} style={{ resize: 'none' }} />
                  </div>

                  {q.type === 'mcq' && (
                    <>
                      <div className="field">
                        <label>Options (one per line or comma-separated)</label>
                        <textarea rows={3} value={q.optionsText} onChange={(e) => setQ(i, { optionsText: e.target.value })} style={{ resize: 'none' }} />
                      </div>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label>Correct answer (must match an option)</label>
                        <input value={q.answer} onChange={(e) => setQ(i, { answer: e.target.value })} />
                      </div>
                    </>
                  )}

                  {q.type === 'numeric' && (
                    <div className="grid-3" style={{ marginBottom: 0 }}>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label>Answer key</label>
                        <input value={q.answer} onChange={(e) => setQ(i, { answer: e.target.value })} />
                      </div>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label>Tolerance ±</label>
                        <input value={q.tolerance} onChange={(e) => setQ(i, { tolerance: e.target.value })} />
                      </div>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label>Unit</label>
                        <input value={q.unit} onChange={(e) => setQ(i, { unit: e.target.value })} />
                      </div>
                    </div>
                  )}

                  {q.type === 'reasoning' && (
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label>Max characters</label>
                      <input value={q.maxChars} onChange={(e) => setQ(i, { maxChars: e.target.value })} placeholder="400" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
