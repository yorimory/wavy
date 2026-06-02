import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api/client';
import { colors, radius, spacing } from '../theme';

export function RetentionScreen() {
  const { isPremium } = useAuth();
  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const data = await apiFetch('/recommendations/retention');
    setItems(data);
  };

  useFocusEffect(
    useCallback(() => {
      if (!isPremium) {
        setItems([]);
        return;
      }
      load().catch((e) => {
        if (e.status === 402) setItems([]);
        else Alert.alert('Smart Retention', e.message);
      });
    }, [isPremium])
  );

  const onRefresh = async () => {
    if (!isPremium) return;
    setRefreshing(true);
    try {
      await load();
    } catch (e) {
      Alert.alert('Smart Retention', e.message);
    } finally {
      setRefreshing(false);
    }
  };

  if (!isPremium) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Smart Retention</Text>
        <Text style={styles.text}>
          Модуль анализа циклов посещений и напоминаний доступен в тарифе Premium (9.99 BYN/мес): безлимит клиентов,
          Telegram-бот, рекомендации и авто-модерация.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Кому напомнить</Text>
        <Text style={styles.sub}>Алгоритм по интервалам визитов</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={(r) => String(r.client_id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.client_name}</Text>
            <Text style={styles.score}>Приоритет: {item.score.toFixed(0)}</Text>
            <Text style={styles.body}>{item.reason}</Text>
            <Text style={styles.action}>{item.suggested_action}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.muted}>Пока нет рекомендаций — добавьте записи с привязкой к клиенту.</Text>
        }
        contentContainerStyle={{ padding: spacing.md }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, padding: spacing.lg, paddingTop: 64, backgroundColor: colors.background },
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
  name: { fontWeight: '700', fontSize: 16 },
  score: { color: colors.primary, marginTop: 4, fontWeight: '600' },
  body: { marginTop: spacing.sm, color: colors.onSurface },
  action: { marginTop: spacing.sm, color: colors.onSurfaceVariant, fontStyle: 'italic' },
  muted: { color: colors.onSurfaceVariant, textAlign: 'center', marginTop: 24 },
  text: { marginTop: spacing.md, color: colors.onSurface, lineHeight: 22 },
});
