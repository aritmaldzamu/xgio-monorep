// app/(tabs)/home.web.jsx
// Versión WEB — sin expo-location ni Alert nativo

import { useEffect, useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { jwtDecode } from "jwt-decode";
import { useLocationTracking } from "../../context/locationTrackingContext";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";

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

export default function HomeScreen() {
  const router = useRouter();
  const [uid,      setUid]      = useState(null);
  const [userName, setUserName] = useState("Usuario");
  const [confirm,  setConfirm]  = useState(false);
  const [sosModal, setSosModal] = useState(false);   // modal confirmación SOS
  const [sosSent,  setSosSent]  = useState(false);   // feedback enviado
  const [sosSending, setSosSending] = useState(false);

  const { isTracking, isLoading, lastLocation, error, startTracking, stopTracking } =
    useLocationTracking();

  useEffect(() => {
    const token = localStorage.getItem("@user_token");
    if (!token) { router.replace("/login"); return; }
    try {
      const d = jwtDecode(token);
      setUid(d.uid ?? d.sub ?? null);
      setUserName(d.name ?? d.email?.split("@")[0] ?? "Usuario");
    } catch {
      router.replace("/login");
    }
  }, []);

  const handleToggle = useCallback(() => {
    if (isLoading) return;
    if (isTracking) {
      setConfirm(true);
    } else {
      if (!uid) return;
      startTracking(uid);
    }
  }, [isTracking, isLoading, uid, startTracking]);

  // ── Enviar alerta SOS a Firestore ────────────────────────────────────────
  const handleSOS = useCallback(async () => {
    if (!uid || sosSending) return;
    setSosSending(true);
    try {
      await updateDoc(doc(db, "users", uid), {
        last_alert:    "SOS",
        sos:           true,
        sos_timestamp: serverTimestamp(),
        last_seen:     serverTimestamp(),
      });
      setSosSent(true);
      setSosModal(false);
      setTimeout(() => setSosSent(false), 5000);
    } catch (e) {
      console.error("SOS error:", e);
    } finally {
      setSosSending(false);
    }
  }, [uid, sosSending]);

  const lastTime = lastLocation
    ? new Date(lastLocation.timestamp).toLocaleTimeString("es-MX", {
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      })
    : null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#030712" }}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Modal: Detener seguimiento ── */}
      {confirm && (
        <View style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "#000000aa", zIndex: 100,
          alignItems: "center", justifyContent: "center",
        }}>
          <View style={{
            backgroundColor: "#111827", borderRadius: 20, padding: 24,
            marginHorizontal: 32, borderWidth: 1, borderColor: "#1f2937",
          }}>
            <Text style={{ color: "white", fontSize: 17, fontWeight: "700", marginBottom: 8 }}>
              Detener seguimiento
            </Text>
            <Text style={{ color: "#9CA3AF", fontSize: 14, marginBottom: 20 }}>
              ¿Dejar de enviar tu ubicación GPS?
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12 }}>
              <TouchableOpacity onPress={() => setConfirm(false)}
                style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
                  backgroundColor: "#1f2937" }}>
                <Text style={{ color: "#9CA3AF", fontWeight: "600" }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setConfirm(false); stopTracking(); }}
                style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
                  backgroundColor: "#7f1d1d" }}>
                <Text style={{ color: "#FCA5A5", fontWeight: "600" }}>Detener</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ── Modal: Confirmar SOS ── */}
      {sosModal && (
        <View style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "#00000099", zIndex: 100,
          alignItems: "center", justifyContent: "center",
        }}>
          <View style={{
            backgroundColor: "#1a0000", borderRadius: 24, padding: 28,
            marginHorizontal: 24, borderWidth: 2, borderColor: "#b91c1c",
            alignItems: "center",
          }}>
            <View style={{
              width: 64, height: 64, borderRadius: 32,
              backgroundColor: "#450a0a", alignItems: "center",
              justifyContent: "center", marginBottom: 16,
            }}>
              <Text style={{ fontSize: 32 }}>🚨</Text>
            </View>
            <Text style={{ color: "white", fontSize: 20, fontWeight: "800", marginBottom: 8, textAlign: "center" }}>
              ¿Confirmar emergencia?
            </Text>
            <Text style={{ color: "#FCA5A5", fontSize: 14, textAlign: "center", marginBottom: 24, lineHeight: 20 }}>
              Se enviará una alerta S.O.S al panel de administración de XGIO en tiempo real.
            </Text>
            <View style={{ flexDirection: "row", gap: 12, width: "100%" }}>
              <TouchableOpacity
                onPress={() => setSosModal(false)}
                style={{
                  flex: 1, paddingVertical: 14, borderRadius: 12,
                  backgroundColor: "#1f2937", alignItems: "center",
                }}
              >
                <Text style={{ color: "#9CA3AF", fontWeight: "700", fontSize: 15 }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSOS}
                disabled={sosSending}
                style={{
                  flex: 1, paddingVertical: 14, borderRadius: 12,
                  backgroundColor: sosSending ? "#7f1d1d" : "#dc2626",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "white", fontWeight: "800", fontSize: 15 }}>
                  {sosSending ? "Enviando..." : "🚨 Enviar SOS"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

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

      {/* Botón de seguimiento */}
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
              <View style={{
                width: 10, height: 10, borderRadius: 5, marginRight: 10,
                backgroundColor: isLoading ? "#F59E0B" : isTracking ? "#22C55E" : "#374151",
              }} />
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
              ? "Solicitando permisos GPS..."
              : isTracking
                ? "El navegador está enviando la ubicación al bastón cada 5 segundos."
                : "Usa el teléfono como fuente GPS sin necesitar el bastón físico."}
          </Text>

          {isTracking && lastLocation && (
            <View style={{
              borderRadius: 12, padding: 12, marginBottom: 14,
              backgroundColor: "#022c22", borderWidth: 1, borderColor: "#14532d",
            }}>
              <Text style={{ color: "#4ADE80", fontSize: 11, fontWeight: "600", marginBottom: 4 }}>
                📍 Última ubicación enviada
              </Text>
              <Text style={{ color: "#86EFAC", fontSize: 12, fontFamily: "monospace" }}>
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

      {/* ── SOS Feedback banner ── */}
      {sosSent && (
        <View style={{
          marginHorizontal: 24, marginBottom: 12, borderRadius: 14,
          padding: 14, backgroundColor: "#450a0a",
          borderWidth: 1.5, borderColor: "#b91c1c",
          flexDirection: "row", alignItems: "center", gap: 10,
        }}>
          <Text style={{ fontSize: 20 }}>🚨</Text>
          <View>
            <Text style={{ color: "#fca5a5", fontWeight: "700", fontSize: 14 }}>Alerta S.O.S enviada</Text>
            <Text style={{ color: "#f87171", fontSize: 12, marginTop: 2 }}>El administrador fue notificado en tiempo real.</Text>
          </View>
        </View>
      )}

      {/* ── Botón SOS ── */}
      <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
        <TouchableOpacity
          onPress={() => setSosModal(true)}
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
            width: 48, height: 48, borderRadius: 24,
            backgroundColor: "#dc2626",
            alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{ fontSize: 22 }}>🆘</Text>
          </View>
          <View>
            <Text style={{ color: "#fca5a5", fontWeight: "800", fontSize: 18, letterSpacing: 1 }}>BOTÓN S.O.S</Text>
            <Text style={{ color: "#f87171", fontSize: 12, marginTop: 2 }}>Presiona en caso de emergencia</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Acciones rápidas */}
      <View style={{ paddingHorizontal: 24 }}>
        <Text style={{ color: "#6B7280", fontSize: 11, fontWeight: "700",
          textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12 }}>
          Acciones rápidas
        </Text>
        <View style={{ flexDirection: "row" }}>
          <QuickBtn icon="today-outline"    label={"Ruta\nde hoy"}     color="#3B82F6"
            onPress={() => router.push("/(tabs)/currentlocation")} />
          <QuickBtn icon="location-outline" label={"Ubicación\nactual"} color="#8B5CF6"
            onPress={() => router.push("/(tabs)/currentlocation")} />
          <QuickBtn icon="time-outline"     label={"Historial"}         color="#F59E0B"
            onPress={() => router.push("/(tabs)/history")} />
        </View>
      </View>

      {isTracking && (
        <View style={{
          marginHorizontal: 24, marginTop: 20, borderRadius: 16,
          padding: 16, backgroundColor: "#0c1221",
          borderWidth: 1, borderColor: "#1e293b",
        }}>
          <Text style={{ color: "#94A3B8", fontSize: 12, lineHeight: 18 }}>
            ℹ️ El seguimiento funciona mientras Safari esté abierto. Para mejor precisión mantén la pantalla encendida.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
