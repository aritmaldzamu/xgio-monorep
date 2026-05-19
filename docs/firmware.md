# Hardware (Firmware)

El firmware es el código incrustado en el microcontrolador del bastón inteligente. El núcleo del sistema corre sobre un **ESP32** debido a su capacidad de procesamiento y su módulo WiFi/Bluetooth integrado, ideal para enviar telemetría a la nube y comunicarse con la app.

## Componentes Físicos

- **Microcontrolador**: ESP32
- **Módulo GPS**: NEO-6M (Comunicación Serial)
- **Acelerómetro/Giroscopio**: MPU-6050 (Comunicación I2C) para detección de caídas
- **Botón S.O.S**: Push button con interrupciones de hardware
- **Notificaciones locales**: Buzzer activo y Motor de Vibración

## 💻 Código C++ (Arduino Core)

El código principal utiliza un modelo basado en máquinas de estados y subrutinas para no bloquear el procesador (evitando la función `delay()` siempre que sea posible). A continuación, un fragmento de la integración del GPS y Firebase:

```cpp
// Fragmento de lectura de GPS y publicación en Firebase
#include <TinyGPS++.h>
#include <Firebase_ESP_Client.h>

TinyGPSPlus gps;
FirebaseData fbdo;

void updateLocation() {
  while (SerialGPS.available() > 0) {
    gps.encode(SerialGPS.read());
  }

  if (gps.location.isUpdated()) {
    float lat = gps.location.lat();
    float lng = gps.location.lng();
    
    // Crear el nodo JSON para Firebase
    FirebaseJson json;
    json.set("lat", lat);
    json.set("lng", lng);
    json.set("timestamp", ".sv/timestamp"); // Server timestamp
    
    // Publicar en Realtime Database
    if (Firebase.RTDB.setJSON(&fbdo, "/baston_1/ubicacion", &json)) {
      Serial.println("Ubicación actualizada con éxito en la nube.");
    } else {
      Serial.println("Error de red: " + fbdo.errorReason());
    }
  }
}
```

