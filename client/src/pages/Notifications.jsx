import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { Icon, Spinner, EmptyState, useToast } from '../components/ui.jsx';

const stripPrefix = (icon) => (icon || 'bell').replace(/^ti-/, '');

function shortDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function Notifications() {
  const navigate = useNavigate();
  const toast = useToast();
  const [items, setItems] = useState(null);

  useEffect(() => {
    api.get('/notifications')
      .then((d) => setItems(d.notifications))
      .catch((e) => toast.error(e.message));
    // Mark all read so the sidebar badge clears
    api.post('/notifications/read').catch(() => {});
  }, []);

  if (!items) return <div className="content"><Spinner /></div>;

  return (
    <div className="content" style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 20 }}>Notifications</h2>
        <p className="secondary" style={{ marginTop: 3 }}>Updates on your tasks, applications and agreements.</p>
      </div>

      {items.length === 0 && <EmptyState icon="bell" title="No notifications yet" />}

      <div className="col" style={{ gap: 8 }}>
        {items.map((n) => (
          <div
            key={n.id}
            onClick={() => n.link && navigate(n.link)}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '13px 15px',
              borderRadius: 10,
              border: '0.5px solid var(--border)',
              background: n.read ? 'var(--surface-0)' : 'var(--surface-2)',
              borderLeft: n.read ? '0.5px solid var(--border)' : '3px solid var(--amber)',
              cursor: n.link ? 'pointer' : 'default',
            }}
          >
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--surface-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name={stripPrefix(n.icon)} size={18} color="var(--text-secondary)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="spread" style={{ alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontWeight: 600, fontSize: 13.5 }}>{n.title}</span>
                <span className="muted" style={{ fontSize: 11.5, flexShrink: 0 }}>{shortDate(n.created_at)}</span>
              </div>
              {n.body && <p className="secondary" style={{ fontSize: 12.5, marginTop: 3, lineHeight: 1.5 }}>{n.body}</p>}
            </div>
            {!n.read && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--teal)', flexShrink: 0, marginTop: 6 }} />}
          </div>
        ))}
      </div>
    </div>
  );
}
