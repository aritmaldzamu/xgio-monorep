// app/register.web.jsx
// Versión WEB — usa localStorage en vez de AsyncStorage, sin Alert nativo, con estilos en línea

import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { registerUser } from "../lib/api";

export default function RegisterScreen() {
  const router = useRouter();
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [caneId,   setCaneId]   = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  
  // Estado de escáner web
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (isScanning) {
      import("html5-qrcode").then(({ Html5QrcodeScanner }) => {
        const scanner = new Html5QrcodeScanner(
          "qr-reader", 
          { fps: 10, qrbox: { width: 250, height: 250 }, supportedScanTypes: [0] }, 
          /* verbose= */ false
        );
        scanner.render(
          (decodedText) => {
            setCaneId(decodedText);
            setIsScanning(false);
            scanner.clear();
          },
          (errorMessage) => {
            // Se ignora porque lanza error por cada frame sin QR
          }
        );
        
        // Cleanup al desmontar o cerrar
        return () => {
          scanner.clear().catch(e => console.log("Failed to clear scanner", e));
        };
      });
    }
  }, [isScanning]);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Ingresa tu nombre, correo y contraseña.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (!caneId.trim()) {
      setError("Debes escanear el QR del bastón.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await registerUser(name.trim(), email.trim().toLowerCase(), password, caneId.trim());
      localStorage.setItem("@user_token", data.token);
      localStorage.removeItem("@cane_id");
      router.replace("/(tabs)/home");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (isScanning) {
    return (
      <View style={{ flex: 1, backgroundColor: "#030712", justifyContent: "center", alignItems: "center", padding: 20 }}>
        <Text style={{ color: "white", fontSize: 18, marginBottom: 20, textAlign: "center" }}>
          Apunta al código QR del bastón
        </Text>
        <View style={{ width: "100%", maxWidth: 400, backgroundColor: "white", borderRadius: 16, overflow: "hidden" }}>
          <div id="qr-reader" style={{ width: "100%" }}></div>
        </View>
        <TouchableOpacity 
          onPress={() => setIsScanning(false)}
          style={{ marginTop: 30, padding: 16, backgroundColor: "#374151", borderRadius: 999 }}
        >
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#030712" }}
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 32, paddingTop: 60, paddingBottom: 40 }}>
        
        {/* Botón Volver */}
        <TouchableOpacity 
          onPress={() => router.back()}
          style={{
            position: "absolute", top: 20, left: 24, zIndex: 10, padding: 8, 
            borderRadius: 9999, backgroundColor: "#111827", 
            borderWidth: 1, borderColor: "#1f2937"
          }}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        {/* Logo / Título */}
        <View style={{ alignItems: "center", marginBottom: 32, marginTop: 40 }}>
          <Text style={{ color: "white", fontSize: 28, fontWeight: "700", letterSpacing: 2, textAlign: "center" }}>
            Crear Cuenta
          </Text>
          <Text style={{ color: "#6B7280", fontSize: 14, marginTop: 8, textAlign: "center" }}>
            Únete a XGIO y mantén seguro a tu ser querido
          </Text>
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

        {/* Nombre */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: "#6B7280", fontSize: 11, fontWeight: "700",
            textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>
            Nombre completo
          </Text>
          <View style={{
            flexDirection: "row", alignItems: "center",
            backgroundColor: "#111827", borderRadius: 16,
            borderWidth: 1, borderColor: "#1f2937", paddingHorizontal: 16,
          }}>
            <Ionicons name="person-outline" size={18} color="#6B7280" />
            <TextInput
              style={{ flex: 1, color: "white", paddingVertical: 16,
                paddingHorizontal: 12, fontSize: 16 }}
              placeholder="Juan Pérez"
              placeholderTextColor="#4B5563"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>
        </View>

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
        <View style={{ marginBottom: 16 }}>
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
              placeholder="Mínimo 6 caracteres"
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

        {/* ID Bastón */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: "#6B7280", fontSize: 11, fontWeight: "700",
            textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>
            ID del Bastón (MAC)
          </Text>
          <View style={{
            flexDirection: "row", alignItems: "center",
            backgroundColor: "#111827", borderRadius: 16,
            borderWidth: 1, borderColor: "#1f2937", paddingHorizontal: 16, paddingVertical: 2
          }}>
            <Ionicons name="hardware-chip-outline" size={18} color="#6B7280" />
            <TextInput
              style={{ flex: 1, color: "white", paddingVertical: 14,
                paddingHorizontal: 12, fontSize: 16, opacity: 0.7 }}
              placeholder="Escanea el código QR"
              placeholderTextColor="#4B5563"
              value={caneId}
              editable={false}
            />
            <TouchableOpacity 
              onPress={() => setIsScanning(true)}
              style={{
                backgroundColor: "rgba(37, 99, 235, 0.2)",
                paddingHorizontal: 16, paddingVertical: 8,
                borderRadius: 12, borderColor: "rgba(59, 130, 246, 0.3)", borderWidth: 1
              }}
            >
              <Ionicons name="qr-code-outline" size={20} color="#3B82F6" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Botón */}
        <TouchableOpacity
          onPress={handleRegister}
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
            : <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>Registrarse</Text>
          }
        </TouchableOpacity>

        {/* Enlace a login */}
        <TouchableOpacity 
          onPress={() => router.push("/login")}
          style={{ marginTop: 24, alignItems: "center" }}
        >
          <Text style={{ color: "#9CA3AF" }}>
            ¿Ya tienes cuenta? <Text style={{ color: "#3B82F6", fontWeight: "700" }}>Inicia sesión aquí</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
