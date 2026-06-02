import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ClientsListScreen } from '../screens/ClientsListScreen';
import { ClientDetailScreen } from '../screens/ClientDetailScreen';

const Stack = createNativeStackNavigator();

export function ClientsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="ClientsList" component={ClientsListScreen} options={{ title: 'Клиенты', headerShown: false }} />
      <Stack.Screen name="ClientDetail" component={ClientDetailScreen} options={{ title: 'Карточка' }} />
    </Stack.Navigator>
  );
}
