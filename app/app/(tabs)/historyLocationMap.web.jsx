// app/(tabs)/historyLocationMap.web.jsx
// Versión WEB — usa Google Maps JavaScript API

import { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getPolyline } from "../../lib/api";

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
    coords.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return coords;
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
  const { date } = useLocalSearchParams();
  const mapRef = useRef(null);
  const [coords,  setCoords]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPolyline(date);
      let points = [];
      if (data.polyline) {
        points = decodePolylineToCoords(data.polyline);
      } else if (data.locations) {
        points = data.locations.map((p) => ({
          lat: p.latitude ?? p.lat,
          lng: p.longitude ?? p.lng,
        }));
      }
      setCoords(points);
      await loadGoogleMaps();

      if (!points.length) { setLoading(false); return; }

      const bounds = new window.google.maps.LatLngBounds();
      points.forEach((p) => bounds.extend(p));

      const map = new window.google.maps.Map(mapRef.current, {
        center: bounds.getCenter(),
        zoom: 15,
        styles: darkMapStyle,
      });
      map.fitBounds(bounds);

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
      new window.google.maps.Marker({ position: points[points.length - 1], map, title: "Fin",
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 8,
          fillColor: "#EF4444", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 } });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [date]);

  return (
    <View style={{ flex: 1, backgroundColor: "#030712" }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 56, paddingBottom: 16 }}>
        <TouchableOpacity onPress={() => router.back()}
          style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <Ionicons name="chevron-back" size={20} color="#3B82F6" />
          <Text style={{ color: "#3B82F6", fontWeight: "600", marginLeft: 4 }}>Historial</Text>
        </TouchableOpacity>
        <Text style={{ color: "white", fontSize: 20, fontWeight: "700" }}>{formatDate(date)}</Text>
        <Text style={{ color: "#6B7280", fontSize: 13, marginTop: 4 }}>
          {coords.length} punto{coords.length !== 1 ? "s" : ""} en este recorrido
        </Text>
      </View>

      {loading && (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={{ color: "#6B7280", marginTop: 12 }}>Cargando recorrido...</Text>
        </View>
      )}

      {error && !loading && (
        <View style={{ marginHorizontal: 24, backgroundColor: "#450a0a",
          borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#b91c1c" }}>
          <Text style={{ color: "#FCA5A5" }}>⚠ {error}</Text>
          <TouchableOpacity onPress={load} style={{ marginTop: 8 }}>
            <Text style={{ color: "#60A5FA", fontWeight: "600" }}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      <div
        ref={mapRef}
        style={{ flex: 1, display: loading || error ? "none" : "block",
          marginLeft: 16, marginRight: 16, marginBottom: 16,
          borderRadius: 20, overflow: "hidden", minHeight: 400 }}
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
