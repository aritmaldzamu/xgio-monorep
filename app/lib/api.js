// lib/api.js
// Todas las llamadas al backend Flask con JWT automático

import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

// ── Headers con JWT ────────────────────────────────────────────────────────────
async function getHeaders() {
  const token = await AsyncStorage.getItem("@user_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ── GET ────────────────────────────────────────────────────────────────────────
export async function apiGet(endpoint) {
  const headers = await getHeaders();
  const res = await fetch(`${BASE_URL}${endpoint}`, { headers });

  if (res.status === 401) {
    await AsyncStorage.removeItem("@user_token");
    router.replace("/login");
    throw new Error("Sesión expirada");
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GET ${endpoint} → HTTP ${res.status}: ${body}`);
  }
  return res.json();
}

// ── POST ───────────────────────────────────────────────────────────────────────
export async function apiPost(endpoint, body) {
  const headers = await getHeaders();
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (res.status === 401) {
    await AsyncStorage.removeItem("@user_token");
    router.replace("/login");
    throw new Error("Sesión expirada");
  }

  if (!res.ok) {
    const b = await res.text();
    throw new Error(`POST ${endpoint} → HTTP ${res.status}: ${b}`);
  }
  return res.json();
}

// ── Endpoints específicos ──────────────────────────────────────────────────────

/** POST /login → { token, uid, name, email, cane_id } */
export const loginUser = (email, password) =>
  apiPost("/login", { email, password });

/** POST /register → { token, uid, name, email, cane_id } */
export const registerUser = (name, email, password, cane_id) =>
  apiPost("/register", { name, email, password, cane_id });

/** POST /send-current-location */
export const sendCurrentLocation = (latitude, longitude, cane_id) =>
  apiPost("/send-current-location", { latitude, longitude, cane_id });

/** GET /get-latest-location → { latitude, longitude, timestamp } */
export const getLatestLocation = () =>
  apiGet("/get-latest-location");

/** GET /get-polyline?date=YYYY-MM-DD → { polyline: "..." } */
export const getPolyline = (date) =>
  apiGet(`/get-polyline?date=${date}`);

/** GET /get-routes → [{ date: "YYYY-MM-DD", count: N }, ...] */
export const getRoutes = () =>
  apiGet("/get-routes");

/** GET /get-current-location → { locations: [{lat, lng, ts}, ...] } */
export const getCurrentLocation = () =>
  apiGet("/get-current-location");
