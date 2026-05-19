// app/(tabs)/profile.jsx
// Perfil del usuario con datos del JWT y opción de cerrar sesión

import { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { jwtDecode } from "jwt-decode";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useLocationTracking } from "../../context/locationTrackingContext";

// ─── Fila de dato de perfil ───────────────────────────────────────────────────
function DataRow({ icon, label, value }) {
  return (
    <View style={{
      flexDirection: "row", alignItems: "center",
      paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#1e293b",
    }}>
      <View style={{
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: "#1e293b", alignItems: "center", justifyContent: "center",
        marginRight: 14,
      }}>
        <Ionicons name={icon} size={17} color="#6B7280" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: "#6B7280", fontSize: 11, fontWeight: "600",
          textTransform: "uppercase", letterSpacing: 0.8 }}>
          {label}
        </Text>
        <Text style={{ color: "white", fontSize: 14, marginTop: 2 }}>
          {value ?? "—"}
        </Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const router  = useRouter();
  const [user,  setUser]  = useState(null);
  const [caneId, setCaneId] = useState(null);

  const { isTracking, stopTracking } = useLocationTracking();

  // Cargar datos del usuario
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const token = await AsyncStorage.getItem("@user_token");
        if (!token) return;

        const decoded = jwtDecode(token);
        setUser(decoded);

        // Cargar cane_id desde Firestore
        const uid = decoded.uid ?? decoded.sub;
        if (uid) {
          const cached = await AsyncStorage.getItem("@cane_id");
          if (cached) {
            setCaneId(cached);
          } else {
            const snap = await getDoc(doc(db, "users", uid));
            if (snap.exists()) {
              const id = snap.data().cane_id;
              setCaneId(id);
              if (id) await AsyncStorage.setItem("@cane_id", id);
            }
          }
        }
      } catch (err) {
        console.error("[Profile]", err.message);
      }
    };
    loadProfile();
  }, []);

  // Cerrar sesión
  const handleLogout = () => {
    Alert.alert(
      "Cerrar sesión",
      isTracking
        ? "Tienes el seguimiento GPS activo. Al cerrar sesión se detendrá automáticamente."
        : "¿Deseas cerrar tu sesión?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar sesión",
          style: "destructive",
          onPress: async () => {
            if (isTracking) await stopTracking();
            await AsyncStorage.multiRemove(["@user_token", "@cane_id"]);
            router.replace("/login");
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#030712" }}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 56, paddingBottom: 24 }}>
        <Text style={{ color: "#6B7280", fontSize: 12, fontWeight: "700",
          textTransform: "uppercase", letterSpacing: 1 }}>
          XGIO
        </Text>
        <Text style={{ color: "white", fontSize: 24, fontWeight: "700", marginTop: 4 }}>
          Mi perfil
        </Text>
      </View>

      {/* Avatar */}
      <View style={{ alignItems: "center", marginBottom: 32 }}>
        <View style={{
          width: 80, height: 80, borderRadius: 40,
          backgroundColor: "#1e3a8a", alignItems: "center", justifyContent: "center",
          borderWidth: 2, borderColor: "#2563eb",
        }}>
          <Ionicons name="person" size={38} color="#60A5FA" />
        </View>
        <Text style={{ color: "white", fontSize: 18, fontWeight: "700", marginTop: 12 }}>
          {user?.name ?? user?.email?.split("@")[0] ?? "Usuario"}
        </Text>
        {isTracking && (
          <View style={{
            flexDirection: "row", alignItems: "center", marginTop: 6,
            backgroundColor: "#052e16", borderRadius: 20,
            paddingHorizontal: 12, paddingVertical: 4,
          }}>
            <View style={{ width: 7, height: 7, borderRadius: 3.5,
              backgroundColor: "#22C55E", marginRight: 6 }} />
            <Text style={{ color: "#4ADE80", fontSize: 12, fontWeight: "600" }}>
              Seguimiento activo
            </Text>
          </View>
        )}
      </View>

      {/* Datos */}
      <View style={{ marginHorizontal: 24, backgroundColor: "#0f172a",
        borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#1e293b" }}>
        <DataRow icon="mail-outline"     label="Correo"       value={user?.email} />
        <DataRow icon="walk-outline"     label="ID del bastón" value={caneId} />
        <DataRow icon="key-outline"      label="UID"          value={user?.uid ?? user?.sub} />
      </View>

      {/* Cerrar sesión y Cambiar Rol */}
      <View style={{ marginHorizontal: 24, marginTop: 24, gap: 12 }}>
        <TouchableOpacity
          onPress={async () => {
            await AsyncStorage.removeItem("@app_role");
            router.replace("/role_select");
          }}
          activeOpacity={0.8}
          style={{
            backgroundColor: "#1e293b", borderRadius: 16,
            padding: 16, alignItems: "center", flexDirection: "row",
            justifyContent: "center", borderWidth: 1, borderColor: "#334155",
          }}
        >
          <Ionicons name="swap-horizontal" size={20} color="#94a3b8" style={{ marginRight: 8 }} />
          <Text style={{ color: "#94a3b8", fontWeight: "700", fontSize: 15 }}>
            Cambiar de Rol
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.8}
          style={{
            backgroundColor: "#450a0a", borderRadius: 16,
            padding: 16, alignItems: "center", flexDirection: "row",
            justifyContent: "center", borderWidth: 1, borderColor: "#b91c1c",
          }}
        >
          <Ionicons name="log-out-outline" size={20} color="#FCA5A5" style={{ marginRight: 8 }} />
          <Text style={{ color: "#FCA5A5", fontWeight: "700", fontSize: 15 }}>
            Cerrar sesión
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
