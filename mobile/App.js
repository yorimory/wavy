import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Platform, ActivityIndicator, Text, TouchableOpacity, LogBox } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'Error getting Expo Push Token',
]);

// Конфигурация всплытия локальных уведомлений
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function getWebUrl() {
  const fromExtra = Constants.expoConfig?.extra?.webUrl;
  if (fromExtra) return fromExtra;
  // По умолчанию возвращаем локальный адрес Vite-сервера
  return 'http://192.168.1.50:5173';
}

export default function App() {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorDetails, setErrorDetails] = useState(null);
  const webViewRef = useRef(null);
  const responseListener = useRef();

  useEffect(() => {
    // 1. Запрашиваем права на уведомления и получаем Expo Push Token
    async function registerForPushNotificationsAsync() {
      if (Platform.OS === 'web') return;
      
      if (!Device.isDevice) {
        console.log('Must use physical device for Push Notifications');
        return;
      }
      
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }
      
      try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        if (!projectId) {
          console.log('No EAS projectId found in app.json. Skipping push token registration.');
          return;
        }
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
        setToken(tokenData.data);
        console.log('Expo Push Token received:', tokenData.data);
      } catch (error) {
        console.log('Error getting Expo Push Token:', error.message);
      }
    }

    registerForPushNotificationsAsync().finally(() => setLoading(false));

    // 2. Настраиваем слушатель нажатий на уведомления
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      // При нажатии на пуш-уведомление перенаправляем в Календарь
      if (webViewRef.current) {
        const jsCode = `
          if (window.location.pathname !== '/calendar') {
            window.location.href = '/calendar';
          }
          true;
        `;
        webViewRef.current.injectJavaScript(jsCode);
      }
    });

    return () => {
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  // Передаем токен внутрь WebView после завершения загрузки страницы
  const sendTokenToWebView = () => {
    if (token && webViewRef.current) {
      const message = JSON.stringify({ type: 'expo_push_token', token });
      webViewRef.current.postMessage(message);
      console.log('Push token sent to WebView:', token);
    }
  };

  const targetUrl = getWebUrl();

  const handleWebViewError = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.warn('WebView error: ', nativeEvent);
    setErrorDetails(`Ошибка загрузки страницы: ${nativeEvent.description || 'Неизвестная ошибка'} (${nativeEvent.code || ''})`);
  };

  const handleWebViewHttpError = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.warn('WebView HTTP error: ', nativeEvent);
    if (nativeEvent.statusCode >= 400) {
      setErrorDetails(`HTTP ошибка сервера: Код ${nativeEvent.statusCode}`);
    }
  };

  const reloadWebView = () => {
    setErrorDetails(null);
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      {errorDetails ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Ошибка подключения</Text>
          <Text style={styles.errorSubtitle}>
            Не удалось загрузить веб-интерфейс CRM. Проверьте подключение к интернету или настройки адреса сервера.
          </Text>
          <View style={styles.errorCard}>
            <Text style={styles.errorLabel}>Адрес сервера:</Text>
            <Text style={styles.errorValue}>{targetUrl}</Text>
            <Text style={styles.errorLabel}>Детали:</Text>
            <Text style={styles.errorValue}>{errorDetails}</Text>
          </View>
          <TouchableOpacity style={styles.retryButton} onPress={reloadWebView}>
            <Text style={styles.retryButtonText}>Повторить попытку</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <WebView
          ref={webViewRef}
          source={{ uri: targetUrl }}
          onLoadEnd={sendTokenToWebView}
          onError={handleWebViewError}
          onHttpError={handleWebViewHttpError}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4f378a" />
            </View>
          )}
          androidLayerType="hardware"
          decelerationRate={Platform.OS === 'ios' ? 'normal' : 0.998}
          overScrollMode="never"
          allowsBackForwardNavigationGestures={true}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf7ff',
    paddingTop: Platform.OS === 'android' ? 32 : 0,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#faf7ff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#faf7ff',
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1c1b1f',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#49454f',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  errorCard: {
    width: '100%',
    backgroundColor: '#f3edf7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e8def8',
  },
  errorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4f378a',
    marginTop: 8,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  errorValue: {
    fontSize: 14,
    color: '#1c1b1f',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  retryButton: {
    backgroundColor: '#4f378a',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
