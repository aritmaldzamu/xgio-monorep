// app/login.web.jsx
// Versión WEB — usa localStorage en vez de AsyncStorage, sin Alert nativo

import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { loginUser } from "../lib/api";

export default function LoginScreen() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Ingresa tu correo y contraseña.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await loginUser(email.trim().toLowerCase(), password);
      localStorage.setItem("@user_token", data.token);
      localStorage.removeItem("@cane_id");
      router.replace("/(tabs)/home");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#030712" }}
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 32, paddingTop: 80, paddingBottom: 40 }}>
        {/* Logo */}
        <View style={{ alignItems: "center", marginBottom: 48 }}>
          <View style={{
            width: 80, height: 80, borderRadius: 24,
            backgroundColor: "#2563EB", alignItems: "center", justifyContent: "center", marginBottom: 20,
          }}>
            <Ionicons name="walk" size={40} color="white" />
          </View>
          <Text style={{ color: "white", fontSize: 36, fontWeight: "700", letterSpacing: 6 }}>XGIO</Text>
          <Text style={{ color: "#6B7280", fontSize: 14, marginTop: 4 }}>Bastón inteligente</Text>
        </View>

        {/* Error */}
        {error && (
          <View style={{
            backgroundColor: "#450a0a", borderRadius: 12, padding: 14,
            marginBottom: 16, borderWidth: 1, borderColor: "#b91c1c",
          }}>
            <Text style={{ color: "#FCA5A5", fontSize: 13 }}>⚠ {error}</Text>
          </View>
        )}

        {/* Email */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: "#6B7280", fontSize: 11, fontWeight: "700",
            textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>
            Correo electrónico
          </Text>
          <View style={{
            flexDirection: "row", alignItems: "center",
            backgroundColor: "#111827", borderRadius: 16,
            borderWidth: 1, borderColor: "#1f2937", paddingHorizontal: 16,
          }}>
            <Ionicons name="mail-outline" size={18} color="#6B7280" />
            <TextInput
              style={{ flex: 1, color: "white", paddingVertical: 16,
                paddingHorizontal: 12, fontSize: 16 }}
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
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: "#6B7280", fontSize: 11, fontWeight: "700",
            textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>
            Contraseña
          </Text>
          <View style={{
            flexDirection: "row", alignItems: "center",
            backgroundColor: "#111827", borderRadius: 16,
            borderWidth: 1, borderColor: "#1f2937", paddingHorizontal: 16,
          }}>
            <Ionicons name="lock-closed-outline" size={18} color="#6B7280" />
            <TextInput
              style={{ flex: 1, color: "white", paddingVertical: 16,
                paddingHorizontal: 12, fontSize: 16 }}
              placeholder="••••••••"
              placeholderTextColor="#4B5563"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)}>
              <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Botón */}
        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
          style={{
            backgroundColor: "#2563EB", borderRadius: 16,
            paddingVertical: 16, alignItems: "center",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading
            ? <ActivityIndicator color="white" />
            : <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>Iniciar sesión</Text>
          }
        </TouchableOpacity>

        {/* Link a registro */}
        <TouchableOpacity 
          onPress={() => router.push("/register")}
          style={{ marginTop: 24, alignItems: "center" }}
        >
          <Text style={{ color: "#9CA3AF" }}>
            ¿No tienes cuenta? <Text style={{ color: "#3B82F6", fontWeight: "700" }}>Regístrate aquí</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
