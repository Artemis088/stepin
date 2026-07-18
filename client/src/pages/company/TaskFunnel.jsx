import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { Icon, Chip, Spinner, StarPicker, useToast } from '../../components/ui.jsx';

// The funnel a company walks a single task through.
const STAGES = [
  { key: 'live', label: 'Live', match: (s) => s === 'live' || s === 'draft' },
  { key: 'screening', label: 'Screening', match: (s) => s === 'screening' },
  { key: 'shortlist', label: 'Shortlist ready', match: (s) => s === 'finalists_working' },
  { key: 'finalists', label: 'Finalists working', match: (s) => s === 'finalists_working' },
  { key: 'decision', label: 'Decision', match: (s) => s === 'decided' },
];

// Applications live in one of these stages; roll them up under the strip's buckets.
const STAGE_BUCKET = {
  applied: 'live',
  interested: 'live',
  screening_submitted: 'screening',
  shortlisted: 'shortlist',
  doing_task: 'finalists',
  live_defense: 'finalists',
  awaiting_decision: 'finalists',
  won: 'decision',
  lost: 'decision',
};

export default function TaskFunnel() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [reviews, setReviews] = useState({}); // appId -> { stars, note, saved, busy }
  const [building, setBuilding] = useState(false);

  const load = () =>
    api
      .get(`/company/tasks/${id}`)
      .then((d) => {
        setData(d);
        const seed = {};
        for (const p of d.pendingReview) {
          seed[p.applicationId] = {
            stars: p.reasoningScore != null ? Math.round(p.reasoningScore * 5) : 0,
            note: '',
            saved: p.reasoningScore != null,
            busy: false,
          };
        }
        setReviews(seed);
      })
      .catch((e) => toast.error(e.message));

  useEffect(() => {
    load();
  }, [id]);

  if (!data) return <div className="content"><Spinner /></div>;

  const { task, stageCounts, pendingReview, canBuildShortlist } = data;
  const bucketCount = (bucketKey) =>
    Object.entries(stageCounts || {}).reduce(
      (n, [stage, c]) => (STAGE_BUCKET[stage] === bucketKey ? n + c : n),
      0
    );

  const currentIdx = STAGES.findIndex((s) => s.match(task.status));
  const isDone = task.status === 'finalists_working' || task.status === 'decided';

  const setReview = (appId, patch) =>
    setReviews((r) => ({ ...r, [appId]: { ...r[appId], ...patch } }));

  const submitReview = async (appId) => {
    const r = reviews[appId] || {};
    if (!r.stars) {
      toast.error('Pick a star score for the reasoning first.');
      return;
    }
    setReview(appId, { busy: true });
    try {
      await api.post(`/company/applications/${appId}/review`, {
        reasoningScore: r.stars / 5,
        note: r.note || '',
      });
      setReview(appId, { busy: false, saved: true });
      toast.success('Reasoning score saved');
    } catch (err) {
      setReview(appId, { busy: false });
      toast.error(err.message);
    }
  };

  const buildShortlist = async () => {
    setBuilding(true);
    try {
      await api.post(`/company/tasks/${id}/shortlist`);
      toast.success('Shortlist built — merit and newcomer slots applied');
      navigate(`/company/shortlist/${id}`);
    } catch (err) {
      toast.error(err.message);
      setBuilding(false);
    }
  };

  return (
    <div className="content" style={{ maxWidth: 860 }}>
      <button
        className="link"
        onClick={() => navigate('/company/tasks')}
        style={{ marginBottom: 16, color: 'var(--text-muted)', fontSize: 12.5 }}
      >
        <Icon name="arrow-left" size={14} /> Back to my tasks
      </button>

      {/* Header */}
      <div className="spread" style={{ alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Task funnel</div>
          <h2 style={{ fontSize: 22 }}>{task.title}</h2>
        </div>
        <Chip tone="blue">{task.status.replace(/_/g, ' ')}</Chip>
      </div>

      {/* Stage strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          gap: 8,
          marginBottom: 26,
          overflowX: 'auto',
        }}
      >
        {STAGES.map((s, i) => {
          const active = i === currentIdx;
          const past = currentIdx > -1 && i < currentIdx;
          return (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 130 }}>
              <div
                style={{
                  flex: 1,
                  border: `0.5px solid ${active ? 'var(--blue)' : 'var(--border)'}`,
                  background: active ? 'var(--blue-50)' : past ? 'var(--surface-1)' : 'var(--surface-2)',
                  borderRadius: 10,
                  padding: '10px 12px',
                }}
              >
                <div
                  style={{
                    fontSize: 11.5,
                    color: active ? 'var(--blue-800)' : 'var(--text-secondary)',
                    marginBottom: 3,
                  }}
                >
                  {s.label}
                </div>
                <div style={{ fontSize: 18, fontWeight: 600, color: active ? 'var(--blue-800)' : 'var(--text-primary)' }}>
                  {bucketCount(s.key)}
                </div>
              </div>
              {i < STAGES.length - 1 && <Icon name="chevron-right" size={14} color="var(--text-muted)" />}
            </div>
          );
        })}
      </div>

      {/* Already past screening */}
      {isDone && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            background: 'var(--blue-50)',
            borderRadius: 10,
            marginBottom: 22,
          }}
        >
          <Icon name="info-circle" size={18} color="var(--blue-800)" />
          <span style={{ fontSize: 13, color: 'var(--blue-800)' }}>
            {task.status === 'decided'
              ? 'This task is decided.'
              : 'The shortlist is built and finalists are working.'}{' '}
            <button
              className="link"
              onClick={() => navigate(`/company/shortlist/${id}`)}
              style={{ fontSize: 13 }}
            >
              Review finalists
            </button>
          </span>
        </div>
      )}

      {/* Blind review */}
      {!isDone && (
        <>
          <h3 style={{ fontSize: 15, marginBottom: 10 }}>Blind review</h3>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '11px 14px',
              background: 'var(--teal-50)',
              borderRadius: 10,
              marginBottom: 16,
            }}
          >
            <Icon name="eye-off" size={18} color="var(--teal-700)" />
            <span style={{ fontSize: 13, color: 'var(--teal-900)', lineHeight: 1.5 }}>
              Reviewed <b>blind</b> — you see the work and a blind label, not the person or their history.
            </span>
          </div>

          {pendingReview.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 28, marginBottom: 22 }}>
              <Icon name="inbox" size={26} color="var(--text-muted)" />
              <div className="secondary" style={{ marginTop: 8, fontSize: 13 }}>
                No screenings are waiting for your reasoning review yet.
              </div>
            </div>
          ) : (
            <div className="col" style={{ gap: 14, marginBottom: 24 }}>
              {pendingReview.map((p) => {
                const r = reviews[p.applicationId] || { stars: 0, note: '', saved: false };
                return (
                  <div
                    key={p.applicationId}
                    style={{ border: '0.5px solid var(--border)', borderRadius: 12, padding: '16px 18px', background: 'var(--surface-2)' }}
                  >
                    <div className="spread" style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Icon name="user-question" size={18} color="var(--text-muted)" />
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{p.blindLabel}</span>
                      </div>
                      <Chip tone="teal">auto {Math.round((p.autoScore ?? 0) * 100)}%</Chip>
                    </div>

                    <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Reasoning prompt</div>
                    <p style={{ fontSize: 13.5, marginBottom: 12, lineHeight: 1.6 }}>{p.reasoningPrompt || '—'}</p>

                    <div
                      style={{
                        borderLeft: '3px solid var(--border-strong)',
                        background: 'var(--surface-1)',
                        borderRadius: '0 8px 8px 0',
                        padding: '12px 14px',
                        fontSize: 13.5,
                        color: 'var(--text-secondary)',
                        lineHeight: 1.6,
                        marginBottom: 16,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {p.reasoningAnswer || <span className="muted">No answer provided.</span>}
                    </div>

                    {r.saved ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--teal-700)' }}>
                        <Icon name="circle-check" size={16} color="var(--teal-700)" />
                        Reasoning scored {r.stars}/5 — saved
                        <button className="link sm" style={{ marginLeft: 6, fontSize: 12 }} onClick={() => setReview(p.applicationId, { saved: false })}>
                          Re-score
                        </button>
                      </div>
                    ) : (
                      <div className="col" style={{ gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span className="secondary" style={{ fontSize: 12.5 }}>Score the reasoning</span>
                          <StarPicker value={r.stars} onChange={(n) => setReview(p.applicationId, { stars: n })} />
                        </div>
                        <textarea
                          rows={2}
                          value={r.note}
                          onChange={(e) => setReview(p.applicationId, { note: e.target.value })}
                          placeholder="Optional note (private to you)"
                          style={{ resize: 'none' }}
                        />
                        <div>
                          <button className="primary-blue sm" onClick={() => submitReview(p.applicationId)} disabled={r.busy}>
                            Save score
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Build shortlist */}
          <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 18 }}>
            <button
              className="primary-blue"
              style={{ height: 44, padding: '0 22px' }}
              onClick={buildShortlist}
              disabled={!canBuildShortlist || building}
            >
              <Icon name="list-check" size={16} /> Build shortlist
            </button>
            <div className="muted" style={{ fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>
              Applies merit slots + reserved newcomer slots automatically, then moves the top candidates into the full task.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
