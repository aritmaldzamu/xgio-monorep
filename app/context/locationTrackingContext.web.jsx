// context/locationTrackingContext.web.jsx
// Versión WEB — usa navigator.geolocation del navegador

import React, {
  createContext, useContext, useState,
  useCallback, useRef,
} from "react";
import { sendCurrentLocation } from "../lib/api";

export const LOCATION_TASK = "xgio-bg-location"; // no se usa en web, solo para compatibilidad

const Ctx = createContext(null);

export function LocationTrackingProvider({ children }) {
  const [isTracking,   setIsTracking]   = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);
  const [lastLocation, setLastLocation] = useState(null);
  const [error,        setError]        = useState(null);

  const intervalRef = useRef(null);
  const caneIdRef   = useRef(null);

  const fetchCaneId = useCallback(async (uid) => {
    if (caneIdRef.current) return caneIdRef.current;
    // En web leemos de localStorage
    const cached = localStorage.getItem("@cane_id");
    if (cached) { caneIdRef.current = cached; return cached; }

    // Si no está en cache, lo pedimos a Firestore via API
    const { doc, getDoc } = await import("firebase/firestore");
    const { db } = await import("../lib/firebase");
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) throw new Error("Usuario no encontrado en Firestore");
    const caneId = snap.data().cane_id;
    if (!caneId) throw new Error("El usuario no tiene cane_id asignado");
    localStorage.setItem("@cane_id", caneId);
    caneIdRef.current = caneId;
    return caneId;
  }, []);

  const sendPosition = useCallback(async () => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const caneId = caneIdRef.current || localStorage.getItem("@cane_id");
            if (!caneId) return resolve();
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
            resolve();
          } catch (err) {
            setError("Error al enviar ubicación");
            resolve();
          }
        },
        (err) => {
          setError("GPS no disponible: " + err.message);
          resolve();
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, []);

  const startTracking = useCallback(async (uid) => {
    if (isTracking || isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      if (!navigator.geolocation) throw new Error("Este navegador no soporta GPS");

      // Pedir permiso explícito
      const perm = await navigator.permissions?.query({ name: "geolocation" });
      if (perm?.state === "denied") throw new Error("Permiso de ubicación denegado");

      await fetchCaneId(uid);
      await sendPosition(); // envío inmediato

      intervalRef.current = setInterval(sendPosition, 5_000);
      setIsTracking(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [isTracking, isLoading, fetchCaneId, sendPosition]);

  const stopTracking = useCallback(async () => {
    if (!isTracking || isLoading) return;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsTracking(false);
    setLastLocation(null);
    setError(null);
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
