// app/register.jsx
// Pantalla de registro: llama a POST /register, guarda el JWT y navega a home

import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert, ScrollView, Modal, StyleSheet
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { registerUser } from "../lib/api";

export default function RegisterScreen() {
  const router = useRouter();
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [caneId,   setCaneId]   = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  
  // Estado de la cámara
  const [isScanning, setIsScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Campos requeridos", "Ingresa tu nombre, correo y contraseña.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Contraseña muy corta", "La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (!caneId.trim()) {
      Alert.alert("Bastón requerido", "Debes escanear el QR del bastón para registrarte.");
      return;
    }
    setLoading(true);
    try {
      // El backend devuelve { success, message, token, uid, name, email, cane_id }
      const data = await registerUser(name.trim(), email.trim().toLowerCase(), password, caneId.trim());

      // Guardar token (el contexto GPS lo leerá cuando inicie tracking)
      await AsyncStorage.setItem("@user_token", data.token);

      // Limpiar cane_id cacheado por si cambió o se definió uno nuevo
      await AsyncStorage.removeItem("@cane_id");

      // Navegar a home
      router.replace("/(tabs)/home");
    } catch (err) {
      Alert.alert("Error al registrar", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleScanQR = async () => {
    if (!permission) return;
    if (!permission.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert("Permiso denegado", "Necesitamos acceso a la cámara para escanear el QR.");
        return;
      }
    }
    setIsScanning(true);
  };

  const handleBarCodeScanned = ({ type, data }) => {
    setCaneId(data);
    setIsScanning(false);
  };

  if (isScanning) {
    return (
      <View style={StyleSheet.absoluteFillObject}>
        <CameraView 
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
        />
        <View className="absolute top-14 right-6 z-10">
          <TouchableOpacity 
            onPress={() => setIsScanning(false)}
            className="p-3 rounded-full bg-gray-900 border border-gray-800"
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>
        <View className="absolute bottom-1/4 left-0 right-0 items-center">
          <View className="bg-black/70 px-6 py-3 rounded-full">
            <Text className="text-white text-base">Apunta al código QR del bastón</Text>
          </View>
        </View>
      </View>
    );
  }

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
        {/* ── Botón Volver ─────────────────────────────────────────────── */}
        <TouchableOpacity 
          onPress={() => router.back()}
          className="absolute top-14 left-6 z-10 p-2 rounded-full bg-gray-900 border border-gray-800"
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        {/* ── Logo / cabecera ──────────────────────────────────────────── */}
        <View className="flex-1 justify-center px-8 pt-24 pb-10">
          <View className="items-center mb-8">
            <Text className="text-white text-3xl font-bold tracking-widest text-center">
              Crear Cuenta
            </Text>
            <Text className="text-gray-400 text-sm mt-2 text-center">
              Únete a XGIO y mantén seguro a tu ser querido
            </Text>
          </View>

          {/* ── Formulario ───────────────────────────────────────────────── */}
          <View className="gap-y-4">
            {/* Nombre */}
            <View>
              <Text className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-2">
                Nombre completo
              </Text>
              <View className="flex-row items-center bg-gray-900 rounded-2xl border border-gray-800 px-4">
                <Ionicons name="person-outline" size={18} color="#6B7280" />
                <TextInput
                  className="flex-1 text-white py-4 px-3 text-base"
                  placeholder="Juan Pérez"
                  placeholderTextColor="#4B5563"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </View>

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
                  placeholder="Mínimo 6 caracteres"
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

            {/* ID Bastón */}
            <View>
              <Text className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-2">
                ID del Bastón (MAC)
              </Text>
              <View className="flex-row items-center bg-gray-900 rounded-2xl border border-gray-800 px-4 py-1">
                <Ionicons name="hardware-chip-outline" size={18} color="#6B7280" />
                <TextInput
                  className="flex-1 text-white py-3 px-3 text-base opacity-70"
                  placeholder="Escanea el código QR"
                  placeholderTextColor="#4B5563"
                  value={caneId}
                  editable={false}
                />
                <TouchableOpacity 
                  onPress={handleScanQR}
                  className="bg-blue-600/20 px-4 py-2 rounded-xl border border-blue-500/30"
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
              className="bg-blue-600 rounded-2xl py-4 items-center mt-2"
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">Registrarse</Text>
              )}
            </TouchableOpacity>
            
            {/* Enlace para volver a iniciar sesión */}
            <TouchableOpacity 
              onPress={() => router.push("/login")}
              className="mt-6 items-center"
            >
              <Text className="text-gray-400">
                ¿Ya tienes cuenta? <Text className="text-blue-500 font-bold">Inicia sesión aquí</Text>
              </Text>
            </TouchableOpacity>
            
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
