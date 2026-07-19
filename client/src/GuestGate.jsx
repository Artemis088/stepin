import { createContext, useContext, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Icon } from './components/ui.jsx';
import { useT } from './i18n.jsx';

/*
 * A shared "Sign up to continue" gate. Any guest-blocked action calls gate()
 * to pop a single modal offering sign up / log in.
 */
const GuestGateCtx = createContext(null);

export function GuestGateProvider({ children }) {
  const navigate = useNavigate();
  const { t } = useT();
  const [msg, setMsg] = useState(null); // null = closed

  const gate = useCallback((message) => setMsg(message || ''), []);
  const close = () => setMsg(null);
  const go = (to) => { close(); navigate(to); };

  return (
    <GuestGateCtx.Provider value={{ gate }}>
      {children}
      <Modal
        open={msg !== null}
        onClose={close}
        title={t('guest.gateTitle')}
        width={420}
        footer={
          <>
            <button className="ghost" onClick={() => go('/login')}>{t('common.login')}</button>
            <button className="primary-amber" onClick={() => go('/get-started')}>{t('guest.signUp')}</button>
          </>
        }
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Icon name="user-plus" size={22} color="var(--amber-700)" style={{ flexShrink: 0, marginTop: 2 }} />
          <p className="secondary" style={{ fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
            {msg || t('guest.gateBody')}
          </p>
        </div>
      </Modal>
    </GuestGateCtx.Provider>
  );
}

export function useGuestGate() {
  const ctx = useContext(GuestGateCtx);
  return ctx || { gate: () => {} };
}
