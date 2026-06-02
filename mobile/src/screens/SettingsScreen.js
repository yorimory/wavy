import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import Constants from 'expo-constants';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getBaseUrl } from '../api/client';
import { colors, radius, spacing } from '../theme';

export function SettingsScreen() {
  const { user, logout, refreshUser, registerPush } = useAuth();
  const [modText, setModText] = useState('Спасибо за визит!');

  const devPremium = async () => {
    try {
      await apiFetch('/users/me/dev-set-tier?tier=premium', { method: 'POST' });
      await refreshUser();
      Alert.alert('Тариф', 'Включён Premium (режим разработки).');
    } catch (e) {
      Alert.alert('Тариф', e.message || 'Эндпоинт доступен только при DEV_MODE на сервере.');
    }
  };

  const devFree = async () => {
    try {
      await apiFetch('/users/me/dev-set-tier?tier=free', { method: 'POST' });
      await refreshUser();
      Alert.alert('Тариф', 'Включён Free.');
    } catch (e) {
      Alert.alert('Тариф', e.message);
    }
  };

  const runModeration = async () => {
    try {
      const res = await apiFetch('/moderation/check', {
        method: 'POST',
        body: JSON.stringify({ text: modText, source: 'review' }),
      });
      Alert.alert('Модерация', `Вердикт: ${res.verdict}\n${(res.flags || []).join(', ')}`);
    } catch (e) {
      Alert.alert('Модерация', e.message);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.inner}>
      <Text style={styles.title}>Профиль</Text>
      <Text style={styles.row}>{user?.email}</Text>
      <Text style={styles.row}>Тариф: {user?.subscription_tier}</Text>
      <Text style={styles.muted}>API: {getBaseUrl()}</Text>
      <Text style={styles.muted}>Задаётся в app.json → extra.apiUrl или EXPO_PUBLIC_API_URL</Text>

      <TouchableOpacity style={styles.btnGhost} onPress={() => registerPush().catch(() => {})}>
        <Text>Запросить push-токен снова</Text>
      </TouchableOpacity>

      <Text style={styles.section}>Проверка модерации (Premium)</Text>
      <TextInput style={styles.input} value={modText} onChangeText={setModText} multiline />
      <TouchableOpacity style={styles.btn} onPress={runModeration}>
        <Text style={styles.btnText}>Проверить текст</Text>
      </TouchableOpacity>

      <Text style={styles.section}>Режим разработки</Text>
      <TouchableOpacity style={styles.btn} onPress={devPremium}>
        <Text style={styles.btnText}>Переключить на Premium (DEV)</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={devFree}>
        <Text style={[styles.btnText, styles.btnOutlineText]}>Переключить на Free (DEV)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logout} onPress={logout}>
        <Text style={styles.logoutText}>Выйти</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  inner: { padding: spacing.md, paddingTop: 48, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '800', color: colors.primary },
  row: { marginTop: spacing.sm, fontSize: 16, color: colors.onSurface },
  muted: { marginTop: spacing.sm, color: colors.onSurfaceVariant, fontSize: 12 },
  section: { marginTop: spacing.lg, fontWeight: '700', color: colors.onSurface },
  input: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 72,
    backgroundColor: '#fff',
  },
  btn: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    padding: spacing.md,
    alignItems: 'center',
  },
  btnOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary, marginTop: spacing.sm },
  btnText: { color: '#fff', fontWeight: '600' },
  btnOutlineText: { color: colors.primary },
  btnGhost: { marginTop: spacing.md, padding: spacing.sm },
  logout: { marginTop: spacing.xl * 2, alignItems: 'center' },
  logoutText: { color: colors.error, fontWeight: '600' },
});
