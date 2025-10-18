import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { orderApi } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { formatCurrency, normaliseStatus, toNumber } from "@/utils/format";

const STATUS_OPTIONS = [
  { key: "all", label: "Todos" },
  { key: "pending", label: "Pendientes" },
  { key: "paid", label: "Pagados" },
  { key: "cancelled", label: "Cancelados" },
];

const getStatusLabel = (value) => {
  const normalised = normaliseStatus(value);
  return STATUS_OPTIONS.find((option) => option.key === normalised)?.label || value;
};

const formatDateTime = (value) => {
  if (!value) return "Fecha desconocida";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha desconocida";
  return date.toLocaleString("es-GT", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const OrdersScreen = () => {
  const { token } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const loadOrders = useCallback(async () => {
    if (!token) return;
    try {
      setError(null);
      setLoading(true);
      const response = await orderApi.myOrders(token);
      setOrders(response.orders || []);
    } catch (err) {
      setError(err.message || "No pudimos obtener tus pedidos");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const onRefresh = useCallback(async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      const response = await orderApi.myOrders(token);
      setOrders(response.orders || []);
    } catch (err) {
      setError(err.message || "No pudimos actualizar tus pedidos");
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders])
  );

  const filteredOrders = useMemo(() => {
    if (statusFilter === "all") return orders;
    return orders.filter((order) => normaliseStatus(order.status) === statusFilter);
  }, [orders, statusFilter]);

  const summaryMetrics = useMemo(() => {
    const total = orders.length;
    let pending = 0;
    let paid = 0;
    let spent = 0;

    orders.forEach((order) => {
      const status = normaliseStatus(order.status);
      if (status === "pending") pending += 1;
      if (status === "paid") paid += 1;
      spent += toNumber(order?.totals?.total ?? order.total ?? 0);
    });

    return { total, pending, paid, spent };
  }, [orders]);

  const renderOrder = useCallback(
    ({ item }) => {
      const total = toNumber(item?.totals?.total ?? item.total ?? 0);
      const status = normaliseStatus(item.status);
      return (
        <View style={styles.orderCard}>
          <View style={styles.orderHeader}>
            <View>
              <Text style={styles.orderTitle}>Orden #{item.id}</Text>
              <Text style={styles.orderSubtitle}>{formatDateTime(item.createdAt)}</Text>
            </View>
            <Text style={[styles.statusBadge, styles[`status${status}`] || styles.statusDefault]}>
              {getStatusLabel(status)}
            </Text>
          </View>
          <Text style={styles.orderSubtitle}>
            Total: {formatCurrency(total)}
          </Text>
          <View style={styles.itemsList}>
            {item.items?.map((product) => (
              <Text key={product.id} style={styles.itemRow}>
                {product.quantity}x {product.name}
              </Text>
            ))}
          </View>
        </View>
      );
    },
    [styles]
  );

  const keyExtractor = useCallback((item) => item.id?.toString(), []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tus pedidos</Text>
      <Text style={styles.subtitle}>
        Consulta el estado y el detalle de cada compra realizada en Helados Victoria.
      </Text>

      <View style={styles.summaryGrid}>
        <LinearGradient
          colors={[colors.surface || colors.background, colors.card]}
          style={styles.summaryCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.summaryValue}>{summaryMetrics.total}</Text>
          <Text style={styles.summaryLabel}>Pedidos totales</Text>
        </LinearGradient>
        <LinearGradient
          colors={[colors.primary, colors.accent]}
          style={[styles.summaryCard, styles.summaryCardAccent]}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={[styles.summaryValue, styles.summaryValueOnDark]}>{summaryMetrics.pending}</Text>
          <Text style={[styles.summaryLabel, styles.summaryLabelOnDark]}>Pendientes</Text>
          <Text style={[styles.summaryNote, styles.summaryLabelOnDark]}>Pagados: {summaryMetrics.paid}</Text>
        </LinearGradient>
        <LinearGradient
          colors={[colors.card, colors.surface || colors.background]}
          style={styles.summaryCard}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.summaryValue}>{formatCurrency(summaryMetrics.spent)}</Text>
          <Text style={styles.summaryLabel}>Total gastado</Text>
        </LinearGradient>
      </View>

      <View style={styles.filterRow}>
        {STATUS_OPTIONS.map((option) => {
          const active = option.key === statusFilter;
          return (
            <TouchableOpacity
              key={option.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setStatusFilter(option.key)}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          renderItem={renderOrder}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Aún no tienes pedidos</Text>
              <Text style={styles.emptySubtitle}>
                Explora la carta y realiza tu primera orden para verla reflejada aquí.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 20,
      gap: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: "800",
      color: colors.text,
    },
    subtitle: {
      color: colors.textLight,
      fontSize: 14,
      lineHeight: 20,
    },
    summaryGrid: {
      flexDirection: "row",
      gap: 12,
      marginTop: 8,
    },
    summaryCard: {
      flex: 1,
      borderRadius: 20,
      paddingVertical: 16,
      paddingHorizontal: 18,
      shadowColor: colors.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    summaryCardAccent: {
      borderColor: "transparent",
    },
    summaryValue: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
    },
    summaryValueOnDark: {
      color: colors.white,
    },
    summaryLabel: {
      marginTop: 4,
      color: colors.textLight,
      fontWeight: "600",
    },
    summaryLabelOnDark: {
      color: colors.white,
      opacity: 0.85,
    },
    summaryNote: {
      marginTop: 2,
      fontSize: 12,
      color: colors.textLight,
    },
    filterRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 12,
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface || colors.card,
      shadowColor: colors.shadow,
      shadowOpacity: 0.05,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    filterChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterChipText: {
      color: colors.textLight,
      fontWeight: "600",
    },
    filterChipTextActive: {
      color: colors.white,
    },
    error: {
      color: colors.error,
    },
    loader: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    listContent: {
      gap: 16,
      paddingBottom: 32,
    },
    orderCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 16,
      gap: 10,
      shadowColor: colors.shadow,
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
      borderWidth: 1,
      borderColor: colors.border,
    },
    orderHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    orderTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    orderSubtitle: {
      color: colors.textLight,
      fontSize: 13,
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
      textTransform: "uppercase",
      fontWeight: "700",
      color: colors.white,
      backgroundColor: colors.primary,
    },
    statuspending: {
      backgroundColor: colors.primary,
    },
    statuspaid: {
      backgroundColor: colors.success,
    },
    statuscancelled: {
      backgroundColor: colors.error,
    },
    statusDefault: {
      backgroundColor: colors.primary,
    },
    itemsList: {
      gap: 4,
    },
    itemRow: {
      color: colors.text,
    },
    emptyState: {
      paddingVertical: 48,
      alignItems: "center",
      gap: 8,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    emptySubtitle: {
      textAlign: "center",
      color: colors.textLight,
      paddingHorizontal: 16,
      lineHeight: 20,
    },
  });

export default OrdersScreen;

