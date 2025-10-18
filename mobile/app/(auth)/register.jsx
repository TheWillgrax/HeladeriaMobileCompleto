import { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { Link, useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

const initialState = { name: "", email: "", phone: "", password: "" };

export default function RegisterScreen() {
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { register, authenticating } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      setError(null);
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
      });
      router.replace("/");
    } catch (err) {
      setError(err.message || "No pudimos crear tu cuenta. Intenta de nuevo.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.title}>Únete a Helados Victoria</Text>
        <Text style={styles.subtitle}>Regístrate para gestionar tu carrito y recibir promociones</Text>

        <Text style={styles.label}>Nombre completo</Text>
        <TextInput
          style={styles.input}
          value={form.name}
          onChangeText={(text) => handleChange("name", text)}
          placeholder="Ej. Mariana López"
          placeholderTextColor={colors.textLight}
        />

        <Text style={styles.label}>Correo electrónico</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={form.email}
          onChangeText={(text) => handleChange("email", text)}
          placeholder="tucorreo@ejemplo.com"
          placeholderTextColor={colors.textLight}
        />

        <Text style={styles.label}>Teléfono</Text>
        <TextInput
          style={styles.input}
          keyboardType="phone-pad"
          value={form.phone}
          onChangeText={(text) => handleChange("phone", text)}
          placeholder="55 1234 5678"
          placeholderTextColor={colors.textLight}
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={form.password}
          onChangeText={(text) => handleChange("password", text)}
          placeholder="Mínimo 6 caracteres"
          placeholderTextColor={colors.textLight}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={authenticating}>
          {authenticating ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Crear cuenta</Text>}
        </TouchableOpacity>

        <Text style={styles.footerText}>
          ¿Ya tienes cuenta? {" "}
          <Link href="/(auth)/login" style={styles.linkText}>
            Inicia sesión
          </Link>
        </Text>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
      backgroundColor: colors.background,
    },
    card: {
      width: "100%",
      maxWidth: 420,
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 24,
      shadowColor: colors.shadow,
      shadowOpacity: 0.1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    title: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 8,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 14,
      color: colors.textLight,
      textAlign: "center",
      marginBottom: 24,
    },
    label: {
      color: colors.text,
      marginBottom: 6,
      fontWeight: "600",
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      color: colors.text,
      marginBottom: 16,
      backgroundColor: colors.white,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 8,
    },
    buttonText: {
      color: colors.white,
      fontWeight: "700",
      fontSize: 16,
    },
    footerText: {
      marginTop: 20,
      color: colors.text,
      textAlign: "center",
    },
    linkText: {
      color: colors.accent,
      fontWeight: "700",
    },
    error: {
      color: colors.error,
      marginBottom: 12,
      textAlign: "center",
    },
  });
