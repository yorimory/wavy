import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api/client';
import { colors, radius, spacing } from '../theme';

export function DashboardScreen() {
  const { user } = useAuth();
  const [today, setToday] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const list = await apiFetch(
      `/appointments?from_ts=${encodeURIComponent(start.toISOString())}&to_ts=${encodeURIComponent(end.toISOString())}`
    );
    setToday(list);
  };

  useFocusEffect(
    useCallback(() => {
      load().catch(() => setToday([]));
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

  const tierLabel = user?.subscription_tier === 'premium' ? 'Premium' : 'Free';

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.inner}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>WAVY</Text>
          <Text style={styles.greet}>Привет, {user?.full_name || 'мастер'}!</Text>
          <Text style={styles.muted}>Записей на сегодня: {today.length}</Text>
        </View>
        <View style={[styles.badge, user?.subscription_tier === 'premium' ? styles.badgePrem : styles.badgeFree]}>
          <Text style={styles.badgeText}>{tierLabel}</Text>
        </View>
      </View>

      <Text style={styles.section}>Сегодня</Text>
      {today.length === 0 ? (
        <Text style={styles.muted}>Нет записей — отдыхайте или пригласите клиентов из списка.</Text>
      ) : (
        today.map((a) => (
          <View key={a.id} style={styles.card}>
            <Text style={styles.cardTitle}>{a.title}</Text>
            <Text style={styles.muted}>
              {new Date(a.starts_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} —{' '}
              {new Date(a.ends_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <Text style={styles.muted}>Статус: {a.status}</Text>
          </View>
        ))
      )}

      <TouchableOpacity style={styles.cta} onPress={onRefresh}>
        <Text style={styles.ctaText}>Обновить</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  inner: { padding: spacing.md, paddingTop: 48 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg },
  brand: { fontSize: 22, fontWeight: '800', color: colors.primary },
  greet: { fontSize: 18, fontWeight: '700', color: colors.onSurface, marginTop: spacing.sm },
  muted: { color: colors.onSurfaceVariant, marginTop: 4 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  badgeFree: { backgroundColor: colors.tertiaryFixed },
  badgePrem: { backgroundColor: colors.primaryContainer },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.onTertiaryFixedVariant },
  section: { fontSize: 16, fontWeight: '600', marginBottom: spacing.sm },
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
  cardTitle: { fontWeight: '600', color: colors.onSurface },
  cta: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    padding: spacing.md,
    alignItems: 'center',
  },
  ctaText: { color: colors.onPrimary, fontWeight: '600' },
});
