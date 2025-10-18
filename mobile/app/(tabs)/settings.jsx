import { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";

const THEME_OPTIONS = [
  {
    key: "light",
    title: "Modo claro",
    description: "Fondos suaves con texto oscuro para una lectura cómoda durante el día.",
  },
  {
    key: "dark",
    title: "Modo oscuro",
    description: "Un contraste alto para navegar de noche o en ambientes con poca luz.",
  },
];

export default function SettingsScreen() {
  const { colors, theme, setTheme, toggleTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Configuración</Text>
      <Text style={styles.subtitle}>Personaliza cómo se ve Helados Victoria en tu dispositivo.</Text>

      <LinearGradient
        colors={[colors.surface || colors.background, colors.card]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroBanner}
      >
        <Text style={styles.heroTitle}>Tu experiencia, a tu estilo</Text>
        <Text style={styles.heroDescription}>
          Alterna entre tonos claros y oscuros para disfrutar de la carta en cualquier momento del día.
        </Text>
      </LinearGradient>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Apariencia</Text>
        <Text style={styles.sectionDescription}>
          Puedes alternar entre los modos claro y oscuro en cualquier momento. La preferencia se guardará para
          tus próximas visitas.
        </Text>

        <View style={styles.optionList}>
          {THEME_OPTIONS.map((option) => {
            const active = theme === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                style={[styles.optionCard, active && styles.optionCardActive]}
                onPress={() => setTheme(option.key)}
              >
                <Text style={[styles.optionTitle, active && styles.optionTitleActive]}>{option.title}</Text>
                <Text style={[styles.optionDescription, active && styles.optionDescriptionActive]}>
                  {option.description}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.toggleButton} onPress={toggleTheme}>
          <Text style={styles.toggleButtonText}>
            Cambiar a modo {theme === "light" ? "oscuro" : "claro"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      padding: 24,
      gap: 24,
      backgroundColor: colors.background,
      paddingBottom: 48,
    },
    title: {
      fontSize: 26,
      fontWeight: "800",
      color: colors.text,
    },
    subtitle: {
      color: colors.textLight,
      fontSize: 14,
      lineHeight: 20,
    },
    heroBanner: {
      borderRadius: 24,
      padding: 20,
      marginTop: 16,
      gap: 8,
      shadowColor: colors.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
      borderWidth: 1,
      borderColor: colors.border,
    },
    heroTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    heroDescription: {
      color: colors.textLight,
      lineHeight: 20,
    },
    section: {
      gap: 16,
      marginTop: 24,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
    },
    sectionDescription: {
      color: colors.textLight,
      fontSize: 14,
      lineHeight: 20,
    },
    optionList: {
      gap: 12,
    },
    optionCard: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 18,
      gap: 6,
      shadowColor: colors.shadow,
      shadowOpacity: 0.05,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    optionCardActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
      shadowOpacity: 0.12,
      shadowRadius: 12,
    },
    optionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    optionTitleActive: {
      color: colors.white,
    },
    optionDescription: {
      color: colors.textLight,
      fontSize: 13,
    },
    optionDescriptionActive: {
      color: colors.white,
    },
    toggleButton: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: "center",
      shadowColor: colors.shadow,
      shadowOpacity: 0.12,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    toggleButtonText: {
      color: colors.white,
      fontWeight: "700",
      fontSize: 16,
    },
  });
