# Hardware (Firmware)

El firmware es el codigo incrustado en el microcontrolador del baston inteligente. El nucleo del sistema corre sobre una placa basada en **ESP32**, con conectividad inalambrica para enviar telemetria a la nube y comunicarse con la app movil.

## Componentes Fisicos

- **Microcontrolador**: ESP32 / T-Beam para pruebas de integracion.
- **Modulo GPS**: receptor GNSS integrado o modulo externo segun la version de prototipo.
- **Acelerometro/Giroscopio**: MPU-6050 para deteccion de caidas.
- **Boton S.O.S**: push button con interrupciones de hardware.
- **Comunicacion**: Bluetooth/WiFi para app y nube; espacio reservado para antena LoRaWAN.
- **Notificaciones locales**: buzzer activo y motor de vibracion.

## Diseno Mecanico del Baston y Carcasa

Ademas del firmware y la electronica, se desarrollo un modelo mecanico del baston inteligente en **SolidWorks**. El objetivo del diseno fue integrar la placa **T-Beam** dentro de una carcasa compacta colocada en la parte superior del baston, manteniendo espacio interno para cableado, sujecion y la antena **LoRaWAN**.

El modelo contempla una carcasa tipo mango que protege la electronica y permite montar la placa sin dejarla expuesta. Tambien se dejo un canal y volumen libre para la antena LoRaWAN, ya que su posicion es importante para evitar interferencias mecanicas y mantener una mejor transmision.

<div align="center">
  <img src="../assets/imagenes/baston_diseno_completo.png" alt="Diseno completo del baston inteligente" width="700" />
</div>

!!! note "Proposito del diseno"
    La carcasa fue pensada para alojar la placa T-Beam usada durante el desarrollo, proteger los componentes electronicos y conservar un espacio dedicado para la antena LoRaWAN.

### Carcasa Superior

La carcasa se diseno con una geometria cilindrica que se integra al tubo del baston. En las vistas ortogonales se puede observar la forma general del mango, los cortes laterales y el volumen reservado para los elementos internos.

<div align="center">
  <img src="../assets/imagenes/baston_carcasa_vistas_ortogonales.png" alt="Vistas ortogonales de la carcasa del baston" width="700" />
</div>

### Alojamiento de la Placa T-Beam

El interior de la pieza incluye un espacio rectangular para colocar la placa T-Beam. Este volumen ayuda a validar que la placa entre dentro de la carcasa y que exista separacion suficiente respecto a las paredes del modelo.

<div align="center">
  <img src="../assets/imagenes/baston_alojamiento_placa_tbeam.png" alt="Alojamiento interno para placa T-Beam" width="700" />
</div>

!!! tip "Integracion electronica"
    La T-Beam concentra microcontrolador, GPS y comunicacion LoRa. Por eso se considero desde el diseno mecanico, no como un agregado posterior.

### Espacio para Antena LoRaWAN

La carcasa deja un espacio longitudinal para la antena LoRaWAN y para el enrutamiento interno. Esta zona evita que la antena quede comprimida contra la placa o contra el cuerpo principal del baston.

<div align="center">
  <img src="../assets/imagenes/baston_carcasa_transparente_componentes.png" alt="Carcasa transparente con espacio para componentes" width="700" />
</div>

<div align="center">
  <img src="../assets/imagenes/baston_carcasa_exterior_antena_lora.png" alt="Vista exterior de la carcasa con espacio para antena LoRa" width="700" />
</div>

### Archivos CAD

Los archivos de SolidWorks se incluyeron en la documentacion para que el diseno pueda revisarse, modificarse o fabricarse posteriormente.

| Archivo | Descripcion |
|---|---|
| [Paquete completo SolidWorks](assets/cad/diseno_baston_solidworks.zip) | ZIP con el ensamble, piezas e imagenes originales |
| [Ensamble del baston](assets/cad/diseno_baston/baston_ensamble_completo.SLDASM) | Ensamble principal del diseno |
| [Carcasa del mango](assets/cad/diseno_baston/carcasa_mango_baston.SLDPRT) | Pieza principal de la carcasa |
| [Placa de referencia T-Beam](assets/cad/diseno_baston/placa_referencia_tbeam.SLDPRT) | Volumen usado para validar el espacio de la placa |

!!! note "Recomendacion"
    Para abrir el ensamble sin perder referencias, usa el paquete completo ZIP. Los archivos individuales tambien estan disponibles para revision rapida.

## Codigo C++ (Arduino Core)

El codigo principal utiliza un modelo basado en maquinas de estados y subrutinas para no bloquear el procesador. El baston toma lecturas GPS, detecta eventos importantes y publica telemetria para que la app y el dashboard puedan mostrar el estado del usuario.

```cpp
// Fragmento de lectura de GPS y publicacion en Firebase
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

    FirebaseJson json;
    json.set("lat", lat);
    json.set("lng", lng);
    json.set("timestamp", ".sv/timestamp");

    if (Firebase.RTDB.setJSON(&fbdo, "/baston_1/ubicacion", &json)) {
      Serial.println("Ubicacion actualizada con exito en la nube.");
    } else {
      Serial.println("Error de red: " + fbdo.errorReason());
    }
  }
}
```
