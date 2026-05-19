// app/(tabs)/history.jsx
// Lista de días con recorridos registrados

import { useEffect, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getRoutes } from "../../lib/api";

// ─── Formatea "2025-03-10" → "Lun 10 de marzo, 2025" ────────────────────────
function formatDate(dateStr) {
  try {
    const d = new Date(dateStr + "T12:00:00"); // T12 evita problemas de zona horaria
    return d.toLocaleDateString("es-MX", {
      weekday: "short", day: "numeric", month: "long", year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// ─── Determina si una fecha es hoy ───────────────────────────────────────────
function isToday(dateStr) {
  return new Date().toISOString().slice(0, 10) === dateStr;
}

// ─── Fila de un día ───────────────────────────────────────────────────────────
function DayRow({ item, onPress }) {
  const today = isToday(item.date);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        flexDirection: "row", alignItems: "center",
        backgroundColor: "#0f172a", borderRadius: 16,
        padding: 16, marginBottom: 10,
        borderWidth: 1, borderColor: today ? "#1e40af" : "#1e293b",
      }}
    >
      {/* Ícono */}
      <View style={{
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: today ? "#1e3a8a" : "#1e293b",
        alignItems: "center", justifyContent: "center", marginRight: 14,
      }}>
        <Ionicons name="map-outline" size={22} color={today ? "#60A5FA" : "#6B7280"} />
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        {today && (
          <Text style={{ color: "#60A5FA", fontSize: 10, fontWeight: "700",
            textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>
            Hoy
          </Text>
        )}
        <Text style={{ color: "white", fontWeight: "600", fontSize: 14 }}>
          {formatDate(item.date)}
        </Text>
        <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 2 }}>
          {item.count ?? "—"} punto{(item.count ?? 0) !== 1 ? "s" : ""} registrado{(item.count ?? 0) !== 1 ? "s" : ""}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#374151" />
    </TouchableOpacity>
  );
}

// ─── Pantalla ─────────────────────────────────────────────────────────────────
export default function HistoryScreen() {
  const router = useRouter();
  const [routes,     setRoutes]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState(null);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getRoutes();
      // El backend devuelve [{ date: "YYYY-MM-DD", count: N }, ...]
      // Ordenar de más reciente a más antiguo
      const sorted = [...(data ?? [])].sort((a, b) =>
        b.date.localeCompare(a.date)
      );
      setRoutes(sorted);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#030712", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#030712" }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 56, paddingBottom: 20 }}>
        <Text style={{ color: "#6B7280", fontSize: 12, fontWeight: "700",
          textTransform: "uppercase", letterSpacing: 1 }}>
          XGIO
        </Text>
        <Text style={{ color: "white", fontSize: 24, fontWeight: "700", marginTop: 4 }}>
          Historial
        </Text>
        <Text style={{ color: "#6B7280", fontSize: 13, marginTop: 4 }}>
          {routes.length} día{routes.length !== 1 ? "s" : ""} con recorridos
        </Text>
      </View>

      {error && (
        <View style={{ marginHorizontal: 24, backgroundColor: "#450a0a",
          borderRadius: 12, padding: 14, marginBottom: 16,
          borderWidth: 1, borderColor: "#b91c1c" }}>
          <Text style={{ color: "#FCA5A5", fontSize: 13 }}>⚠ {error}</Text>
        </View>
      )}

      <FlatList
        data={routes}
        keyExtractor={(item) => item.date}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor="#3B82F6"
          />
        }
        renderItem={({ item }) => (
          <DayRow
            item={item}
            onPress={() =>
              router.push({
                pathname: "/(tabs)/historyLocationMap",
                params: { date: item.date },
              })
            }
          />
        )}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingTop: 60 }}>
            <Ionicons name="map-outline" size={52} color="#1F2937" />
            <Text style={{ color: "#6B7280", marginTop: 16, fontSize: 15 }}>
              Sin recorridos registrados
            </Text>
          </View>
        }
      />
    </View>
  );
}
