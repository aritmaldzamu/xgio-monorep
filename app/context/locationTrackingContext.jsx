// context/locationTrackingContext.jsx
// Estado global del seguimiento GPS + task en background

import React, {
  createContext, useContext, useState,
  useCallback, useRef, useEffect,
} from "react";
import * as Location   from "expo-location";
import * as TaskManager from "expo-task-manager";
import AsyncStorage    from "@react-native-async-storage/async-storage";
import { doc, getDoc } from "firebase/firestore";
import { db }          from "../lib/firebase";
import { sendCurrentLocation } from "../lib/api";

// ─── Nombre del task (debe ser único y constante) ─────────────────────────────
export const LOCATION_TASK = "xgio-bg-location";

// ─── Task de background (scope global del módulo, obligatorio en Expo) ────────
// Este bloque se ejecuta en un worker separado cuando la app está en background.
// NO puede acceder a estado React; usa AsyncStorage para leer token y cane_id.
TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error("[BG Task]", error.message);
    return;
  }
  const location = data?.locations?.[0];
  if (!location) return;

  try {
    const caneId = await AsyncStorage.getItem("@cane_id");
    if (!caneId) return;

    await sendCurrentLocation(
      location.coords.latitude,
      location.coords.longitude,
      caneId
    );
    console.log("[BG Task] ✓ Ubicación enviada");
  } catch (err) {
    console.error("[BG Task] Error al enviar:", err.message);
  }
});

// ─── Contexto ─────────────────────────────────────────────────────────────────
const Ctx = createContext(null);

export function LocationTrackingProvider({ children }) {
  const [isTracking,  setIsTracking]  = useState(false);
  const [isLoading,   setIsLoading]   = useState(false);
  const [lastLocation, setLastLocation] = useState(null); // {lat, lng, ts}
  const [error,       setError]       = useState(null);

  const intervalRef = useRef(null); // foreground fallback

  // Al montar: sincronizar estado con task activo (por si la app se reinició)
  useEffect(() => {
    (async () => {
      try {
        const active = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
        setIsTracking(active);
      } catch {}
    })();
  }, []);

  // ── Obtener y cachear cane_id desde Firestore ────────────────────────────
  const fetchCaneId = useCallback(async (uid) => {
    const cached = await AsyncStorage.getItem("@cane_id");
    if (cached) return cached;

    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) throw new Error("Usuario no encontrado en Firestore");

    const caneId = snap.data().cane_id;
    if (!caneId) throw new Error("El usuario no tiene cane_id asignado");

    await AsyncStorage.setItem("@cane_id", caneId);
    return caneId;
  }, []);

  // ── Enviar ubicación (usado en modo foreground) ──────────────────────────
  const sendFg = useCallback(async () => {
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const caneId = await AsyncStorage.getItem("@cane_id");
      if (!caneId) return;

      await sendCurrentLocation(
        pos.coords.latitude,
        pos.coords.longitude,
        caneId
      );
      setLastLocation({
        latitude:  pos.coords.latitude,
        longitude: pos.coords.longitude,
        timestamp: Date.now(),
      });
      setError(null);
    } catch (err) {
      setError("Error al enviar ubicación");
      console.error("[FG]", err.message);
    }
  }, []);

  // ── startTracking(uid) ───────────────────────────────────────────────────
  const startTracking = useCallback(async (uid) => {
    if (isTracking || isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      // 1. Cachear cane_id
      await fetchCaneId(uid);

      // 2. Permiso foreground
      const { status: fg } = await Location.requestForegroundPermissionsAsync();
      if (fg !== "granted") throw new Error("Permiso de ubicación denegado");

      // 3. Permiso background
      const { status: bg } = await Location.requestBackgroundPermissionsAsync();
      const hasBackground = bg === "granted";

      if (hasBackground) {
        // ── Modo background ──────────────────────────────────────────────
        const running = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
        if (!running) {
          await Location.startLocationUpdatesAsync(LOCATION_TASK, {
            accuracy:     Location.Accuracy.Balanced,
            timeInterval: 5_000,
            distanceInterval: 0,
            showsBackgroundLocationIndicator: true,
            foregroundService: {
              notificationTitle: "XGIO – Seguimiento activo",
              notificationBody:  "Enviando ubicación cada 5 segundos",
              notificationColor: "#3B82F6",
            },
            pausesUpdatesAutomatically: false,
          });
        }
      } else {
        // ── Modo foreground (fallback) ────────────────────────────────────
        await sendFg();
        intervalRef.current = setInterval(sendFg, 5_000);
      }

      setIsTracking(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [isTracking, isLoading, fetchCaneId, sendFg]);

  // ── stopTracking() ───────────────────────────────────────────────────────
  const stopTracking = useCallback(async () => {
    if (!isTracking || isLoading) return;
    setIsLoading(true);

    try {
      // Detener background task si está activo
      const running = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
      if (running) await Location.stopLocationUpdatesAsync(LOCATION_TASK);

      // Limpiar interval de foreground
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      setIsTracking(false);
      setLastLocation(null);
      setError(null);
    } catch (err) {
      setError("Error al detener el seguimiento");
    } finally {
      setIsLoading(false);
    }
  }, [isTracking, isLoading]);

  return (
    <Ctx.Provider value={{ isTracking, isLoading, lastLocation, error, startTracking, stopTracking }}>
      {children}
    </Ctx.Provider>
  );
}

export function useLocationTracking() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLocationTracking requiere <LocationTrackingProvider>");
  return ctx;
}
