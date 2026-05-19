import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';

// Configurar cómo se comportan las notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Función para solicitar permisos y obtener el token
export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Alertas XGIO',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Permiso denegado para notificaciones push');
      return null;
    }
    
    try {
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;
      
      if (!projectId) {
        console.warn("ADVERTENCIA: No se encontró 'projectId'. Expo Push necesita que ejecutes 'npx eas-cli init'.");
      }

      // Obtener el token de Expo
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: projectId || "46564c7e-07f1-4db8-8d4d-50e5884ffb01" // Un fallback dummy que a veces Expo rechaza
      })).data;
    } catch (e) {
      console.error("Error al obtener Expo Push Token:", e);
      Alert.alert("Error de Notificaciones", "Para que funcionen las notificaciones en segundo plano, necesitas vincular la app a una cuenta gratuita de Expo. Ejecuta 'npx eas-cli init' en tu terminal.");
    }
    
  } else {
    console.log('Debes usar un dispositivo físico para Notificaciones Push');
  }

  return token;
}

// Función para enviar la notificación directamente a través de los servidores de Expo
export async function sendPushNotification(expoPushToken, title, body) {
  if (!expoPushToken) return;

  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
    data: { someData: 'goes here' },
  };

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
  } catch (error) {
    console.error("Error enviando push:", error);
  }
}
