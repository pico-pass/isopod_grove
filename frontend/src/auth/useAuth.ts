import { useCallback, useEffect, useState } from 'react';
import { api, type AuthUser } from '../api/client';
import { authStorage } from './authStorage';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(() => {
    const hasCallbackToken = new URLSearchParams(window.location.search).has('token');
    return hasCallbackToken || Boolean(authStorage.getToken());
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      authStorage.setToken(token);
      params.delete('token');
      const query = params.toString();
      const next = window.location.pathname + (query ? `?${query}` : '');
      window.history.replaceState(null, '', next);
    }

    if (!authStorage.getToken()) {
      return;
    }

    api
      .me()
      .then(setUser)
      .catch(() => {
        authStorage.clearToken();
      })
      .finally(() => setLoading(false));
  }, []);

  const logout = useCallback(() => {
    authStorage.clearToken();
    setUser(null);
  }, []);

  return { user, loading, logout };
}
