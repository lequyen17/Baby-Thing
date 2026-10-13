import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, SESSION_EXPIRED_EVENT, tokenStore, tryRestoreSession } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    const me = await api('/users/me');
    setUser(me);
    return me;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const restored = await tryRestoreSession();
        if (!restored) return;
        await loadProfile();
      } catch {
        tokenStore.clear();
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadProfile]);

  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  /** Gọi sau khi nhận access token (verify OTP, đổi mật khẩu); refresh đã set qua cookie. */
  const signIn = useCallback(
    async (tokens) => {
      tokenStore.set(tokens);
      return loadProfile();
    },
    [loadProfile],
  );

  const signOut = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      // Dù server lỗi vẫn xoá phiên phía client
    }
    tokenStore.clear();
    setUser(null);
  }, []);

  const refreshProfile = loadProfile;

  const value = useMemo(
    () => ({ user, loading, signIn, signOut, refreshProfile, setUser }),
    [user, loading, signIn, signOut, refreshProfile],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
