import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api.js';
import { Icon, Chip, Spinner, useToast } from '../components/ui.jsx';

function PartyRow({ label, name, signed, role }) {
  return (
    <div className="spread" style={{ padding: '11px 0', borderBottom: '0.5px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name={role === 'company' ? 'building' : 'user'} size={15} color={role === 'company' ? 'var(--blue)' : 'var(--amber-600)'} />
        <span style={{ fontSize: 13 }}><span className="muted">{label}:</span> {name}</span>
      </div>
      {signed
        ? <Chip tone="teal" icon="check">Signed</Chip>
        : <span className="muted" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="clock" size={13} /> Pending</span>}
    </div>
  );
}

export default function Agreement() {
  const { id } = useParams();
  const toast = useToast();
  const [ag, setAg] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.get(`/agreements/${id}`).then((d) => setAg(d.agreement)).catch((e) => toast.error(e.message));
  useEffect(() => { load(); }, [id]);

  if (!ag) return <div className="content"><Spinner /></div>;

  const isStudent = ag.myRole === 'student';
  const mineSigned = isStudent ? ag.studentSigned : ag.companySigned;

  const sign = async () => {
    setBusy(true);
    try {
      const res = await api.post(`/agreements/${id}/sign`);
      toast.success(res.complete ? 'Signed — the agreement is now complete.' : 'Signed. Waiting on the other party.');
      load();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="content" style={{ maxWidth: 640 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Icon name="file-description" size={22} color="var(--text-secondary)" />
        <h2 style={{ fontSize: 20 }}>IP assignment</h2>
      </div>

      {ag.complete && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 15px', background: 'var(--teal-50)', borderRadius: 10, marginBottom: 18 }}>
          <Icon name="circle-check" size={20} color="var(--teal-700)" />
          <span style={{ fontSize: 13.5, color: 'var(--teal-900)', fontWeight: 500 }}>Ownership transfers per the contract.</span>
        </div>
      )}

      <div className="card" style={{ background: 'var(--surface-0)', padding: 22 }}>
        <div style={{ borderBottom: '0.5px solid var(--border)', paddingBottom: 14, marginBottom: 4 }}>
          <div className="muted" style={{ fontSize: 12 }}>Task</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>{ag.taskTitle}</div>
        </div>

        <PartyRow label="Student" name={ag.studentName} signed={ag.studentSigned} role="student" />
        <PartyRow label="Company" name={ag.companyName} signed={ag.companySigned} role="company" />

        <div style={{ marginTop: 18 }}>
          <h3 style={{ fontSize: 14, marginBottom: 6 }}>Terms</h3>
          <p className="secondary" style={{ fontSize: 13, lineHeight: 1.7 }}>{ag.terms}</p>
        </div>

        {ag.portfolioCarveout && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: 'var(--teal-50)', borderRadius: 10, marginTop: 16 }}>
            <Icon name="briefcase" size={18} color="var(--teal-700)" />
            <span style={{ fontSize: 13, color: 'var(--teal-900)', lineHeight: 1.5 }}>
              <b>Portfolio carve-out:</b> the student keeps the right to show this work in their portfolio, always.
            </span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
          <Icon name="coin" size={17} color="var(--amber-600)" />
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {ag.paymentAmount > 0 ? <>Payment: <b style={{ color: 'var(--text-primary)' }}>${ag.paymentAmount}</b></> : 'No payment on this task.'}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 20 }}>
        <button
          className={isStudent ? 'primary-amber' : 'primary-blue'}
          style={{ height: 42, padding: '0 22px' }}
          onClick={sign}
          disabled={busy || mineSigned}
        >
          {mineSigned ? 'You signed' : 'Sign agreement'}
        </button>
        {!mineSigned && <span className="muted" style={{ fontSize: 12 }}>Signing is binding once both parties sign.</span>}
      </div>
    </div>
  );
}
