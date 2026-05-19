// lib/bleService.js
// Servicio BLE para conectarse al bastón XGIO-Cane y recibir alertas y batería

import { BleManager } from "react-native-ble-plx";
import { Alert, Platform, PermissionsAndroid } from "react-native";

// UUIDs del bastón — deben coincidir exactamente con el firmware del ESP32
export const XGIO_SERVICE_UUID       = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
export const XGIO_CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";
export const XGIO_DEVICE_NAME        = "XGIO-Cane-01";

// Singleton del BleManager
let manager = null;

// Polyfill de atob para React Native (Hermes no lo trae por defecto)
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
const decodeBase64 = (input) => {
  let str = input.replace(/=+$/, '');
  let output = '';
  if (str.length % 4 == 1) throw new Error("Base64 invalido");
  for (let bc = 0, bs = 0, buffer, i = 0;
    buffer = str.charAt(i++);
    ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
      bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
  ) {
    buffer = chars.indexOf(buffer);
  }
  return output;
};

export function getBleManager() {
  if (!manager) {
    manager = new BleManager();
  }
  return manager;
}

export async function requestBluetoothPermissions() {
  if (Platform.OS === 'android') {
    if (Platform.Version >= 31) {
      const result = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      return (
        result['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
        result['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
        result['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
      );
    } else {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }
  }
  return true;
}

/**
 * Escanea dispositivos BLE cercanos buscando el bastón XGIO.
 * @param {function} onDeviceFound  - Callback que recibe el device cuando lo encuentra
 * @param {function} onError        - Callback para errores de escaneo
 */
export function scanForCane(onDeviceFound, onError) {
  const ble = getBleManager();

  // Escanear especificando el UUID del servicio directamente. 
  // Esto soluciona problemas en Android donde el nombre llega como null.
  ble.startDeviceScan([XGIO_SERVICE_UUID], { allowDuplicates: false }, (error, device) => {
    if (error) {
      console.log("Error de escaneo:", error);
      onError(error.message);
      return;
    }
    
    // Si encuentra un dispositivo con este UUID, es nuestro bastón.
    if (device) {
      ble.stopDeviceScan();
      console.log("¡Bastón encontrado!", device.id, device.name);
      onDeviceFound(device);
    }
  });
}

/**
 * Se conecta al bastón y activa las notificaciones BLE.
 * @param {Device}   device       - Dispositivo encontrado en el escaneo
 * @param {function} onData       - Callback que recibe los datos JSON del bastón
 * @param {function} onDisconnect - Callback cuando el bastón se desconecta
 */
export async function connectToCane(device, onData, onDisconnect) {
  const ble = getBleManager();

  try {
    const connected = await device.connect();
    
    // IMPORTANTE: Negociar MTU mayor porque el JSON del ESP32 tiene más de 20 bytes
    // Si no se hace esto, el mensaje se corta y JSON.parse() falla silenciosamente.
    if (Platform.OS === 'android') {
      try {
        await connected.requestMTU(128);
      } catch (mtuErr) {
        console.log("MTU request failed:", mtuErr);
      }
    }
    
    await connected.discoverAllServicesAndCharacteristics();

    // Suscribirse a notificaciones del bastón
    connected.monitorCharacteristicForService(
      XGIO_SERVICE_UUID,
      XGIO_CHARACTERISTIC_UUID,
      (error, characteristic) => {
        if (error) {
          console.log("BLE Monitor Error:", error.message);
          return;
        }
        if (characteristic?.value) {
          try {
            // El valor llega en Base64, lo decodificamos
            const raw = decodeBase64(characteristic.value);
            const parsed = JSON.parse(raw);
            onData(parsed);
          } catch (e) {
            console.log("BLE parse error:", e);
            Alert.alert("Error interno", "El mensaje del bastón llegó cortado o ilegible.");
          }
        }
      }
    );

    // Detectar desconexión
    ble.onDeviceDisconnected(connected.id, () => {
      onDisconnect();
    });

    return connected;
  } catch (error) {
    throw new Error("No se pudo conectar al bastón: " + error.message);
  }
}

/**
 * Desconecta el bastón activo.
 */
export async function disconnectCane(device) {
  if (device) {
    try {
      await device.cancelConnection();
    } catch (e) {
      console.log("Error al desconectar BLE:", e);
    }
  }
}
