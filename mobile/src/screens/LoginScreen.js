import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing } from '../theme';

export function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      Alert.alert('Вход', e.message || 'Ошибка');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.logo}>WAVY</Text>
        <Text style={styles.sub}>CRM для мастера</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput style={styles.input} placeholder="Пароль" secureTextEntry value={password} onChangeText={setPassword} />
        <TouchableOpacity style={styles.btn} onPress={onSubmit} disabled={busy}>
          <Text style={styles.btnText}>{busy ? '…' : 'Войти'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>Создать аккаунт</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', padding: spacing.md, backgroundColor: colors.background },
  card: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  logo: { fontSize: 28, fontWeight: '800', color: colors.primary, textAlign: 'center' },
  sub: { textAlign: 'center', color: colors.onSurfaceVariant, marginBottom: spacing.lg },
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
