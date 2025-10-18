import { memo, useCallback, useMemo } from "react";
import { Alert, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";

const WHATSAPP_MESSAGE = "Hola Helados Victoria! Quisiera más información.";

const SOCIAL_LINKS = [
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: "logo-whatsapp",
    colors: ["#25D366", "#128C7E"],
    url: `https://wa.me/50241338903?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`,
  },
  {
    key: "instagram",
    label: "Instagram",
    icon: "logo-instagram",
    colors: ["#F58529", "#DD2A7B"],
    url: "https://www.instagram.com/heladosvictoria",
  },
  {
    key: "facebook",
    label: "Facebook",
    icon: "logo-facebook",
    colors: ["#1877F2", "#0F5AD2"],
    url: "https://www.facebook.com/heladosvictoria",
  },
];

const openLink = async (url) => {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      throw new Error("No se pudo abrir el enlace");
    }
    await Linking.openURL(url);
  } catch (error) {
    Alert.alert(
      "No se pudo abrir",
      "Intenta nuevamente o revisa tu conexión a internet."
    );
    console.warn("No se pudo abrir el enlace de red social", error?.message || error);
  }
};

const SocialFloatingButtons = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handlePress = useCallback((url) => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && typeof window.open === "function") {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        openLink(url);
      }
      return;
    }
    openLink(url);
  }, []);

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.container} pointerEvents="box-none">
        {SOCIAL_LINKS.map((link) => (
          <TouchableOpacity
            key={link.key}
            activeOpacity={0.9}
            onPress={() => handlePress(link.url)}
            style={styles.buttonShadow}
          >
            <LinearGradient
              colors={link.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.button}
            >
              <Ionicons name={link.icon} size={22} color="#fff" />
              <Text style={styles.label}>{link.label}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "flex-end",
      alignItems: "flex-end",
      padding: 16,
    },
    container: {
      gap: 12,
      alignItems: "flex-end",
    },
    buttonShadow: {
      shadowColor: colors.shadow,
      shadowOpacity: 0.25,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 8,
      borderRadius: 999,
    },
    button: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 18,
      borderRadius: 999,
      minWidth: 150,
      justifyContent: "center",
      gap: 10,
    },
    label: {
      color: "#fff",
      fontWeight: "700",
      letterSpacing: 0.3,
    },
  });

export default memo(SocialFloatingButtons);
