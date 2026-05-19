/*

* Receptor CAN con MCP2515

* Recibe dos datos:

* data[0] = estado del LED del botón

* data[1] = intensidad del LED del potenciómetro

*/
 
#include <SPI.h>

#include <mcp2515.h>
 
// Pines de salida

#define LED_BOTON 4

#define LED_POT   5   // Pin PWM
 
// MCP2515 con CS en pin 10

MCP2515 mcp2515(10);
 
// Mensaje CAN recibido

struct can_frame canMsg;
 
void setup() {

  Serial.begin(9600);
 
  pinMode(LED_BOTON, OUTPUT);

  pinMode(LED_POT, OUTPUT);
 
  // Inicialización del MCP2515

  mcp2515.reset();

  mcp2515.setBitrate(CAN_500KBPS, MCP_8MHZ);

  mcp2515.setNormalMode();
 
  digitalWrite(LED_BOTON, LOW);

  analogWrite(LED_POT, 0);

}
 
void loop() {
 
  // Revisar si llegó un mensaje CAN

  if (mcp2515.readMessage(&canMsg) == MCP2515::ERROR_OK) {
 
    // Verificar que sea el mensaje correcto

    if (canMsg.can_id == 0x10 && canMsg.can_dlc >= 2) {
 
      int estadoLedBoton = canMsg.data[0];

      int intensidadLedPot = canMsg.data[1];
 
      // LED controlado por botón

      if (estadoLedBoton == 1) {

        digitalWrite(LED_BOTON, HIGH);

      } else {

        digitalWrite(LED_BOTON, LOW);

      }
 
      // LED controlado por potenciómetro

      analogWrite(LED_POT, intensidadLedPot);
 
      Serial.print("LED boton recibido: ");

      Serial.print(estadoLedBoton);

      Serial.print(" | Intensidad LED pot recibida: ");

      Serial.println(intensidadLedPot);

    }

  }

}
 