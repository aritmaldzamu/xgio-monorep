// app/(tabs)/historyLocationMap.jsx
// Mapa del recorrido de un día específico del historial

import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, TouchableOpacity } from "react-native";
import MapView, { Polyline, Marker } from "react-native-maps";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getPolyline } from "../../lib/api";

// ─── Decodifica polyline de Google Maps ──────────────────────────────────────
// Si tu backend devuelve puntos directamente (no polyline encodificada),
// reemplaza esta función por el mapeo directo.
function decodePolylineToCoords(encoded) {
  const coords = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    coords.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return coords;
}

function getRegion(coords) {
  if (!coords.length) return null;
  const lats = coords.map((c) => c.latitude);
  const lngs = coords.map((c) => c.longitude);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  return {
    latitude:       (minLat + maxLat) / 2,
    longitude:      (minLng + maxLng) / 2,
    latitudeDelta:  Math.max(maxLat - minLat, 0.01) * 1.4,
    longitudeDelta: Math.max(maxLng - minLng, 0.01) * 1.4,
  };
}

function formatDate(dateStr) {
  try {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("es-MX", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  } catch { return dateStr; }
}

export default function HistoryLocationMapScreen() {
  const router = useRouter();
  const { date } = useLocalSearchParams(); // "YYYY-MM-DD"

  const [coords,  setCoords]  = useState([]);
  const [region,  setRegion]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPolyline(date);
      // data.polyline es la polyline encodificada
      // Si tu backend devuelve data.locations (array), usa eso directamente
      let points = [];
      if (data.polyline) {
        points = decodePolylineToCoords(data.polyline);
      } else if (data.locations) {
        points = data.locations.map((p) => ({
          latitude:  p.latitude ?? p.lat,
          longitude: p.longitude ?? p.lng,
        }));
      }
      setCoords(points);
      setRegion(getRegion(points));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [date]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#030712", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ color: "#6B7280", marginTop: 12 }}>Cargando recorrido...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#030712" }}>
      {/* Header con back */}
      <View style={{ paddingHorizontal: 24, paddingTop: 56, paddingBottom: 16 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}
        >
          <Ionicons name="chevron-back" size={20} color="#3B82F6" />
          <Text style={{ color: "#3B82F6", fontWeight: "600", marginLeft: 4 }}>Historial</Text>
        </TouchableOpacity>
        <Text style={{ color: "white", fontSize: 20, fontWeight: "700" }}>
          {formatDate(date)}
        </Text>
        <Text style={{ color: "#6B7280", fontSize: 13, marginTop: 4 }}>
          {coords.length} punto{coords.length !== 1 ? "s" : ""} en este recorrido
        </Text>
      </View>

      {error && (
        <View style={{ marginHorizontal: 24, backgroundColor: "#450a0a",
          borderRadius: 12, padding: 14, marginBottom: 16,
          borderWidth: 1, borderColor: "#b91c1c" }}>
          <Text style={{ color: "#FCA5A5" }}>⚠ {error}</Text>
          <TouchableOpacity onPress={load} style={{ marginTop: 8 }}>
            <Text style={{ color: "#60A5FA", fontWeight: "600" }}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Mapa */}
      {region ? (
        <MapView
          style={{ flex: 1, borderRadius: 20, marginHorizontal: 16, marginBottom: 16 }}
          initialRegion={region}
          userInterfaceStyle="dark"
        >
          <Polyline
            coordinates={coords}
            strokeColor="#3B82F6"
            strokeWidth={4}
          />
          {coords.length > 0 && (
            <Marker coordinate={coords[0]} title="Inicio" pinColor="#22C55E" />
          )}
          {coords.length > 1 && (
            <Marker coordinate={coords[coords.length - 1]} title="Fin" pinColor="#EF4444" />
          )}
        </MapView>
      ) : (
        !error && (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="map-outline" size={52} color="#1F2937" />
            <Text style={{ color: "#6B7280", marginTop: 12 }}>Sin datos para este día</Text>
          </View>
        )
      )}
    </View>
  );
}
