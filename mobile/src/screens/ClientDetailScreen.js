import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { apiFetch } from '../api/client';
import { colors, radius, spacing } from '../theme';

export function ClientDetailScreen({ route }) {
  const { id } = route.params;
  const [client, setClient] = useState(null);
  const [history, setHistory] = useState([]);
  const [note, setNote] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const c = await apiFetch(`/clients/${id}`);
    setClient(c);
    setTagsText((c.tags || []).join(', '));
    const h = await apiFetch(`/clients/${id}/history`);
    setHistory(h);
  };

  useFocusEffect(
    useCallback(() => {
      load().catch(() => {});
    }, [id])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const saveTags = async () => {
    const tags = tagsText
      .split(/[,;]/)
      .map((t) => t.trim())
      .filter(Boolean);
    try {
      await apiFetch(`/clients/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ tags }),
      });
      await load();
    } catch (e) {
      Alert.alert('Ошибка', e.message);
    }
  };

  const addNote = async () => {
    const body = note.trim();
    if (!body) return;
    try {
      await apiFetch(`/clients/${id}/history`, {
        method: 'POST',
        body: JSON.stringify({ event_type: 'note', body }),
      });
      setNote('');
      await load();
    } catch (e) {
      Alert.alert('Ошибка', e.message);
    }
  };

  if (!client) {
    return (
      <View style={styles.center}>
        <Text>Загрузка…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.inner}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.name}>{client.full_name}</Text>
      <Text style={styles.meta}>{client.phone || '—'}</Text>
      <Text style={styles.meta}>{client.email || '—'}</Text>
      {client.last_visit_at ? (
        <Text style={styles.meta}>Последний визит: {new Date(client.last_visit_at).toLocaleDateString('ru-RU')}</Text>
      ) : null}

      <Text style={styles.section}>Теги (через запятую)</Text>
      <TextInput style={styles.input} value={tagsText} onChangeText={setTagsText} />
      <TouchableOpacity style={styles.btn} onPress={saveTags}>
        <Text style={styles.btnText}>Сохранить теги</Text>
      </TouchableOpacity>

      <Text style={styles.section}>Заметка в историю</Text>
      <TextInput style={[styles.input, { minHeight: 80 }]} multiline value={note} onChangeText={setNote} placeholder="Текст…" />
      <TouchableOpacity style={styles.btn} onPress={addNote}>
        <Text style={styles.btnText}>Добавить</Text>
      </TouchableOpacity>

      <Text style={styles.section}>История</Text>
      {history.map((h) => (
        <View key={h.id} style={styles.hist}>
          <Text style={styles.histType}>{h.event_type}</Text>
          <Text style={styles.histBody}>{h.body}</Text>
          <Text style={styles.histDate}>{new Date(h.created_at).toLocaleString('ru-RU')}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  inner: { padding: spacing.md, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 22, fontWeight: '800', color: colors.onSurface },
  meta: { color: colors.onSurfaceVariant, marginTop: 4 },
  section: { marginTop: spacing.lg, fontWeight: '600', color: colors.primary },
  input: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    backgroundColor: '#fff',
  },
  btn: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    padding: spacing.md,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600' },
  hist: {
    backgroundColor: colors.surfaceContainer,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  histType: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  histBody: { marginTop: 4, color: colors.onSurface },
  histDate: { fontSize: 11, color: colors.onSurfaceVariant, marginTop: 6 },
});
