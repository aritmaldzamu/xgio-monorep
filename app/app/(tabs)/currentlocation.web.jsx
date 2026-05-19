// app/(tabs)/currentlocation.web.jsx
// Versión WEB — usa Google Maps JavaScript API

import { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getCurrentLocation, getLatestLocation } from "../../lib/api";

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || "";

function loadGoogleMaps() {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) return resolve();
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function CurrentLocationScreen() {
  const mapRef  = useRef(null);
  const mapObj  = useRef(null);
  const [coords,  setCoords]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [locData, latestData] = await Promise.all([
        getCurrentLocation(),
        getLatestLocation(),
      ]);

      const points = (locData.locations ?? []).map((p) => ({
        lat: p.latitude ?? p.lat,
        lng: p.longitude ?? p.lng,
      }));

      const latest = {
        lat: latestData.latitude ?? latestData.lat,
        lng: latestData.longitude ?? latestData.lng,
      };

      setCoords(points);
      await loadGoogleMaps();

      const center = points.length ? points[points.length - 1] : latest;
      const map = new window.google.maps.Map(mapRef.current, {
        center,
        zoom: 16,
        styles: darkMapStyle,
        disableDefaultUI: false,
      });
      mapObj.current = map;

      if (points.length > 1) {
        new window.google.maps.Polyline({
          path: points,
          geodesic: true,
          strokeColor: "#3B82F6",
          strokeOpacity: 1.0,
          strokeWeight: 4,
          map,
        });
        new window.google.maps.Marker({ position: points[0], map, title: "Inicio",
          icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 8,
            fillColor: "#22C55E", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 } });
      }

      new window.google.maps.Marker({ position: latest, map, title: "Última ubicación",
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 10,
          fillColor: "#EF4444", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 } });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#030712" }}>
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

      {loading && (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={{ color: "#6B7280", marginTop: 12 }}>Cargando mapa...</Text>
        </View>
      )}

      {error && !loading && (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <Text style={{ color: "#EF4444", textAlign: "center" }}>{error}</Text>
          <TouchableOpacity onPress={load}
            style={{ marginTop: 20, backgroundColor: "#1d4ed8", borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}>
            <Text style={{ color: "white", fontWeight: "600" }}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      <div
        ref={mapRef}
        style={{ flex: 1, display: loading || error ? "none" : "block",
          marginHorizontal: 16, marginBottom: 16, borderRadius: 20, overflow: "hidden", minHeight: 400 }}
      />
    </View>
  );
}

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
];
