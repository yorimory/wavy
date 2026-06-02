import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { apiFetch } from '../api/client';
import { colors, radius, spacing } from '../theme';

export function CalendarScreen() {
  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState('Запись');
  const [starts, setStarts] = useState('');
  const [ends, setEnds] = useState('');

  const range = () => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 14);
    return { from, to };
  };

  const load = async () => {
    const { from, to } = range();
    const data = await apiFetch(
      `/appointments?from_ts=${encodeURIComponent(from.toISOString())}&to_ts=${encodeURIComponent(to.toISOString())}`
    );
    setItems(data.sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at)));
  };

  useFocusEffect(
    useCallback(() => {
      load().catch(() => setItems([]));
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const openAdd = () => {
    const now = new Date();
    const end = new Date(now.getTime() + 60 * 60 * 1000);
    setTitle('Запись');
    setStarts(now.toISOString().slice(0, 16));
    setEnds(end.toISOString().slice(0, 16));
    setModal(true);
  };

  const submit = async () => {
    try {
      const s = new Date(starts);
      const e = new Date(ends);
      await apiFetch('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          title,
          starts_at: s.toISOString(),
          ends_at: e.toISOString(),
          status: 'pending',
        }),
      });
      setModal(false);
      await load();
    } catch (err) {
      Alert.alert('Календарь', err.message);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Календарь</Text>
        <Text style={styles.sub}>Ближайшие 14 дней</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={(a) => String(a.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.meta}>
              {new Date(item.starts_at).toLocaleString('ru-RU')} — {new Date(item.ends_at).toLocaleString('ru-RU')}
            </Text>
            <Text style={styles.meta}>
              {item.status} · бот: {item.bot_confirmation_status}
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.muted}>Нет записей</Text>}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
      />
      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Новая запись</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Заголовок" />
            <Text style={styles.label}>Начало (локальное)</Text>
            <TextInput style={styles.input} value={starts} onChangeText={setStarts} />
            <Text style={styles.label}>Конец</Text>
            <TextInput style={styles.input} value={ends} onChangeText={setEnds} />
            <View style={styles.row}>
              <TouchableOpacity onPress={() => setModal(false)}>
                <Text>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSmall} onPress={submit}>
                <Text style={styles.btnSmallText}>Создать</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: 48, paddingHorizontal: spacing.md },
  title: { fontSize: 22, fontWeight: '800', color: colors.primary },
  sub: { color: colors.onSurfaceVariant, marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardTitle: { fontWeight: '600' },
  meta: { color: colors.onSurfaceVariant, marginTop: 4, fontSize: 13 },
  muted: { textAlign: 'center', color: colors.onSurfaceVariant, marginTop: 24 },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 28, marginTop: -2 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', padding: spacing.lg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  modalTitle: { fontWeight: '700', fontSize: 18, marginBottom: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  label: { fontSize: 12, color: colors.onSurfaceVariant },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
  btnSmall: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  btnSmallText: { color: '#fff', fontWeight: '600' },
});
