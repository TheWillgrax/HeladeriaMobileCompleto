import { useMemo } from "react";
import { Redirect, Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useTheme } from "@/contexts/ThemeContext";

const TabsLayout = () => {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const { itemCount } = useCart();
  const { colors } = useTheme();

  const styles = useMemo(() => createStyles(colors), [colors]);

  if (loading) return null;

  if (!user) return <Redirect href="/(auth)/login" />;

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/(auth)/login");
    } catch (error) {
      console.warn("No se pudo cerrar sesión", error?.message);
    }
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTitle: "Helados Victoria",
        headerTitleAlign: "center",
        headerTintColor: colors.white,
        headerBackground: () => (
          <LinearGradient
            colors={[colors.primary, colors.accent]}
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        ),
        headerTitleStyle: {
          fontWeight: "800",
          fontSize: 18,
          letterSpacing: 0.5,
        },
        headerRight: () => (
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={20} color={colors.white} />
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </TouchableOpacity>
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 78,
          shadowColor: colors.shadow,
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -2 },
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          letterSpacing: 0.2,
        },
        tabBarItemStyle: {
          paddingVertical: 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, size }) => <Ionicons name="ice-cream" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: "Carta",
          tabBarIcon: ({ color, size }) => <Ionicons name="restaurant" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Carrito",
          tabBarIcon: ({ color, size }) => (
            <View style={styles.iconWrapper}>
              <Ionicons name="cart" size={size} color={color} />
              {itemCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{itemCount}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Pedidos",
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Config",
          tabBarIcon: ({ color, size }) => <Ionicons name="color-palette" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          href: user.role === "admin" ? undefined : null,
          title: "Admin",
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
};
export default TabsLayout;

const createStyles = (colors) =>
  StyleSheet.create({
    logoutButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    logoutText: {
      color: colors.white,
      fontWeight: "600",
      fontSize: 14,
      marginLeft: 6,
    },
    iconWrapper: {
      position: "relative",
    },
    badge: {
      position: "absolute",
      top: -6,
      right: -12,
      backgroundColor: colors.primary,
      borderRadius: 10,
      minWidth: 20,
      paddingHorizontal: 6,
      paddingVertical: 2,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeText: {
      color: colors.white,
      fontSize: 10,
      fontWeight: "700",
    },
  });
