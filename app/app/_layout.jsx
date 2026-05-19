import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LocationTrackingProvider } from "../context/locationTrackingContext";

export default function RootLayout() {
  return (
    <LocationTrackingProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </LocationTrackingProvider>
  );
}