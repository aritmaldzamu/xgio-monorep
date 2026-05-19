// app/(tabs)/home.jsx
// Pantalla principal: botón de seguimiento GPS + panel BLE del bastón

import { useEffect, useState, useCallback, useRef } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Animated, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { jwtDecode } from "jwt-decode";
import { useLocationTracking } from "../../context/locationTrackingContext";
import { scanForCane, connectToCane, disconnectCane, requestBluetoothPermissions } from "../../lib/bleService";
import { doc, updateDoc, serverTimestamp, onSnapshot, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { registerForPushNotificationsAsync, sendPushNotification } from "../../lib/pushService";

// ─── Anillo pulsante para el indicador activo ─────────────────────────────────
function PulseRing() {
  const scale   = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale,   { toValue: 2,   duration: 900, useNativeDriver: true }),
          Animated.timing(scale,   { toValue: 1,   duration: 0,   useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0,   duration: 900, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.5, duration: 0,   useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={{
        position: "absolute",
        width: 12, height: 12,
        borderRadius: 6,
        backgroundColor: "#22C55E",
        transform: [{ scale }],
        opacity,
      }}
    />
  );
}

// â”€â”€â”€ Botón de acción rápida â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function QuickBtn({ icon, label, color, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        flex: 1, alignItems: "center", justifyContent: "center",
        backgroundColor: color + "18", borderRadius: 16,
        borderWidth: 1, borderColor: color + "30",
        paddingVertical: 18, marginHorizontal: 4,
      }}
    >
      <Ionicons name={icon} size={26} color={color} />
      <Text style={{ color, fontSize: 12, fontWeight: "600", marginTop: 6, textAlign: "center" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// â”€â”€â”€ Indicador de Batería â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function BatteryBar({ percent }) {
  const color = percent > 50 ? "#22C55E" : percent > 20 ? "#F59E0B" : "#EF4444";
  return (
    <View style={{ marginTop: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
        <Text style={{ color: "#9CA3AF", fontSize: 11 }}>Batería del Bastón</Text>
        <Text style={{ color, fontSize: 11, fontWeight: "700" }}>{percent}%</Text>
      </View>
      <View style={{ height: 6, backgroundColor: "#1F2937", borderRadius: 3 }}>
        <View style={{
          height: 6, borderRadius: 3,
          backgroundColor: color,
          width: `${percent}%`,
        }} />
      </View>
    </View>
  );
}

// ─── Pantalla ─────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const [uid,      setUid]      = useState(null);
  const [userName, setUserName] = useState("Usuario");
  const [role,     setRole]     = useState(null);

  const { isTracking, isLoading, lastLocation, error, startTracking, stopTracking } =
    useLocationTracking();

  // --- Estados BLE ---
  const [bleStatus,    setBleStatus]    = useState("disconnected"); // disconnected | scanning | connecting | connected
  const [caneDevice,   setCaneDevice]   = useState(null);
  const [caneBattery,  setCaneBattery]  = useState(null);
  const [lastAlert,    setLastAlert]    = useState(null);
  const caneRef = useRef(null);

  // --- Estado para el Cuidador ---
  const [remoteData, setRemoteData] = useState(null);

  // Cargar nombre del usuario desde el JWT
  useEffect(() => {
    AsyncStorage.getItem("@user_token").then((token) => {
      if (!token) { router.replace("/login"); return; }
      try {
        const d = jwtDecode(token);
        setUid(d.uid ?? d.sub ?? null);
        setUserName(d.name ?? d.email?.split("@")[0] ?? "Usuario");
      } catch {
        router.replace("/login");
      }
    });
    AsyncStorage.getItem("@app_role").then(setRole);
  }, []);

  // Registrar Push Token si es Cuidador
  useEffect(() => {
    if (role === "caregiver" && uid) {
      registerForPushNotificationsAsync().then(async (token) => {
        if (token) {
          try {
            await updateDoc(doc(db, "users", uid), {
              caregiver_push_token: token
            });
            console.log("Push token registrado:", token);
          } catch (e) {
            console.log("Error guardando push token:", e);
          }
        }
      });
    }
  }, [role, uid]);

  // Escuchar Firebase en tiempo real para el Cuidador
  useEffect(() => {
    if (role !== "caregiver" || !uid) return;
    const unsub = onSnapshot(doc(db, "users", uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setRemoteData(data);
        
        // Alerta Popup
        if (data.sos && data.sos_timestamp) {
          // Para no spanear, puedes mostrar el popup si quieres, pero
          // lo mejor es mostrarlo grande en la interfaz (ver abajo).
        }
      }
    });
    return () => unsub();
  }, [role, uid]);

  // Limpiar conexión BLE al salir
  useEffect(() => {
    return () => {
      if (caneRef.current) disconnectCane(caneRef.current);
    };
  }, []);

  // ── Escribir estado BLE a Firestore (para el dashboard) ─────────────────────
  const syncBleToFirestore = useCallback(async (updates) => {
    if (!uid) return;
    try {
      await updateDoc(doc(db, "users", uid), {
        ...updates,
        last_seen: serverTimestamp(),
      });
    } catch (e) {
      console.log("Firestore BLE sync error:", e.message);
    }
  }, [uid]);

  // ── Conectar / Desconectar BLE ──────────────────────────────────────────────
  const handleBleToggle = useCallback(async () => {
    if (bleStatus === "connected") {
      // Desconectar
      await disconnectCane(caneRef.current);
      caneRef.current = null;
      setCaneDevice(null);
      setCaneBattery(null);
      setLastAlert(null);
      setBleStatus("disconnected");
      // Marcar como desconectado en Firestore
      syncBleToFirestore({ ble_connected: false });
      return;
    }

    const hasPermission = await requestBluetoothPermissions();
    if (!hasPermission) {
      Alert.alert("Permisos insuficientes", "Se requieren permisos de Bluetooth y Ubicación para conectar el bastón.");
      return;
    }

    setBleStatus("scanning");

    scanForCane(
      async (device) => {
        // Bastón encontrado â†’ conectar
        setBleStatus("connecting");
        try {
          const connected = await connectToCane(
            device,
            (data) => {
              // Dato recibido desde el bastón â†’ guardar en Firestore
              if (data.bat !== undefined) {
                setCaneBattery(data.bat);
                syncBleToFirestore({ battery: data.bat, ble_connected: true });
              }
              if (data.alert) {
                setLastAlert(data.alert);
                // Persistir la última alerta también
                const alertUpdates = { last_alert: data.alert };
                if (data.alert === "SOS" || data.alert === "FALL") {
                  alertUpdates.sos = true;
                  alertUpdates.sos_timestamp = serverTimestamp();
                  
                  // Enviar Notificación Push al cuidador
                  getDoc(doc(db, "users", uid)).then(snap => {
                    if (snap.exists() && snap.data().caregiver_push_token) {
                      sendPushNotification(
                        snap.data().caregiver_push_token,
                        data.alert === "FALL" ? "¡CAÍDA DETECTADA!" : "¡ALERTA S.O.S!",
                        "El bastón inteligente ha reportado una emergencia."
                      );
                    }
                  });
                }
                syncBleToFirestore(alertUpdates);
                if (data.alert === "SOS") {
                  Alert.alert(
                    "🚨 Alerta S.O.S",
                    "Tu familiar presionó el botón de emergencia del bastón.",
                    [{ text: "Entendido", style: "default" }]
                  );
                } else if (data.alert === "FALL") {
                  Alert.alert(
                    "⚠️ Caída Detectada",
                    "El bastón detectó un impacto fuerte o posible caída.",
                    [{ text: "Entendido", style: "default" }]
                  );
                }
              }
            },
            () => {
              // Desconexión inesperada
              setBleStatus("disconnected");
              caneRef.current = null;
              setCaneDevice(null);
              setCaneBattery(null);
              syncBleToFirestore({ ble_connected: false });
            }
          );
          caneRef.current = connected;
          setCaneDevice(connected);
          setBleStatus("connected");
          // Marcar como conectado en Firestore
          syncBleToFirestore({ ble_connected: true });
        } catch (e) {
          Alert.alert("Error BLE", e.message);
          setBleStatus("disconnected");
        }
      },
      (errorMsg) => {
        Alert.alert("Error de escaneo", errorMsg);
        setBleStatus("disconnected");
      }
    );

    // Timeout de escaneo si no se encuentra el bastón en 15 segundos
    setTimeout(() => {
      if (bleStatus === "scanning") {
        setBleStatus("disconnected");
        Alert.alert("Bastón no encontrado", "Asegúrate de que el bastón esté encendido y cerca.");
      }
    }, 15000);

  }, [bleStatus, uid, syncBleToFirestore]);

  const handleToggle = useCallback(() => {
    if (isLoading) return;
    if (isTracking) {
      Alert.alert(
        "Detener seguimiento",
        "¿Dejar de enviar la ubicación GPS de tu familiar?",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Detener", style: "destructive", onPress: stopTracking },
        ]
      );
    } else {
      if (!uid) { Alert.alert("Error", "Sesión no encontrada."); return; }
      startTracking(uid);
    }
  }, [isTracking, isLoading, uid, startTracking, stopTracking]);

  const lastTime = lastLocation
    ? new Date(lastLocation.timestamp).toLocaleTimeString("es-MX", {
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      })
    : null;

  // Colores de estado BLE
  const bleColor = {
    disconnected: "#6B7280",
    scanning:     "#F59E0B",
    connecting:   "#3B82F6",
    connected:    "#22C55E",
  }[bleStatus];

  const bleLabel = {
    disconnected: "Bastón desconectado",
    scanning:     "Buscando bastón...",
    connecting:   "Conectando...",
    connected:    "Bastón conectado",
  }[bleStatus];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#030712" }}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 56, paddingBottom: 24 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ color: "#6B7280", fontSize: 13 }}>Bienvenido</Text>
            <Text style={{ color: "white", fontSize: 24, fontWeight: "700", marginTop: 2 }}>
              {userName}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/profile")}
            style={{
              width: 44, height: 44, borderRadius: 22,
              backgroundColor: "#111827", alignItems: "center", justifyContent: "center",
            }}
          >
            <Ionicons name="person-outline" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* â”€â”€ Panel BLE del Bastón â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {role !== "caregiver" && (
      <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
        <TouchableOpacity
          onPress={handleBleToggle}
          activeOpacity={0.85}
          disabled={bleStatus === "scanning" || bleStatus === "connecting"}
          style={{
            borderRadius: 20,
            backgroundColor: bleStatus === "connected" ? "#052e16" : "#0f172a",
            borderWidth: 1.5,
            borderColor: bleColor + "80",
            padding: 18,
          }}
        >
          {/* Fila: título + icono */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="bluetooth" size={18} color={bleColor} />
              <Text style={{ color: bleColor, fontWeight: "600", fontSize: 14 }}>{bleLabel}</Text>
            </View>
            {(bleStatus === "scanning" || bleStatus === "connecting") && (
              <ActivityIndicator size="small" color={bleColor} />
            )}
          </View>

          {/* Batería si está conectado */}
          {bleStatus === "connected" && caneBattery !== null && (
            <BatteryBar percent={caneBattery} />
          )}

          {/* Última alerta */}
          {lastAlert && (
            <View style={{
              marginTop: 10, borderRadius: 10, padding: 10,
              backgroundColor: lastAlert === "SOS" ? "#450a0a" : "#422006",
              borderWidth: 1, borderColor: lastAlert === "SOS" ? "#b91c1c" : "#92400e",
            }}>
              <Text style={{ color: lastAlert === "SOS" ? "#FCA5A5" : "#FCD34D", fontSize: 12, fontWeight: "600" }}>
                {lastAlert === "SOS" ? "🚨 Última alerta: Botón S.O.S presionado" : "⚠️ Última alerta: Caída detectada"}
              </Text>
            </View>
          )}

          {/* Botón de acción */}
          <View style={{
            marginTop: 12, borderRadius: 12, paddingVertical: 11, alignItems: "center",
            backgroundColor: bleStatus === "connected" ? "#14532d" : "#1e3a8a",
          }}>
            <Text style={{ fontWeight: "700", fontSize: 14, color: bleStatus === "connected" ? "#DCFCE7" : "#DBEAFE" }}>
              {bleStatus === "connected" ? "Desconectar bastón"
                : bleStatus === "scanning" ? "Buscando XGIO-Cane-01..."
                : bleStatus === "connecting" ? "Conectando..."
                : "Conectar bastón por Bluetooth"}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
      )}

      {/* â”€â”€ Botón de seguimiento GPS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {role !== "caregiver" && (
      <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
        <TouchableOpacity
          onPress={handleToggle}
          activeOpacity={0.88}
          disabled={isLoading}
          style={{
            borderRadius: 20,
            backgroundColor: isTracking ? "#052e16" : "#0f172a",
            borderWidth: 1.5,
            borderColor: isTracking ? "#16a34a" : "#1e40af",
            padding: 20,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ width: 18, height: 18, alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                {isTracking && !isLoading && <PulseRing />}
                <View style={{
                  width: 10, height: 10, borderRadius: 5,
                  backgroundColor: isLoading ? "#F59E0B" : isTracking ? "#22C55E" : "#374151",
                }} />
              </View>
              <Text style={{
                fontWeight: "600", fontSize: 15,
                color: isLoading ? "#FCD34D" : isTracking ? "#4ADE80" : "#93C5FD",
              }}>
                {isLoading ? "Procesando..." : isTracking ? "Seguimiento activo" : "Seguimiento inactivo"}
              </Text>
            </View>

            {isLoading
              ? <ActivityIndicator size="small" color={isTracking ? "#4ADE80" : "#60A5FA"} />
              : (
                <View style={{
                  width: 38, height: 38, borderRadius: 19,
                  backgroundColor: isTracking ? "#14532d" : "#1e3a8a",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Ionicons name={isTracking ? "stop" : "navigate"} size={16}
                    color={isTracking ? "#4ADE80" : "#93C5FD"} />
                </View>
              )
            }
          </View>

          <Text style={{ fontSize: 13, lineHeight: 20, marginBottom: 14,
            color: isTracking ? "#86EFAC" : "#93C5FD" }}>
            {isLoading
              ? isTracking ? "Deteniendo el envío de ubicaciones..."
                           : "Solicitando permisos GPS..."
              : isTracking
                ? "El teléfono está enviando la ubicación de tu familiar al panel cada 5 segundos."
                : "El celular funciona como rastreador GPS para tu familiar."}
          </Text>

          {isTracking && lastLocation && (
            <View style={{
              borderRadius: 12, padding: 12, marginBottom: 14,
              backgroundColor: "#022c22", borderWidth: 1, borderColor: "#14532d",
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                <Ionicons name="location" size={12} color="#4ADE80" />
                <Text style={{ color: "#4ADE80", fontSize: 11, fontWeight: "600", marginLeft: 4 }}>
                  Última ubicación enviada
                </Text>
              </View>
              <Text style={{ color: "#86EFAC", fontSize: 12, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" }}>
                {lastLocation.latitude.toFixed(6)}, {lastLocation.longitude.toFixed(6)}
              </Text>
              <Text style={{ color: "#166534", fontSize: 11, marginTop: 2 }}>{lastTime}</Text>
            </View>
          )}

          {error && (
            <View style={{
              borderRadius: 12, padding: 12, marginBottom: 14,
              backgroundColor: "#450a0a", borderWidth: 1, borderColor: "#b91c1c",
            }}>
              <Text style={{ color: "#FCA5A5", fontSize: 12 }}>⚠ {error}</Text>
            </View>
          )}

          <View style={{
            borderRadius: 12, paddingVertical: 13, alignItems: "center",
            backgroundColor: isTracking ? "#14532d" : "#1d4ed8",
          }}>
            <Text style={{ fontWeight: "700", fontSize: 15,
              color: isTracking ? "#DCFCE7" : "#DBEAFE" }}>
              {isLoading ? "Espera..." : isTracking ? "Detener seguimiento" : "Iniciar seguimiento"}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
      )}

      {/* â”€â”€ Panel Remoto (Solo Cuidador) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {role === "caregiver" && remoteData && (
        <>
          {remoteData.sos && (
            <View style={{ paddingHorizontal: 24, marginBottom: 20 }}>
              <View style={{
                backgroundColor: "#450a0a", borderWidth: 2, borderColor: "#b91c1c",
                borderRadius: 20, padding: 20, alignItems: "center"
              }}>
                <Ionicons name="warning" size={40} color="#fca5a5" />
                <Text style={{ color: "#fca5a5", fontSize: 20, fontWeight: "bold", marginTop: 10 }}>
                  {remoteData.last_alert === "FALL" ? "¡CAÍDA DETECTADA!" : "¡ALERTA S.O.S!"}
                </Text>
                <Text style={{ color: "#f87171", fontSize: 14, textAlign: "center", marginTop: 6, marginBottom: 16 }}>
                  Tu familiar necesita ayuda inmediata. Revisa su ubicación en el mapa.
                </Text>
                
                <TouchableOpacity
                  onPress={async () => {
                    if (!uid) return;
                    await updateDoc(doc(db, "users", uid), {
                      sos: false,
                      last_alert: null
                    });
                  }}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: "#b91c1c",
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    borderRadius: 12,
                    flexDirection: "row",
                    alignItems: "center"
                  }}
                >
                  <Ionicons name="checkmark-circle-outline" size={20} color="white" style={{ marginRight: 8 }} />
                  <Text style={{ color: "white", fontWeight: "bold", fontSize: 16 }}>Descartar Alerta</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
            <View style={{
              backgroundColor: "#0f172a", borderWidth: 1, borderColor: "#1e3a8a",
              borderRadius: 20, padding: 20
            }}>
              <Text style={{ color: "#94a3b8", fontSize: 12, fontWeight: "700", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>
                ESTADO DEL BASTÓN
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                 <Text style={{ color: "white", fontSize: 15 }}>Conexión BLE:</Text>
                 <Text style={{ color: remoteData.ble_connected ? "#4ade80" : "#f87171", fontWeight: "bold", fontSize: 15 }}>
                   {remoteData.ble_connected ? "Conectado" : "Desconectado"}
                 </Text>
              </View>
              {remoteData.battery !== undefined && (
                 <BatteryBar percent={remoteData.battery} />
              )}
            </View>
          </View>
        </>
      )}

      {/* â”€â”€ Acciones rápidas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {role === "caregiver" && (
      <View style={{ paddingHorizontal: 24 }}>
        <Text style={{ color: "#6B7280", fontSize: 11, fontWeight: "700",
          textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12 }}>
          Acciones rápidas
        </Text>
        <View style={{ flexDirection: "row" }}>
          <QuickBtn icon="today-outline"    label={"Ruta\nde hoy"}      color="#3B82F6"
            onPress={() => router.push("/(tabs)/currentlocation")} />
          <QuickBtn icon="location-outline" label={"Ubicación\nactual"}  color="#8B5CF6"
            onPress={() => router.push("/(tabs)/currentlocation")} />
          <QuickBtn icon="time-outline"     label={"Historial"}          color="#F59E0B"
            onPress={() => router.push("/(tabs)/history")} />
        </View>
      </View>
      )}

      {role !== "caregiver" && isTracking && (
        <View style={{
          marginHorizontal: 24, marginTop: 20, borderRadius: 16,
          padding: 16, backgroundColor: "#0c1221",
          borderWidth: 1, borderColor: "#1e293b",
        }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <Ionicons name="information-circle-outline" size={15} color="#60A5FA" style={{ marginTop: 1 }} />
            <Text style={{ color: "#94A3B8", fontSize: 12, lineHeight: 18, marginLeft: 8, flex: 1 }}>
              {Platform.OS === "android"
                ? "El seguimiento continúa activo aunque cierres la app. Verás una notificación persistente."
                : "El seguimiento continúa en segundo plano. Verás el indicador de ubicación en la barra de estado."}
            </Text>
          </View>
        </View>
      )}

      {/* -- Boton SOS ---------------------------------------------------- */}
      {role !== "caregiver" && (
      <View style={{ paddingHorizontal: 24, marginTop: 20, marginBottom: 8 }}>
        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              "Confirmar emergencia S.O.S",
              "Se enviara una alerta al panel de administracion de XGIO en tiempo real.",
              [
                { text: "Cancelar", style: "cancel" },
                {
                  text: "Enviar SOS",
                  style: "destructive",
                  onPress: async () => {
                    if (!uid) return;
                    try {
                      await updateDoc(doc(db, "users", uid), {
                        last_alert: "SOS",
                        sos: true,
                        sos_timestamp: serverTimestamp(),
                        last_seen: serverTimestamp(),
                      });
                      
                      // Enviar notificación Push al cuidador
                      const snap = await getDoc(doc(db, "users", uid));
                      if (snap.exists() && snap.data().caregiver_push_token) {
                        sendPushNotification(
                          snap.data().caregiver_push_token,
                          "¡ALERTA S.O.S!",
                          "El usuario ha presionado el botón de emergencia."
                        );
                      }
                      
                      Alert.alert("SOS enviado", "El administrador fue notificado.");
                    } catch (e) {
                      Alert.alert("Error", "No se pudo enviar: " + e.message);
                    }
                  },
                },
              ]
            );
          }}
          activeOpacity={0.85}
          style={{
            borderRadius: 20,
            backgroundColor: "#450a0a",
            borderWidth: 2,
            borderColor: "#b91c1c",
            padding: 20,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
          }}
        >
          <View style={{
            width: 52, height: 52, borderRadius: 26,
            backgroundColor: "#dc2626",
            alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{ fontSize: 24 }}>SOS</Text>
          </View>
          <View>
            <Text style={{ color: "#fca5a5", fontWeight: "800", fontSize: 18, letterSpacing: 1 }}>
              BOTON S.O.S
            </Text>
            <Text style={{ color: "#f87171", fontSize: 12, marginTop: 2 }}>
              Presiona en caso de emergencia
            </Text>
          </View>
        </TouchableOpacity>
      </View>
      )}
    </ScrollView>
  );
}
