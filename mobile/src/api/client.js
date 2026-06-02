import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const TOKEN_KEY = 'wavy_token';

function getBaseUrl() {
  const fromExtra = Constants.expoConfig?.extra?.apiUrl;
  if (fromExtra) return fromExtra.replace(/\/$/, '');
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }
  return 'http://127.0.0.1:8000';
}

export async function saveToken(token) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function apiFetch(path, options = {}) {
  const token = await getToken();
  const headers = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers,
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${getBaseUrl()}${path}`, { ...options, headers });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { detail: text };
  }
  if (!res.ok) {
    let msg = res.statusText || 'Ошибка API';
    if (data?.detail) {
      if (Array.isArray(data.detail)) {
        msg = data.detail.map((d) => d.msg || JSON.stringify(d)).join(', ');
      } else if (typeof data.detail === 'string') {
        msg = data.detail;
      }
    }
    const err = new Error(msg);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

export { getBaseUrl };
