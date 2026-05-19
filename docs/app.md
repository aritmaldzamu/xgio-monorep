# Aplicación Móvil (App)

La aplicación móvil de XGIO está construida con **React Native** y **Expo**. Sirve como la interfaz principal tanto para el usuario del bastón como para sus familiares o cuidadores, adaptando la experiencia dependiendo del rol seleccionado.

## Interfaz y Experiencia de Usuario (UI/UX)

La aplicación cuenta con un diseño intuitivo, moderno y accesible en modo oscuro.

### 1. Selección de Rol e Inicio
Al iniciar, la aplicación permite configurar el dispositivo como "Cuidador" o como el "Usuario (Bastón)". 
La pantalla de inicio del Cuidador permite enlazar el bastón vía Bluetooth y ver su estado de batería.

<div style="display: flex; flex-wrap: wrap; justify-content: space-around;">
  <img src="/xgio-monorep/assets/imagenes/seleccion_rol.jpeg" alt="Selección de Rol" width="220" style="margin: 5px;" />
  <img src="/xgio-monorep/assets/imagenes/inicio_app.jpeg" alt="Inicio de App" width="220" style="margin: 5px;" />
  <img src="/xgio-monorep/assets/imagenes/estado_baston.jpeg" alt="Estado del Bastón" width="220" style="margin: 5px;" />
</div>

### 2. Rastreo GPS en Tiempo Real e Historial
Los cuidadores pueden visualizar la ubicación exacta del usuario en un mapa y revisar el historial de puntos registrados durante la semana.

<div style="display: flex; flex-wrap: wrap; justify-content: space-around;">
  <img src="/xgio-monorep/assets/imagenes/mapa_recorrido.jpeg" alt="Mapa del Recorrido" width="250" style="margin: 5px;" />
  <img src="/xgio-monorep/assets/imagenes/historial_rutas.jpeg" alt="Historial de Rutas" width="250" style="margin: 5px;" />
</div>

### 3. Sistema de Alertas (S.O.S y Caídas)
El sistema envía notificaciones críticas instantáneas si el usuario presiona el botón S.O.S físico del bastón, o si el acelerómetro detecta un impacto que sugiera una caída.

<div style="display: flex; flex-wrap: wrap; justify-content: space-around;">
  <img src="/xgio-monorep/assets/imagenes/alerta_sos.jpeg" alt="Alerta SOS" width="250" style="margin: 5px;" />
  <img src="/xgio-monorep/assets/imagenes/alerta_caida.jpeg" alt="Alerta Caída" width="250" style="margin: 5px;" />
</div>

---

## 💻 Implementación y Código

El desarrollo de la aplicación fue estructurado con componentes reutilizables y comunicación directa con nuestro backend.

=== "app/login.jsx"
    ```javascript
    // Pantalla de login: llama a POST /login, guarda el JWT y navega a home
    import { useState } from "react";
    import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
    import { useRouter } from "expo-router";
    import AsyncStorage from "@react-native-async-storage/async-storage";
    import { loginUser } from "../lib/api";

    export default function LoginScreen() {
      const router = useRouter();
      const [email,    setEmail]    = useState("");
      const [password, setPassword] = useState("");
      const [loading,  setLoading]  = useState(false);

      const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
          Alert.alert("Campos requeridos", "Ingresa tu correo y contraseña.");
          return;
        }
        setLoading(true);
        try {
          // El backend devuelve { token, uid, name, email, cane_id }
          const data = await loginUser(email.trim().toLowerCase(), password);

          // Guardar token (el contexto GPS lo leerá cuando inicie tracking)
          await AsyncStorage.setItem("@user_token", data.token);
          await AsyncStorage.removeItem("@cane_id");

          router.replace("/(tabs)/home");
        } catch (err) {
          Alert.alert("Error al iniciar sesión", err.message);
        } finally {
          setLoading(false);
        }
      };
      
      // ... (Renderizado de UI con Tailwind CSS / Nativewind)
    }
    ```

