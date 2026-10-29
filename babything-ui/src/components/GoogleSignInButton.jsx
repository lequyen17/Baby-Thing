import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { takeReturnTo } from '../pages/flowStorage';
import { Alert } from './Form';

const GSI_SRC = 'https://accounts.google.com/gsi/client';

let configPromise;
let scriptPromise;

// Client id lấy từ backend (GOOGLE_CLIENT_ID), chỉ hỏi một lần cho cả app.
// Lỗi (vd. api chưa khởi động xong) thì không cache, lần mở trang sau hỏi lại.
function loadConfig() {
  configPromise ??= api('/auth/google/config', { auth: false }).catch(() => {
    configPromise = undefined;
    return { enabled: false };
  });
  return configPromise;
}

function loadScript() {
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => {
      script.remove();
      scriptPromise = undefined;
      reject(new Error('Could not load Google sign-in'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/** Nút "Sign in with Google" (Google Identity Services). Ẩn hẳn nếu server chưa cấu hình. */
export default function GoogleSignInButton({ text = 'signin_with' }) {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const containerRef = useRef(null);
  const [clientId, setClientId] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 1. Lấy config + tải script của Google
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const config = await loadConfig();
      if (cancelled || !config.enabled) return;
      try {
        await loadScript();
        if (!cancelled) setClientId(config.clientId);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Vẽ nút: chạy sau khi render, lúc này div chứa nút chắc chắn đã có trong DOM
  useEffect(() => {
    const container = containerRef.current;
    if (!clientId || !container) return;
    let active = true;

    const handleCredential = async ({ credential }) => {
      setError('');
      setSubmitting(true);
      try {
        const tokens = await api('/auth/google', { method: 'POST', body: { credential }, auth: false });
        await signIn(tokens);
        navigate(takeReturnTo(), { replace: true });
      } catch (err) {
        if (active) {
          setError(err.message);
          setSubmitting(false);
        }
      }
    };

    window.google.accounts.id.initialize({ client_id: clientId, callback: handleCredential });
    window.google.accounts.id.renderButton(container, {
      theme: 'outline',
      size: 'large',
      text,
      width: Math.min(container.offsetWidth || 320, 400),
    });

    return () => {
      active = false;
      container.replaceChildren();
    };
  }, [clientId, navigate, signIn, text]);

  if (!clientId && !error) return null;

  return (
    <div className="google-signin">
      <div className="auth-divider">
        <span>or</span>
      </div>
      <Alert>{error}</Alert>
      {clientId && <div ref={containerRef} className="google-signin-button" aria-busy={submitting} />}
      {submitting && <p className="muted google-signin-status">Signing in with Google...</p>}
    </div>
  );
}
