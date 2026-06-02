import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { ClientsStack } from './ClientsStack';
import { CalendarScreen } from '../screens/CalendarScreen';
import { RetentionScreen } from '../screens/RetentionScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: { backgroundColor: colors.surfaceContainerLow, borderTopColor: colors.outlineVariant },
      }}
    >
      <Tab.Screen
        name="TabHome"
        component={DashboardScreen}
        options={{ title: 'Главная', tabBarIcon: () => <Text style={{ fontSize: 20 }}>⌂</Text> }}
      />
      <Tab.Screen
        name="TabClients"
        component={ClientsStack}
        options={{ title: 'Клиенты', tabBarIcon: () => <Text style={{ fontSize: 20 }}>◎</Text> }}
      />
      <Tab.Screen
        name="TabCalendar"
        component={CalendarScreen}
        options={{ title: 'Календарь', tabBarIcon: () => <Text style={{ fontSize: 20 }}>▦</Text> }}
      />
      <Tab.Screen
        name="TabRetention"
        component={RetentionScreen}
        options={{ title: 'Smart', tabBarIcon: () => <Text style={{ fontSize: 20 }}>✦</Text> }}
      />
      <Tab.Screen
        name="TabSettings"
        component={SettingsScreen}
        options={{ title: 'Профиль', tabBarIcon: () => <Text style={{ fontSize: 20 }}>☰</Text> }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { token, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!token ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : (
        <Stack.Screen name="Main" component={MainTabs} />
      )}
    </Stack.Navigator>
  );
}
