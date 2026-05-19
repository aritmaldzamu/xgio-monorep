// app/index.jsx
// Punto de entrada: redirige a /login o /(tabs)/home según si hay token

import { useEffect } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    AsyncStorage.getItem("@user_token").then((token) => {
      if (token) {
        AsyncStorage.getItem("@app_role").then((role) => {
          if (role) {
            router.replace("/(tabs)/home");
          } else {
            router.replace("/role_select");
          }
        });
      } else {
        router.replace("/login");
      }
    });
  }, []);

  return (
    <View className="flex-1 bg-gray-950 items-center justify-center">
      <ActivityIndicator size="large" color="#3B82F6" />
    </View>
  );
}
