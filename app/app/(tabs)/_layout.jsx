import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

function TabIcon({ name, color, size }) {
  return <Ionicons name={name} size={size} color={color} />;
}

export default function TabsLayout() {
  const [role, setRole] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem("@app_role").then(setRole);
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#111827",
          borderTopColor: "#1F2937",
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor:   "#3B82F6",
        tabBarInactiveTintColor: "#6B7280",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="currentlocation"
        options={{
          title: "Ubicación",
          href: role === "patient" ? null : "/(tabs)/currentlocation",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="location-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Historial",
          href: role === "patient" ? null : "/(tabs)/history",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="time-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="person-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="historyLocationMap"
        options={{ href: null }}
      />
    </Tabs>
  );
}