import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
import { useRouter } from "expo-router";
import { catalogApi, orderApi, resolveImageUrl } from "@/services/api";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { formatCurrency, normaliseStatus, toNumber } from "@/utils/format";
import SocialFloatingButtons from "@/components/SocialFloatingButtons";

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const heroImage = {
  uri: "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=500&q=60",
};
const fallbackProductImage = "https://images.unsplash.com/photo-1488900128323-21503983a07e?auto=format&fit=crop&w=600&q=60";

const withOpacity = (hexColor, alpha = 1) => {
  if (!hexColor) return `rgba(255,255,255,${alpha})`;
  const hex = hexColor.replace("#", "");
  const bigint = parseInt(hex, 16);
  if (Number.isNaN(bigint)) {
    return `rgba(255,255,255,${alpha})`;
  }
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getProductImage = (imageUrl) => {
  const resolved = resolveImageUrl(imageUrl);
  return { uri: resolved || fallbackProductImage };
};

const ORDER_STATUS_LABELS = {
  pending: "Pendiente",
  paid: "Pagado",
  cancelled: "Cancelado",
};

const getStatusLabel = (status) => ORDER_STATUS_LABELS[normaliseStatus(status)] || status || "Desconocido";

export default function HomeScreen() {
  const router = useRouter();
  const { addItem } = useCart();
  const { token, user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const heroAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(0)).current;
  const heroShimmer = useRef(new Animated.Value(0)).current;
  const statsAnimations = useRef([]);
  const categoryAnimations = useRef([]);
  const featuredAnimations = useRef([]);

  const heroGradientColors = useMemo(
    () => [withOpacity(colors.primary, 0.95), withOpacity(colors.accent, 0.9)],
    [colors.primary, colors.accent],
  );
  const statGradients = useMemo(
    () => [
      [withOpacity(colors.white, 0.8), withOpacity(colors.white, 0.3)],
      [withOpacity(colors.accent, 0.45), withOpacity(colors.primary, 0.35)],
      [withOpacity(colors.primary, 0.45), withOpacity(colors.accent, 0.35)],
    ],
    [colors.white, colors.accent, colors.primary],
  );
  const categoryGradients = useMemo(
    () => [
      [withOpacity(colors.primary, 0.85), withOpacity(colors.primary, 0.5)],
      [withOpacity(colors.accent, 0.85), withOpacity(colors.accent, 0.5)],
    ],
    [colors.primary, colors.accent],
  );

  useEffect(() => {
    Animated.timing(heroAnimation, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 0,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(heroShimmer, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(heroShimmer, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    shimmerLoop.start();

    return () => {
      loop.stop();
      shimmerLoop.stop();
    };
  }, [heroAnimation, pulseAnimation, heroShimmer]);

  const stats = useMemo(() => {
    if (!user) {
      return [
        {
          id: "flavors",
          label: "Sabores artesanales",
          value: "40+",
          description: "Recetas creadas a mano cada semana.",
        },
        {
          id: "delivery",
          label: "Entrega promedio",
          value: "25 min",
          description: "Desde nuestra heladería a tu puerta.",
        },
        {
          id: "rating",
          label: "Clientes felices",
          value: "4.9★",
          description: "Basado en reseñas de la comunidad.",
        },
      ];
    }

    const ordersCount = orders.length;
    const totalSpent = orders.reduce(
      (sum, order) => sum + toNumber(order?.totals?.total ?? order.total ?? 0),
      0
    );
    const itemCounter = new Map();
    orders.forEach((order) => {
      order.items?.forEach((item) => {
        const current = itemCounter.get(item.name) || 0;
        itemCounter.set(item.name, current + (item.quantity || 0));
      });
    });
    const [favoriteName] = Array.from(itemCounter.entries()).sort((a, b) => b[1] - a[1])[0] || [];

    return [
      {
        id: "orders",
        label: "Pedidos realizados",
        value: `${ordersCount}`,
        description: ordersCount ? "Helados listos para disfrutar." : "Haz tu primer pedido helado.",
      },
      {
        id: "spent",
        label: "Total disfrutado",
        value: ordersCount ? formatCurrency(totalSpent) : formatCurrency(0),
        description: ordersCount ? "Gracias por tu preferencia." : "Explora nuestros sabores favoritos.",
      },
      {
        id: "favorite",
        label: "Sabor destacado",
        value: favoriteName || "Por descubrir",
        description: favoriteName ? "Basado en tus últimas compras." : "Añade algo a tu carrito hoy.",
      },
    ];
  }, [orders, user]);

  const bubbleScale = pulseAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });
  const bubbleOpacity = pulseAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.55],
  });
  const heroImageFloat = pulseAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });

  useEffect(() => {
    if (!stats.length) {
      return;
    }
    statsAnimations.current = stats.map((_, index) => statsAnimations.current[index] || new Animated.Value(0));
    statsAnimations.current.forEach((anim) => anim.setValue(0));
    Animated.stagger(
      120,
      statsAnimations.current.map((anim) =>
        Animated.spring(anim, { toValue: 1, friction: 8, tension: 65, useNativeDriver: true })
      )
    ).start();
  }, [stats]);

  useEffect(() => {
    if (!categories.length) {
      return;
    }
    categoryAnimations.current = categories.map(
      (_, index) => categoryAnimations.current[index] || new Animated.Value(0)
    );
    categoryAnimations.current.forEach((anim) => anim.setValue(0));
    Animated.stagger(
      120,
      categoryAnimations.current.map((anim) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 480,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      )
    ).start();
  }, [categories]);

  useEffect(() => {
    if (!featured.length) {
      return;
    }
    featuredAnimations.current = featured.map(
      (_, index) => featuredAnimations.current[index] || new Animated.Value(0)
    );
    featuredAnimations.current.forEach((anim) => anim.setValue(0));
    Animated.stagger(
      140,
      featuredAnimations.current.map((anim) =>
        Animated.spring(anim, { toValue: 1, friction: 9, tension: 70, useNativeDriver: true })
      )
    ).start();
  }, [featured]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [catRes, prodRes] = await Promise.all([catalogApi.categories(), catalogApi.products()]);
        setCategories(catRes.categories?.slice(0, 4) || []);
        setFeatured(prodRes.products?.slice(0, 6) || []);
      } catch (err) {
        setError(err.message || "No pudimos cargar la información");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    const loadOrders = async () => {
      if (!token) {
        setOrders([]);
        return;
      }
      try {
        const response = await orderApi.myOrders(token);
        setOrders(response.orders?.slice(0, 3) || []);
      } catch (err) {
        console.warn("No se pudieron cargar los pedidos", err?.message);
      }
    };

    loadOrders();
  }, [token]);

  const handleAddToCart = async (productId) => {
    try {
      await addItem({ productId, quantity: 1 });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
      <Animated.View
        style={[
          styles.hero,
          {
            opacity: heroAnimation,
            transform: [
              {
                translateY: heroAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [24, 0],
                }),
              },
              {
                scale: heroAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.96, 1],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient colors={heroGradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroGradient}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.heroGlow,
              {
                opacity: bubbleOpacity,
                transform: [{ scale: bubbleScale }],
              },
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.heroShimmer,
              {
                opacity: heroShimmer.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 0.45, 0],
                }),
                transform: [
                  { translateX: heroShimmer.interpolate({ inputRange: [0, 1], outputRange: [-160, 220] }) },
                ],
              },
            ]}
          />
          <View style={styles.heroText}>
            <View style={styles.heroChip}>
              <Text style={styles.heroChipText}>Nueva temporada</Text>
            </View>
            <Text style={styles.heroTitle}>Sabores hechos con amor mexicano</Text>
            <Text style={styles.heroSubtitle}>
              Descubre nuestras combinaciones de temporada, paletas artesanales y malteadas cremosas.
            </Text>
            <View style={styles.heroActions}>
              <TouchableOpacity style={styles.primaryButton} onPress={() => router.push("/(tabs)/menu")}>
                <LinearGradient
                  colors={[withOpacity(colors.white, 0.25), withOpacity(colors.white, 0.05)]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryButtonGradient}
                >
                  <Text style={styles.primaryButtonText}>Explorar carta</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push("/(tabs)/cart")}>
                <Text style={styles.secondaryButtonText}>Ver carrito</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Animated.View style={[styles.heroImageWrapper, { transform: [{ translateY: heroImageFloat }] }]}>
            <View style={styles.heroImageBackdrop} />
            <Image source={heroImage} style={styles.heroImage} resizeMode="contain" />
          </Animated.View>
        </LinearGradient>
      </Animated.View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
        {stats.map((stat, index) => {
          const animatedValue = statsAnimations.current[index];
          const translateY = animatedValue
            ? animatedValue.interpolate({ inputRange: [0, 1], outputRange: [20, 0] })
            : 0;
          const scale = animatedValue
            ? animatedValue.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] })
            : 1;

          return (
            <Animated.View
              key={stat.id}
              style={[
                styles.statsCardWrapper,
                {
                  opacity: animatedValue || 1,
                  transform: [{ translateY }, { scale }],
                },
              ]}
            >
              <LinearGradient
                colors={statGradients[index % statGradients.length]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statsCard}
              >
                <Text style={styles.statsValue}>{stat.value}</Text>
                <Text style={styles.statsLabel}>{stat.label}</Text>
                <Text style={styles.statsDescription}>{stat.description}</Text>
              </LinearGradient>
            </Animated.View>
          );
        })}
      </ScrollView>

      {loading && (
        <View style={styles.loadingWrapper}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      {!loading && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categorías populares</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/menu")}>
              <Text style={styles.sectionLink}>Ver todas</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {categories.map((category, index) => {
              const animatedValue = categoryAnimations.current[index];
              const translateY = animatedValue
                ? animatedValue.interpolate({ inputRange: [0, 1], outputRange: [28, 0] })
                : 0;
              const scale = animatedValue
                ? animatedValue.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] })
                : 1;

              return (
                <AnimatedTouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryCardWrapper,
                    {
                      opacity: animatedValue || 1,
                      transform: [{ translateY }, { scale }],
                    },
                  ]}
                  activeOpacity={0.92}
                  onPress={() =>
                    router.push({ pathname: "/(tabs)/menu", params: { categoryId: category.id, categoryName: category.name } })
                  }
                >
                  <LinearGradient
                    colors={categoryGradients[index % categoryGradients.length]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.categoryCard}
                  >
                    <Text style={styles.categoryName}>{category.name}</Text>
                    <Text style={styles.categoryDescription} numberOfLines={2}>
                      {category.description || "Una deliciosa selección para ti."}
                    </Text>
                    <View style={styles.categoryAction}>
                      <Text style={styles.categoryActionText}>Descubrir</Text>
                      <Text style={styles.categoryActionArrow}>→</Text>
                    </View>
                  </LinearGradient>
                </AnimatedTouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recomendados para ti</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/menu")}>
              <Text style={styles.sectionLink}>Ver menú completo</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productRow}>
            {featured.map((product, index) => {
              const animatedValue = featuredAnimations.current[index];
              const translateY = animatedValue
                ? animatedValue.interpolate({ inputRange: [0, 1], outputRange: [30, 0] })
                : 0;
              const scale = animatedValue
                ? animatedValue.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] })
                : 1;

              return (
                <Animated.View
                  key={product.id}
                  style={[
                    styles.productCard,
                    {
                      opacity: animatedValue || 1,
                      transform: [{ translateY }, { scale }],
                    },
                  ]}
                >
                  <View style={styles.productImageWrapper}>
                    <Image source={getProductImage(product.image_url)} style={styles.productImage} />
                    <View style={styles.productBadge}>
                      <Text style={styles.productBadgeText}>#{index + 1} Top</Text>
                    </View>
                  </View>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productDescription} numberOfLines={2}>
                    {product.description}
                  </Text>
                  <View style={styles.productFooter}>
                    <Text style={styles.productPrice}>{formatCurrency(product.price)}</Text>
                    <TouchableOpacity style={styles.addButton} onPress={() => handleAddToCart(product.id)}>
                      <LinearGradient
                        colors={[colors.accent, colors.primary]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.addButtonInner}
                      >
                        <Text style={styles.addButtonText}>Añadir</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              );
            })}
          </ScrollView>

          {user && (
            <View style={styles.ordersSection}>
              <View style={styles.sectionHeaderAlt}>
                <Text style={styles.sectionTitle}>Tus últimos pedidos</Text>
                <TouchableOpacity onPress={() => router.push("/(tabs)/orders")}>
                  <Text style={styles.sectionLink}>Ver historial</Text>
                </TouchableOpacity>
              </View>
              {orders.length === 0 ? (
                <Text style={styles.emptyText}>Aún no has realizado pedidos. ¡Haz tu primera orden helada!</Text>
              ) : (
                orders.map((order) => {
                  const orderTotal = toNumber(order?.totals?.total ?? order.total ?? 0);
                  const statusLabel = getStatusLabel(order.status);
                  const gradient = [withOpacity(colors.card, 0.95), withOpacity(colors.accent, 0.15)];
                  return (
                    <LinearGradient
                      key={order.id}
                      colors={gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.orderCard}
                    >
                      <View style={styles.orderHeader}>
                        <Text style={styles.orderId}>Orden #{order.id}</Text>
                        <Text style={styles.orderStatus}>{statusLabel}</Text>
                      </View>
                      <Text style={styles.orderTotal}>Total: {formatCurrency(orderTotal)}</Text>
                      <View style={styles.orderItems}>
                        {order.items?.map((item) => (
                          <Text key={item.id} style={styles.orderItem}>
                            {item.quantity}x {item.name}
                          </Text>
                        ))}
                      </View>
                    </LinearGradient>
                  );
                })
              )}
            </View>
          )}
        </>
      )}
      </ScrollView>
      <SocialFloatingButtons />
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
    },
    container: {
      paddingBottom: 40,
      backgroundColor: colors.background,
    },
    hero: {
      marginHorizontal: 20,
      marginTop: 16,
      borderRadius: 32,
      overflow: "visible",
    },
    heroGradient: {
      borderRadius: 32,
      padding: 24,
      flexDirection: "row",
      alignItems: "center",
      overflow: "hidden",
    },
    heroGlow: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 32,
      backgroundColor: withOpacity(colors.white, 0.25),
    },
    heroShimmer: {
      position: "absolute",
      top: -60,
      right: -120,
      width: 180,
      height: 260,
      borderRadius: 90,
      backgroundColor: withOpacity(colors.white, 0.45),
      transform: [{ rotate: "-18deg" }],
      opacity: 0.3,
    },
    heroText: {
      flex: 1,
    },
    heroChip: {
      alignSelf: "flex-start",
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderRadius: 999,
      backgroundColor: withOpacity(colors.white, 0.22),
    },
    heroChipText: {
      color: colors.white,
      fontWeight: "700",
      fontSize: 12,
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    heroTitle: {
      fontSize: 30,
      fontWeight: "800",
      color: colors.white,
      lineHeight: 36,
      marginTop: 12,
    },
    heroSubtitle: {
      color: withOpacity(colors.white, 0.9),
      fontSize: 14,
      lineHeight: 20,
      marginTop: 10,
    },
    heroActions: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 16,
    },
    primaryButton: {
      borderRadius: 18,
      overflow: "hidden",
      minWidth: 150,
      marginRight: 12,
    },
    primaryButtonGradient: {
      paddingVertical: 12,
      paddingHorizontal: 18,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryButtonText: {
      color: colors.white,
      fontWeight: "700",
      fontSize: 15,
    },
    secondaryButton: {
      borderRadius: 18,
      paddingVertical: 12,
      paddingHorizontal: 18,
      borderWidth: 1,
      borderColor: withOpacity(colors.white, 0.6),
      backgroundColor: withOpacity(colors.white, 0.12),
    },
    secondaryButtonText: {
      color: colors.white,
      fontWeight: "600",
      fontSize: 15,
    },
    heroImageWrapper: {
      marginLeft: 18,
      width: 150,
      height: 150,
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    heroImageBackdrop: {
      position: "absolute",
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: withOpacity(colors.white, 0.28),
      opacity: 0.9,
    },
    heroImage: {
      width: 150,
      height: 150,
    },
    statsScroll: {
      paddingHorizontal: 20,
      paddingVertical: 18,
    },
    statsCardWrapper: {
      marginRight: 16,
    },
    statsCard: {
      width: 210,
      borderRadius: 24,
      padding: 18,
      shadowColor: colors.shadow,
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 5,
    },
    statsValue: {
      fontSize: 26,
      fontWeight: "800",
      color: colors.text,
    },
    statsLabel: {
      marginTop: 8,
      fontWeight: "700",
      color: colors.text,
    },
    statsDescription: {
      marginTop: 6,
      color: colors.textLight,
      fontSize: 13,
      lineHeight: 18,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginHorizontal: 20,
      marginTop: 28,
      marginBottom: 12,
    },
    sectionHeaderAlt: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.text,
    },
    sectionLink: {
      color: colors.accent,
      fontWeight: "600",
    },
    categoryRow: {
      paddingHorizontal: 16,
      paddingBottom: 4,
    },
    categoryCardWrapper: {
      borderRadius: 22,
      marginRight: 16,
      shadowColor: colors.shadow,
      shadowOpacity: 0.1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
      overflow: "hidden",
    },
    categoryCard: {
      width: 220,
      padding: 18,
      justifyContent: "space-between",
      minHeight: 140,
    },
    categoryName: {
      fontWeight: "800",
      fontSize: 18,
      color: colors.white,
    },
    categoryDescription: {
      marginTop: 8,
      color: withOpacity(colors.white, 0.9),
      fontSize: 13,
      lineHeight: 18,
    },
    categoryAction: {
      marginTop: 18,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    categoryActionText: {
      color: colors.white,
      fontWeight: "600",
    },
    categoryActionArrow: {
      color: colors.white,
      fontSize: 18,
    },
    productRow: {
      paddingHorizontal: 16,
      paddingBottom: 4,
    },
    productCard: {
      width: 240,
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 18,
      marginRight: 16,
      shadowColor: colors.shadow,
      shadowOpacity: 0.12,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    productImageWrapper: {
      borderRadius: 18,
      overflow: "hidden",
      marginBottom: 12,
      position: "relative",
    },
    productImage: {
      width: "100%",
      height: 130,
    },
    productBadge: {
      position: "absolute",
      top: 12,
      left: 12,
      paddingVertical: 4,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: withOpacity(colors.primary, 0.9),
    },
    productBadgeText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.white,
    },
    productName: {
      fontWeight: "700",
      fontSize: 17,
      color: colors.text,
    },
    productDescription: {
      color: colors.textLight,
      fontSize: 13,
      marginTop: 6,
    },
    productFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 18,
    },
    productPrice: {
      fontWeight: "800",
      color: colors.primary,
      fontSize: 18,
    },
    addButton: {
      borderRadius: 16,
      overflow: "hidden",
    },
    addButtonInner: {
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    addButtonText: {
      color: colors.white,
      fontWeight: "700",
    },
    ordersSection: {
      marginTop: 32,
      paddingHorizontal: 20,
      paddingBottom: 24,
    },
    emptyText: {
      color: colors.textLight,
      fontSize: 14,
    },
    orderCard: {
      borderRadius: 24,
      padding: 18,
      marginBottom: 16,
      shadowColor: colors.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    orderHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    orderId: {
      fontWeight: "700",
      color: colors.text,
    },
    orderStatus: {
      fontWeight: "700",
      color: colors.accent,
      textTransform: "capitalize",
    },
    orderTotal: {
      fontWeight: "600",
      color: colors.text,
      marginBottom: 6,
    },
    orderItems: {
      marginTop: 8,
    },
    orderItem: {
      color: colors.textLight,
      marginBottom: 4,
    },
    loadingWrapper: {
      marginVertical: 36,
      alignItems: "center",
    },
    error: {
      color: colors.error,
      textAlign: "center",
      marginTop: 16,
    },
  });
