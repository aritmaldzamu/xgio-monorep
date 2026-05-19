// app/login.jsx
// Pantalla de login: llama a POST /login, guarda el JWT y navega a home

import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { loginUser } from "../lib/api";

export default function LoginScreen() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Campos requeridos", "Ingresa tu correo y contraseña.");
      return;
    }
    setLoading(true);
    try {
      // El backend devuelve { token, uid, name, email, cane_id }
      const data = await loginUser(email.trim().toLowerCase(), password);

      // Guardar token (el contexto GPS lo leerá cuando inicie tracking)
      await AsyncStorage.setItem("@user_token", data.token);

      // Limpiar cane_id cacheado por si cambió
      await AsyncStorage.removeItem("@cane_id");

      router.replace("/(tabs)/home");
    } catch (err) {
      Alert.alert("Error al iniciar sesión", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-950"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Logo / cabecera ──────────────────────────────────────────── */}
        <View className="flex-1 justify-center px-8 pt-20 pb-10">
          <View className="items-center mb-12">
            <View className="w-20 h-20 rounded-3xl bg-blue-600 items-center justify-center mb-5 shadow-lg">
              <Ionicons name="walk" size={40} color="white" />
            </View>
            <Text className="text-white text-4xl font-bold tracking-widest">XGIO</Text>
            <Text className="text-gray-400 text-sm mt-1">Bastón inteligente</Text>
          </View>

          {/* ── Formulario ───────────────────────────────────────────────── */}
          <View className="gap-y-4">
            {/* Email */}
            <View>
              <Text className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-2">
                Correo electrónico
              </Text>
              <View className="flex-row items-center bg-gray-900 rounded-2xl border border-gray-800 px-4">
                <Ionicons name="mail-outline" size={18} color="#6B7280" />
                <TextInput
                  className="flex-1 text-white py-4 px-3 text-base"
                  placeholder="correo@ejemplo.com"
                  placeholderTextColor="#4B5563"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Contraseña */}
            <View>
              <Text className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-2">
                Contraseña
              </Text>
              <View className="flex-row items-center bg-gray-900 rounded-2xl border border-gray-800 px-4">
                <Ionicons name="lock-closed-outline" size={18} color="#6B7280" />
                <TextInput
                  className="flex-1 text-white py-4 px-3 text-base"
                  placeholder="••••••••"
                  placeholderTextColor="#4B5563"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                  <Ionicons
                    name={showPass ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Botón */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
              className="bg-blue-600 rounded-2xl py-4 items-center mt-2"
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">Iniciar sesión</Text>
              )}
            </TouchableOpacity>

            {/* Link a registro */}
            <TouchableOpacity 
              onPress={() => router.push("/register")}
              className="mt-6 items-center"
            >
              <Text className="text-gray-400">
                ¿No tienes cuenta? <Text className="text-blue-500 font-bold">Regístrate aquí</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
