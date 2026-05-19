# Guía de Conexiones Físicas (PINOUT)
**Placa Base:** LILYGO T-Beam V1.2 (AXP2101)

Esta guía detalla cómo están internamente conectados los componentes de tu placa y cómo deberás conectar el sensor de caídas (MPU6050) cuando consigas los cables.

## 1. Conexiones Internas (Ya cableadas de fábrica)
No tienes que hacer nada con estos, el código ya viene programado para leerlos automáticamente.

| Componente | Pin ESP32 | Función |
| :--- | :--- | :--- |
| **GPS (NEO-6M)** | `GPIO 34 / 12` | *Apagado por software* (Usaremos GPS del celular). |
| **Botón S.O.S** | `GPIO 38` | Botón central de la placa. |
| **Chip Batería AXP2101** | `GPIO 21 / 22` | Comunicación I2C interna. |

---

## 2. Conexiones Externas (Sensor de Caídas MPU6050)
Cuando decidas agregar el detector de caídas por hardware, deberás conseguir un módulo **MPU6050** y soldarlo a los pines laterales de tu T-Beam.

> [!WARNING]
> **Voltaje Crítico:** El MPU6050 funciona a 3.3V. **NUNCA** lo conectes al pin de 5V porque quemarás el sensor.

| Pin en MPU6050 | Pin a soldar en la LILYGO T-Beam | Propósito |
| :--- | :--- | :--- |
| **VCC** | `3V3` | Alimentación de voltaje (3.3V) |
| **GND** | `GND` | Tierra (Ground) |
| **SDA** | `21` | Línea de datos I2C |
| **SCL** | `22` | Línea de reloj I2C |

*(Los pines 21, 22, 3V3 y GND están claramente serigrafiados en los bordes laterales de tu tarjeta).*

## Siguientes Pasos (Cable de Programación)
Para cargar el código a la placa, necesitarás un cable **Micro-USB a USB**.
> [!IMPORTANT]
> Asegúrate de que el cable sea de **Transferencia de Datos** y no solo de carga (los cables de los cargadores baratos de celular a veces solo tienen los pines de energía y la computadora no detectará la placa).
