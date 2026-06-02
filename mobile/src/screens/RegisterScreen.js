import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing } from '../theme';

export function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('private_person');
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    setBusy(true);
    try {
      await register(email.trim(), password, fullName.trim(), role);
    } catch (e) {
      Alert.alert('Регистрация', e.message || 'Ошибка');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.title}>Новый аккаунт</Text>
        <View style={styles.roleRow}>
          <TouchableOpacity
            style={[styles.roleBtn, role === 'private_person' && styles.roleBtnActive]}
            onPress={() => setRole('private_person')}
          >
            <Text style={[styles.roleText, role === 'private_person' && styles.roleTextActive]}>Частное лицо</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleBtn, role === 'client' && styles.roleBtnActive]}
            onPress={() => setRole('client')}
          >
            <Text style={[styles.roleText, role === 'client' && styles.roleTextActive]}>Клиент</Text>
          </TouchableOpacity>
        </View>
        <TextInput style={styles.input} placeholder="Имя" value={fullName} onChangeText={setFullName} />
        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput style={styles.input} placeholder="Пароль (мин. 6)" secureTextEntry value={password} onChangeText={setPassword} />
        <TouchableOpacity style={styles.btn} onPress={onSubmit} disabled={busy}>
          <Text style={styles.btnText}>{busy ? '…' : 'Зарегистрироваться'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Уже есть аккаунт</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', padding: spacing.md, backgroundColor: colors.background },
  card: { backgroundColor: colors.surfaceContainerLow, borderRadius: radius.lg, padding: spacing.lg },
  title: { fontSize: 22, fontWeight: '700', color: colors.onSurface, marginBottom: spacing.md },
  roleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  roleBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
  },
  roleBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryContainer + '33' },
  roleText: { fontSize: 13, color: colors.onSurfaceVariant },
  roleTextActive: { color: colors.primary, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: '#fff',
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  btnText: { color: colors.onPrimary, fontWeight: '600' },
  link: { color: colors.primary, textAlign: 'center', marginTop: spacing.lg },
});
