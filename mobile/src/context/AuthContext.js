import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiFetch, clearToken, getToken, saveToken } from '../api/client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async (t) => {
    const me = await apiFetch('/users/me', {
      headers: { Authorization: `Bearer ${t}` },
    });
    setUser(me);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const t = await getToken();
        if (t) {
          setTokenState(t);
          await loadMe(t);
        }
      } catch {
        await clearToken();
        setTokenState(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadMe]);

  const login = async (email, password) => {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await saveToken(res.access_token);
    setTokenState(res.access_token);
    await loadMe(res.access_token);
  };

  const register = async (email, password, full_name, role = 'private_person') => {
    const res = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name, role }),
    });
    await saveToken(res.access_token);
    setTokenState(res.access_token);
    await loadMe(res.access_token);
  };

  const logout = async () => {
    await clearToken();
    setTokenState(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const t = await getToken();
    if (t) await loadMe(t);
  };

  const registerPush = async () => {
    const t = await getToken();
    if (!t) return;
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    let expoPushToken = null;
    try {
      const res = await Notifications.getExpoPushTokenAsync();
      expoPushToken = res.data;
    } catch {
      return;
    }
    if (!expoPushToken) return;
    await apiFetch('/users/me/push-token', {
      method: 'POST',
      body: JSON.stringify({ expo_push_token: expoPushToken }),
    });
    await refreshUser();
  };

  useEffect(() => {
    if (token && user && Platform.OS !== 'web') {
      registerPush().catch(() => {});
    }
  }, [token, user?.id]);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isPremium: user?.subscription_tier === 'premium',
      login,
      register,
      logout,
      refreshUser,
      registerPush,
    }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth вне AuthProvider');
  return ctx;
}
