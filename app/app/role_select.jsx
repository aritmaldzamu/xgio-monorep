// app/role_select.jsx
import { View, Text, TouchableOpacity, Image } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

export default function RoleSelectScreen() {
  const router = useRouter();

  const handleSelectRole = async (role) => {
    try {
      await AsyncStorage.setItem("@app_role", role);
      router.replace("/(tabs)/home");
    } catch (e) {
      console.error("Error saving role", e);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#030712", padding: 24, justifyContent: "center" }}>
      <View style={{ alignItems: "center", marginBottom: 40 }}>
        <View style={{ width: 80, height: 80, backgroundColor: "#1f2937", borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <Ionicons name="people" size={40} color="#60a5fa" />
        </View>
        <Text style={{ color: "white", fontSize: 28, fontWeight: "bold", textAlign: "center", marginBottom: 10 }}>
          ¿Quién usará este teléfono?
        </Text>
        <Text style={{ color: "#9ca3af", fontSize: 15, textAlign: "center", lineHeight: 22 }}>
          Selecciona tu rol para adaptar la pantalla principal y mostrar solo las herramientas que necesitas.
        </Text>
      </View>

      <View style={{ gap: 20 }}>
        {/* Caregiver Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleSelectRole("caregiver")}
          style={{
            backgroundColor: "#0f172a",
            borderWidth: 2,
            borderColor: "#1e3a8a",
            borderRadius: 20,
            padding: 24,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: "#1e3a8a", alignItems: "center", justifyContent: "center", marginRight: 16 }}>
            <Ionicons name="eye" size={24} color="#93c5fd" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "white", fontSize: 18, fontWeight: "bold", marginBottom: 4 }}>
              Soy el Cuidador
            </Text>
            <Text style={{ color: "#94a3b8", fontSize: 13, lineHeight: 18 }}>
              Quiero monitorear la ubicación remota y recibir alertas S.O.S de mi familiar.
            </Text>
          </View>
        </TouchableOpacity>

        {/* Patient Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleSelectRole("patient")}
          style={{
            backgroundColor: "#052e16",
            borderWidth: 2,
            borderColor: "#14532d",
            borderRadius: 20,
            padding: 24,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: "#14532d", alignItems: "center", justifyContent: "center", marginRight: 16 }}>
            <Ionicons name="walk" size={24} color="#86efac" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "white", fontSize: 18, fontWeight: "bold", marginBottom: 4 }}>
              Soy el Usuario (Bastón)
            </Text>
            <Text style={{ color: "#86efac", fontSize: 13, lineHeight: 18 }}>
              Llevaré este celular conmigo para enviar mi GPS y enlazar el bastón inteligente.
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}
