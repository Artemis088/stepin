import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { Icon, Chip, Avatar, Modal, Spinner, EmptyState, useToast } from '../../components/ui.jsx';

export default function Shortlist() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState(null); // deliverable being read in a modal

  const load = () =>
    api.get(`/company/tasks/${id}/shortlist`).then(setData).catch((e) => toast.error(e.message));

  useEffect(() => {
    load();
  }, [id]);

  if (!data) return <div className="content"><Spinner /></div>;
  const { task, decisionCountdown: dc, finalists, decided } = data;

  const select = async (applicationId) => {
    setBusy(true);
    try {
      const res = await api.post(`/company/tasks/${id}/select`, { applicationId });
      toast.success('Selected — sign the IP assignment');
      navigate(`/company/agreement/${res.agreementId}`);
    } catch (err) {
      toast.error(err.message);
      setBusy(false);
    }
  };

  const passAll = async () => {
    setBusy(true);
    try {
      await api.post(`/company/tasks/${id}/pass`);
      toast.success('Passed on all finalists');
      load();
      setBusy(false);
    } catch (err) {
      toast.error(err.message);
      setBusy(false);
    }
  };

  const openDeliverable = (d) => {
    if (d.link) window.open(d.link, '_blank', 'noopener');
    else setViewing(d);
  };

  const winner = finalists.find((f) => f.stage === 'won');

  return (
    <div className="content" style={{ maxWidth: 760 }}>
      <button
        className="link"
        onClick={() => navigate(`/company/tasks/${id}`)}
        style={{ marginBottom: 16, color: 'var(--text-muted)', fontSize: 12.5 }}
      >
        <Icon name="arrow-left" size={14} /> Back to funnel
      </button>

      {/* Header */}
      <div className="spread" style={{ alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Shortlist · {task.title}</div>
          <h2 style={{ fontSize: 22 }}>Review finalists</h2>
        </div>
        {dc && (
          <Chip tone="amber" icon={dc.overdue ? 'alert-triangle' : 'clock'}>
            {dc.overdue ? 'Decision overdue' : `Decide within ${dc.days}d`}
          </Chip>
        )}
      </div>

      <p className="secondary" style={{ fontSize: 13, marginBottom: 20 }}>
        {finalists.length} finalist{finalists.length === 1 ? '' : 's'} — judge the work first — reputation is shown only as context.
      </p>

      {/* Decided banner */}
      {decided && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            background: winner ? 'var(--teal-50)' : 'var(--surface-1)',
            borderRadius: 10,
            marginBottom: 20,
          }}
        >
          <Icon name={winner ? 'trophy' : 'mood-neutral'} size={18} color={winner ? 'var(--teal-700)' : 'var(--text-muted)'} />
          <span style={{ fontSize: 13, color: winner ? 'var(--teal-900)' : 'var(--text-secondary)' }}>
            {winner ? <><b>{winner.name}</b> was selected for this task. </> : 'You passed on all finalists. '}
            <button className="link" style={{ fontSize: 13 }} onClick={() => navigate(`/company/rate/${id}`)}>
              Rate finalists
            </button>
          </span>
        </div>
      )}

      {finalists.length === 0 ? (
        <EmptyState icon="users" title="No finalists yet">
          <span className="secondary">Build the shortlist from the funnel to move candidates here.</span>
        </EmptyState>
      ) : (
        <div className="col" style={{ gap: 16 }}>
          {finalists.map((f) => {
            const c = f.context || {};
            return (
              <div key={f.applicationId} className="card" style={{ padding: 16 }}>
                {/* Top: student + newcomer chip */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <Avatar initials={f.initials} role="student" size={34} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{f.name}</div>
                  </div>
                  {f.newcomerSlot && <Chip tone="teal">Newcomer slot</Chip>}
                  {f.stage === 'won' && <Chip tone="teal" icon="trophy">Selected</Chip>}
                </div>

                {/* Hero: the deliverable */}
                {f.deliverable ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '12px 14px',
                      border: '0.5px solid var(--border-strong)',
                      borderRadius: 8,
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <Icon name="file-description" size={22} color="var(--blue)" />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{f.deliverable.name}</div>
                        {f.deliverable.summary && (
                          <div className="secondary" style={{ fontSize: 12 }}>{f.deliverable.summary}</div>
                        )}
                      </div>
                    </div>
                    <button className="sm" onClick={() => openDeliverable(f.deliverable)}>
                      <Icon name="eye" size={14} /> Open
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '12px 14px',
                      border: '0.5px dashed var(--border-strong)',
                      borderRadius: 8,
                      marginBottom: 10,
                      fontSize: 13,
                    }}
                    className="muted"
                  >
                    Not submitted yet
                  </div>
                )}

                {/* Live defense */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 12 }}>
                  <Icon name="microphone" size={15} color="var(--blue)" />
                  {f.defense?.link ? (
                    <span className="secondary">
                      Live defense ·{' '}
                      <a href={f.defense.link} target="_blank" rel="noopener noreferrer">
                        watch{f.defense.minutes ? ` (${f.defense.minutes} min)` : ''}
                      </a>
                    </span>
                  ) : (
                    <span className="muted">No defense yet</span>
                  )}
                </div>

                {/* Reputation as smallest, greyest context line + Select */}
                <div className="spread" style={{ paddingTop: 10, borderTop: '0.5px solid var(--border)' }}>
                  <span className="muted" style={{ fontSize: 11 }}>
                    {c.newcomer ? (
                      <>Context · new to StepIn · no history yet</>
                    ) : (
                      <>
                        Context · {c.reputation ?? 0} rep ·{' '}
                        <Icon name="star" size={12} color="var(--amber)" style={{ verticalAlign: -1 }} />
                        {c.rating != null ? c.rating : '—'} · {c.tasks ?? 0} tasks
                      </>
                    )}
                  </span>
                  {!decided && (
                    <button
                      className="primary-blue"
                      style={{ height: 36, padding: '0 18px' }}
                      onClick={() => select(f.applicationId)}
                      disabled={busy}
                    >
                      Select
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pass on all */}
      {!decided && finalists.length > 0 && (
        <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 14, marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="ghost" onClick={passAll} disabled={busy}>
            Pass on all
          </button>
          <span className="muted" style={{ fontSize: 12 }}>Passing still counts toward your decision deadline.</span>
        </div>
      )}

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.name}>
        {viewing?.summary && <p className="secondary" style={{ fontSize: 13, marginBottom: 12 }}>{viewing.summary}</p>}
        <div style={{ fontSize: 13.5, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>
          {viewing?.text || <span className="muted">No inline content for this deliverable.</span>}
        </div>
      </Modal>
    </div>
  );
}
