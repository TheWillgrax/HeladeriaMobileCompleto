import { useEffect, useMemo, useRef, useState } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ImageBackground,
  Animated,
  Easing,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";

const initialState = { email: "", password: "" };
const loginBackground = {
  uri: "https://img.freepik.com/foto-gratis/helado-mesa-arriba_23-2148569415.jpg?semt=ais_hybrid&w=740&q=80",
};

export default function LoginScreen() {
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { login, authenticating } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const animation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animation, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, [animation]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      setError(null);
      await login({ email: form.email.trim(), password: form.password });
      router.replace("/");
    } catch (err) {
      setError(err.message || "No pudimos iniciar sesión. Intenta de nuevo.");
    }
  };

  return (
    <ImageBackground source={loginBackground} resizeMode="cover" style={styles.container}>
      <LinearGradient colors={["rgba(0,0,0,0.4)", "rgba(0,0,0,0.65)"]} style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            {
              opacity: animation,
              transform: [
                {
                  translateY: animation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.title}>Bienvenido a Helados Victoria</Text>
          <Text style={styles.subtitle}>Inicia sesión para ordenar tus sabores favoritos</Text>

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

          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={form.password}
            onChangeText={(text) => handleChange("password", text)}
            placeholder="******"
            placeholderTextColor={colors.textLight}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={authenticating}>
            {authenticating ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Ingresar</Text>}
          </TouchableOpacity>

          <Text style={styles.footerText}>
            ¿Aún no tienes cuenta? {" "}
            <Link href="/(auth)/register" style={styles.linkText}>
              Regístrate aquí
            </Link>
          </Text>
        </Animated.View>
      </LinearGradient>
    </ImageBackground>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
      backgroundColor: "rgba(0,0,0,0.25)",
    },
    card: {
      width: "100%",
      maxWidth: 400,
      backgroundColor: "rgba(255,255,255,0.92)",
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
