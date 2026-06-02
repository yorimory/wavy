import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api/client';
import { colors, radius, spacing } from '../theme';

export function ClientsListScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const [q, setQ] = useState('');
  const [list, setList] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const qs = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
    const data = await apiFetch(`/clients${qs}`);
    setList(data);
  };

  useFocusEffect(
    useCallback(() => {
      load().catch(() => setList([]));
    }, [q])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
      await refreshUser();
    } finally {
      setRefreshing(false);
    }
  };

  const [modal, setModal] = useState(false);
  const [newName, setNewName] = useState('');

  const createClient = () => {
    setNewName('');
    setModal(true);
  };

  const submitNew = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      await apiFetch('/clients', { method: 'POST', body: JSON.stringify({ full_name: name, tags: [] }) });
      setModal(false);
      await load();
      await refreshUser();
    } catch (e) {
      Alert.alert('Клиент', e.message);
    }
  };

  const limit = user?.subscription_tier === 'free' ? 15 : null;

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <Text style={styles.title}>Клиенты</Text>
        {limit != null && (
          <Text style={styles.limit}>
            Free: до {limit} клиентов ({list.length}/{limit})
          </Text>
        )}
        <TextInput style={styles.search} placeholder="Поиск: имя, телефон…" value={q} onChangeText={setQ} />
      </View>
      <FlatList
        data={list}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('ClientDetail', { id: item.id })}>
            <Text style={styles.name}>{item.full_name}</Text>
            <Text style={styles.meta}>{item.phone || item.email || '—'}</Text>
            {item.tags?.length ? (
              <Text style={styles.tags}>{item.tags.join(' · ')}</Text>
            ) : null}
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.muted}>Список пуст</Text>}
      />
      <TouchableOpacity style={styles.fab} onPress={createClient}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modal} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Новый клиент</Text>
            <TextInput style={styles.search} placeholder="Имя" value={newName} onChangeText={setNewName} />
            <View style={styles.modalRow}>
              <TouchableOpacity style={styles.modalBtnGhost} onPress={() => setModal(false)}>
                <Text>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtn} onPress={submitNew}>
                <Text style={styles.modalBtnText}>Сохранить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  top: { padding: spacing.md, paddingTop: 48 },
  title: { fontSize: 22, fontWeight: '800', color: colors.primary },
  limit: { color: colors.onSurfaceVariant, fontSize: 12, marginTop: 4 },
  search: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: '#fff',
  },
  row: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  name: { fontWeight: '600', color: colors.onSurface },
  meta: { color: colors.onSurfaceVariant, marginTop: 4 },
  tags: { color: colors.primary, marginTop: 6, fontSize: 12 },
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
  fabText: { color: '#fff', fontSize: 28, fontWeight: '300', marginTop: -2 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spacing.lg },
  modalCard: { backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.lg },
  modalTitle: { fontWeight: '700', fontSize: 18, marginBottom: spacing.md },
  modalRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: spacing.md },
  modalBtnGhost: { padding: spacing.md },
  modalBtn: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  modalBtnText: { color: '#fff', fontWeight: '600' },
});
