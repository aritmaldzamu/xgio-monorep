// app/(tabs)/currentlocation.jsx
// Mapa con la polyline del recorrido del día actual

import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, TouchableOpacity } from "react-native";
import MapView, { Polyline, Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { decode as decodePolyline } from "@mapbox/polyline";
import { getCurrentLocation, getLatestLocation } from "../../lib/api";

// ─── Decodifica polyline encodificada de Google ───────────────────────────────
function decodeGooglePolyline(encoded) {
  try {
    return decodePolyline(encoded).map(([lat, lng]) => ({
      latitude: lat, longitude: lng,
    }));
  } catch {
    return [];
  }
}

// ─── Calcula región centrada en un array de coords ───────────────────────────
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

export default function CurrentLocationScreen() {
  const [coords,  setCoords]  = useState([]);
  const [latest,  setLatest]  = useState(null); // última ubicación
  const [region,  setRegion]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      // Cargar recorrido del día actual y última ubicación en paralelo
      const [locData, latestData] = await Promise.all([
        getCurrentLocation(),
        getLatestLocation(),
      ]);

      // locData.locations es el array de puntos del día
      const points = (locData.locations ?? []).map((p) => ({
        latitude:  p.latitude  ?? p.lat,
        longitude: p.longitude ?? p.lng,
      }));

      setCoords(points);
      setLatest({
        latitude:  latestData.latitude  ?? latestData.lat,
        longitude: latestData.longitude ?? latestData.lng,
      });

      const reg = getRegion(points.length ? points : [latestData]);
      setRegion(reg);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#030712", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ color: "#6B7280", marginTop: 12 }}>Cargando ubicación...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: "#030712", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Ionicons name="warning-outline" size={40} color="#EF4444" />
        <Text style={{ color: "#EF4444", marginTop: 12, textAlign: "center" }}>{error}</Text>
        <TouchableOpacity onPress={load}
          style={{ marginTop: 20, backgroundColor: "#1d4ed8", borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}>
          <Text style={{ color: "white", fontWeight: "600" }}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#030712" }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 56, paddingBottom: 16 }}>
        <Text style={{ color: "#6B7280", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 }}>
          Hoy
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
          <Text style={{ color: "white", fontSize: 22, fontWeight: "700" }}>Recorrido actual</Text>
          <TouchableOpacity onPress={load}>
            <Ionicons name="refresh-outline" size={22} color="#3B82F6" />
          </TouchableOpacity>
        </View>
        <Text style={{ color: "#6B7280", fontSize: 13, marginTop: 4 }}>
          {coords.length} punto{coords.length !== 1 ? "s" : ""} registrado{coords.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* Mapa */}
      {region ? (
        <MapView
          style={{ flex: 1, borderRadius: 20, marginHorizontal: 16, marginBottom: 16 }}
          initialRegion={region}
          userInterfaceStyle="dark"
        >
          {coords.length > 1 && (
            <Polyline
              coordinates={coords}
              strokeColor="#3B82F6"
              strokeWidth={4}
            />
          )}
          {coords.length > 0 && (
            <Marker coordinate={coords[0]} title="Inicio"
              pinColor="#22C55E" />
          )}
          {latest && (
            <Marker coordinate={latest} title="Última ubicación"
              pinColor="#EF4444" />
          )}
        </MapView>
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="location-outline" size={48} color="#374151" />
          <Text style={{ color: "#6B7280", marginTop: 12 }}>Sin datos de ubicación hoy</Text>
        </View>
      )}
    </View>
  );
}
